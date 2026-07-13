-- ⛔ 승인/적용 전 — Codex 검수 + 사용자 SQL Editor 실행. 이 파일은 자동 적용하지 않는다.
-- 오더모아 W23-R5b: 확정 주문 정정 링크와 복구 식별 표식.
-- additive · idempotent · 데이터 무접촉 · backfill 0 · RLS 변경 없음.

alter table public.ordermoa_orders
  add column if not exists corrected_from_order_id uuid references public.ordermoa_orders(id);

-- null = 정정 절차가 원주문 취소까지 진행된 적 없음.
alter table public.ordermoa_orders
  add column if not exists correction_started_at timestamptz;

alter table public.ordermoa_orders
  drop constraint if exists ordermoa_orders_corrected_from_not_self;
alter table public.ordermoa_orders
  add constraint ordermoa_orders_corrected_from_not_self
  check (corrected_from_order_id is null or corrected_from_order_id <> id);

-- 활성 정정본은 원주문당 하나만 허용한다. 취소된 부분 실패 정정본은 재시도를 막지 않는다.
create unique index if not exists ordermoa_uq_orders_active_correction
  on public.ordermoa_orders(corrected_from_order_id)
  where corrected_from_order_id is not null and status <> 'cancelled';

create or replace function public.ordermoa_check_orders_correction()
returns trigger language plpgsql as $$
declare
  src_company uuid;
  src_status text;
  src_marker timestamptz;
begin
  if TG_OP = 'INSERT' then
    -- 표식은 원주문 confirmed→cancelled 조건부 UPDATE에서만 기록할 수 있다.
    if NEW.correction_started_at is not null then
      raise exception 'ordermoa: correction_started_at은 insert로 설정할 수 없습니다 (order %)', NEW.id;
    end if;
    if NEW.corrected_from_order_id is null then
      return NEW;
    end if;

    select company_id, status, correction_started_at
      into src_company, src_status, src_marker
      from public.ordermoa_orders
      where id = NEW.corrected_from_order_id;
    if src_company is null or src_company <> NEW.company_id then
      raise exception 'cross-company reference (ordermoa_orders.corrected_from_order_id)';
    end if;
    if src_status <> 'cancelled' then
      raise exception 'ordermoa: 취소된 주문만 정정 원본이 될 수 있습니다 (원주문 %, 상태 %)', NEW.corrected_from_order_id, src_status;
    end if;
    -- 표식 없는 일반 보상 취소를 재발행 원본으로 쓰는 D6 우회를 DB에서도 막는다.
    if src_marker is null then
      raise exception 'ordermoa: 정정 절차로 취소된 주문만 정정 원본이 될 수 있습니다 (원주문 %)', NEW.corrected_from_order_id;
    end if;
    return NEW;
  end if;

  -- 링크는 insert 시에만 설정한다. 따라서 과거 행을 이어 순환시키지 못한다.
  if NEW.corrected_from_order_id is distinct from OLD.corrected_from_order_id then
    raise exception 'ordermoa: 정정 링크는 생성 후 변경할 수 없습니다 (order %)', NEW.id;
  end if;
  -- 기록된 표식은 수정하거나 null로 되돌릴 수 없다.
  if OLD.correction_started_at is not null
     and NEW.correction_started_at is distinct from OLD.correction_started_at then
    raise exception 'ordermoa: correction_started_at은 기록 후 수정·삭제할 수 없습니다 (order %)', NEW.id;
  end if;
  -- null→값은 정정 절차의 원주문 취소 전이에서만 허용한다.
  if OLD.correction_started_at is null and NEW.correction_started_at is not null
     and not (OLD.status = 'confirmed' and NEW.status = 'cancelled') then
    raise exception 'ordermoa: correction_started_at은 confirmed→cancelled 전이에서만 기록할 수 있습니다 (order %)', NEW.id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists ordermoa_trg_orders_correction on public.ordermoa_orders;
create trigger ordermoa_trg_orders_correction
  before insert or update on public.ordermoa_orders
  for each row execute function public.ordermoa_check_orders_correction();
