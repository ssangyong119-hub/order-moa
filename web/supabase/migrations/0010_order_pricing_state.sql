-- ⛔ 초안 — W23-R1 승인 게이트 통과 전 적용 금지 (Codex 승인 + 사용자 실행)
-- 오더모아 W23-R1: 가격 대기 주문 상태 모델 (결정 기록: docs/order-moa-w23-r1-state-model-decision.md)
--
-- 무엇을 하나 (전부 additive·idempotent, 데이터 무접촉, backfill 0건, RLS 변경 없음):
--   ① orders.status CHECK 재정의 — 'quantity_confirmed'(수량 확인·가격 대기) 추가.
--      기존 'draft'(미사용 예약)·'confirmed'·'cancelled'는 그대로 보존 → 기존 행 전부 통과.
--   ② orders 역전이 가드 — confirmed(최종 확정) → quantity_confirmed 되돌림 금지.
--      허용 전이: quantity_confirmed→confirmed(가격 마감) · quantity_confirmed→cancelled · confirmed→cancelled.
--   ③ order_items 스냅샷 가드 — confirmed 주문의 라인은 unit_price/quantity/product_id/unit 변경·삭제 금지.
--      (가격 마감 UPDATE는 quantity_confirmed 상태에서만 일어나므로 통과. 정정(F18)은 후속 별도 절차.)
--
-- 원칙 확인:
--   · order_items 스키마 무변경 — unit_price NOT NULL DEFAULT 0 유지, amount generated 유지(마감 UPDATE 시 자동 재계산).
--   · 스냅샷 원칙(헌장 §3.2): unit_price는 "판매단가가 최종 확정되는 시점"에 고정 — 이 파일의 가드가 그 불변을 DB에서 강제.
--   · RLS: 기존 정책 상속(order_items update 정책은 0002에 이미 존재). 교차회사 트리거(0001)와 별개로 공존.
--   · 가격 마감 권장 순서(앱): items UPDATE → orders.status='confirmed' UPDATE. 중간 실패 시 가격 대기로 남아 재시도 가능.

-- ① 상태 CHECK 재정의 (idempotent: drop if exists → add)
alter table public.ordermoa_orders
  drop constraint if exists ordermoa_orders_status_check;
alter table public.ordermoa_orders
  add constraint ordermoa_orders_status_check
  check (status in ('draft','quantity_confirmed','confirmed','cancelled'));

-- ② 최종 확정 역전이 금지 (confirmed → quantity_confirmed)
create or replace function public.ordermoa_check_orders_status_transition()
returns trigger language plpgsql as $$
begin
  if OLD.status = 'confirmed' and NEW.status = 'quantity_confirmed' then
    raise exception 'ordermoa: 최종 확정(confirmed) 주문은 가격 대기로 되돌릴 수 없습니다 (order %)', OLD.id;
  end if;
  return NEW;
end;
$$;
drop trigger if exists ordermoa_trg_orders_status_transition on public.ordermoa_orders;
create trigger ordermoa_trg_orders_status_transition
  before update of status on public.ordermoa_orders
  for each row execute function public.ordermoa_check_orders_status_transition();

-- ③ 최종 확정 주문 라인 스냅샷 가드 (UPDATE + DELETE)
create or replace function public.ordermoa_check_order_items_frozen()
returns trigger language plpgsql as $$
declare ord_status text;
begin
  if TG_OP = 'DELETE' then
    select status into ord_status from public.ordermoa_orders where id = OLD.order_id;
    if ord_status = 'confirmed' then
      raise exception 'ordermoa: 최종 확정 주문의 품목 라인은 삭제할 수 없습니다(스냅샷 불변, order %)', OLD.order_id;
    end if;
    return OLD;
  end if;
  select status into ord_status from public.ordermoa_orders where id = NEW.order_id;
  if ord_status = 'confirmed' and (
       NEW.unit_price is distinct from OLD.unit_price
    or NEW.quantity   is distinct from OLD.quantity
    or NEW.product_id is distinct from OLD.product_id
    or NEW.unit       is distinct from OLD.unit
  ) then
    raise exception 'ordermoa: 최종 확정 주문의 품목 라인은 수정할 수 없습니다(스냅샷 불변, order %). 수정은 정정 절차로.', NEW.order_id;
  end if;
  return NEW;
end;
$$;
drop trigger if exists ordermoa_trg_order_items_frozen on public.ordermoa_order_items;
create trigger ordermoa_trg_order_items_frozen
  before update or delete on public.ordermoa_order_items
  for each row execute function public.ordermoa_check_order_items_frozen();

-- ─────────────────────────────────────────────────────────────────────────────
-- [실험 전용 — 마이그레이션 아님] R1 검증 스크립트 E1~E4 (결정 기록 §7)
-- 위 ①~③과 별개로, 승인 후 사용자가 SQL Editor에서 아래 블록만 실행해 전제를 실증한다.
-- ordermoa_tmp_r1 임시 테이블만 사용(실데이터 무접촉), 끝에서 즉시 drop.
-- ─────────────────────────────────────────────────────────────────────────────
/*
-- 준비: order_items와 같은 형태의 실험 테이블
create table public.ordermoa_tmp_r1 (
  id int generated always as identity primary key,
  quantity numeric not null check (quantity > 0),
  unit_price integer not null default 0 check (unit_price >= 0),
  amount integer not null generated always as (round(quantity * unit_price)::integer) stored
);

-- E1: 가격 대기 저장(unit_price=0) → amount=0
insert into public.ordermoa_tmp_r1 (quantity) values (3);
select 'E1' as exp, unit_price, amount from public.ordermoa_tmp_r1; -- 기대: 0, 0

-- E2: 가격 마감(UPDATE) → stored generated 자동 재계산
update public.ordermoa_tmp_r1 set unit_price = 2500;
select 'E2' as exp, unit_price, amount from public.ordermoa_tmp_r1; -- 기대: 2500, 7500

-- E3: 1a(nullable) 탈락 실증 — NULL 단가는 amount NOT NULL 위반
alter table public.ordermoa_tmp_r1 alter column unit_price drop not null;
insert into public.ordermoa_tmp_r1 (quantity, unit_price) values (2, null);
-- 기대: ERROR null value in column "amount" ... violates not-null constraint

-- E4: CHECK 재정의 패턴 — 기존 행 통과(backfill 0 실증)
create table public.ordermoa_tmp_r1_status (status text not null default 'confirmed'
  check (status in ('draft','confirmed','cancelled')));
insert into public.ordermoa_tmp_r1_status values ('confirmed'), ('cancelled');
alter table public.ordermoa_tmp_r1_status drop constraint ordermoa_tmp_r1_status_status_check;
alter table public.ordermoa_tmp_r1_status add constraint ordermoa_tmp_r1_status_status_check
  check (status in ('draft','quantity_confirmed','confirmed','cancelled'));
select 'E4 ok' as exp, count(*) from public.ordermoa_tmp_r1_status; -- 기대: 에러 없이 2

-- 정리(필수)
drop table if exists public.ordermoa_tmp_r1;
drop table if exists public.ordermoa_tmp_r1_status;
*/
