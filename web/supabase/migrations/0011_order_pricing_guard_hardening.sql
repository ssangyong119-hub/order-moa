-- ⛔ 승인/적용 전 — Codex 승인 + 사용자 SQL Editor 실행. 적용 전에는 DB smoke를 "완료"로 보고하지 말 것.
-- 오더모아 W23-R3(0단계): 0010 스냅샷 가드 보강. 0010은 수정 금지 — 이 파일로만 강화한다.
--
-- 배경: 0010은 (a) 상태 전이에서 confirmed→quantity_confirmed 되돌림만 차단하고,
--       (b) order_items 스냅샷 가드가 NEW.order_id 상태만 보며 order_id 이동을 컬럼 목록에서 누락한다.
-- 이로 인한 우회 3종을 닫는다(전부 additive·idempotent, 데이터 무접촉, backfill 0건, RLS 변경 없음):
--
--   ① 상태 전이 우회 차단
--      · confirmed → confirmed/cancelled 외 전이 금지 (draft·quantity_confirmed 우회 라운드트립 차단).
--        0010은 confirmed→quantity_confirmed만 막아, confirmed→draft→라인수정→confirmed 우회가 열려 있었다.
--      · cancelled → (any) 금지 = 종결 상태(되살리기 차단). 앱은 un-cancel 경로가 없다(soft cancel만).
--      · 허용: quantity_confirmed→confirmed(가격 마감) · quantity_confirmed→cancelled · confirmed→cancelled.
--        (0011은 0010 전이 규칙의 순수 상위집합 → create or replace로 안전하게 대체.)
--
--   ② order_items 라인 이동/주입 차단 (INSERT + UPDATE 모두)
--      · INSERT: 대상 주문(NEW.order_id)이 confirmed/cancelled면 라인 추가 차단(확정 주문 품목 주입 차단).
--        quantity_confirmed 주문에는 정상 가격 마감 전까지 INSERT/UPDATE를 허용한다.
--        · 앱 공존: saveOrder가 항상 quantity_confirmed로 주문을 만들고 라인을 넣은 뒤 confirmed로 승격하므로
--          경로 A(바로 확정)도 이 가드를 통과한다(라인 삽입 시점엔 아직 qc).
--      · UPDATE order_id 변경 시 OLD.order_id 또는 NEW.order_id가 확정(또는 취소)이면 차단
--        → 확정 주문에서 라인을 빼내(사실상 삭제) 다른 주문으로 옮기는 우회, 확정 주문에 라인을 끼워 넣는 우회 차단.
--      · 스냅샷 컬럼 변경 검사에 order_id를 추가하고, OLD.order_id 상태까지 본다(0010은 NEW만 봄).
--
--   ③ cancelled 라인 보존(정책 결정 — 아래 "결정" 참조)
--      · 확정/취소 주문의 라인 UPDATE·DELETE를 모두 잠근다(0010은 confirmed만).
--
-- 결정(가드 범위): 라인 잠금을 confirmed → (confirmed OR cancelled)로 확장한다.
--   근거: (1) 앱은 취소 주문의 라인을 수정/삭제하는 경로가 없다(soft cancel은 orders.status만 바꾼다).
--         (2) cancelled는 ①로 종결 상태가 되어 다시 확정으로 되살아날 수 없다 → 무결성 영향은 없지만,
--             "최종 확정됐던 주문의 라인은 취소 이후에도 보존"(재설계 권장)을 DB에서도 보장한다.
--         (3) 취소 주문은 loadOrders 필터(confirmed/quantity_confirmed)에서 이미 제외되어 리포트에 안 잡힌다.
--   비용: 관리자 수동 정리 시 취소 주문 라인 삭제가 막힌다 → 필요 시 트리거 drop 후 정리(0010 DELETE-cascade와 동일 패턴).
--
-- 원칙 확인: order_items/orders 스키마 무변경 · 교차회사 트리거(0001)·RLS(0002) 보존 · unit_price 스냅샷 불변.
--   가격 마감 UPDATE는 quantity_confirmed 상태에서만 일어나므로 ②③의 확정 잠금을 통과한다.

-- ① 상태 전이 가드 강화 (0010 함수 대체 — 상위집합)
create or replace function public.ordermoa_check_orders_status_transition()
returns trigger language plpgsql as $$
begin
  if OLD.status = NEW.status then
    return NEW;
  end if;
  -- 최종 확정: 취소로만 전이 가능 (draft·quantity_confirmed 되돌림 우회 차단)
  if OLD.status = 'confirmed' and NEW.status <> 'cancelled' then
    raise exception 'ordermoa: 최종 확정(confirmed) 주문은 취소 외 다른 상태로 전이할 수 없습니다 (order %, → %)', OLD.id, NEW.status;
  end if;
  -- 취소: 종결 상태 (되살리기 금지)
  if OLD.status = 'cancelled' then
    raise exception 'ordermoa: 취소(cancelled) 주문은 상태를 되돌릴 수 없습니다 (order %, → %)', OLD.id, NEW.status;
  end if;
  return NEW;
end;
$$;
-- 트리거는 0010에서 이미 before update of status로 생성됨 — 함수 교체만으로 규칙이 강화된다.
-- (재적용 안전) 트리거 재보장:
drop trigger if exists ordermoa_trg_orders_status_transition on public.ordermoa_orders;
create trigger ordermoa_trg_orders_status_transition
  before update of status on public.ordermoa_orders
  for each row execute function public.ordermoa_check_orders_status_transition();

-- ②③ order_items 스냅샷 가드 강화 (0010 함수 대체 — 상위집합, INSERT/UPDATE/DELETE 전부)
create or replace function public.ordermoa_check_order_items_frozen()
returns trigger language plpgsql as $$
declare old_status text; new_status text;
begin
  if TG_OP = 'INSERT' then
    -- 확정/취소 주문에 라인 주입 차단. quantity_confirmed(가격 마감 전)에는 허용.
    select status into new_status from public.ordermoa_orders where id = NEW.order_id;
    if new_status in ('confirmed','cancelled') then
      raise exception 'ordermoa: 확정/취소 주문에는 품목 라인을 추가할 수 없습니다(스냅샷 불변, order %)', NEW.order_id;
    end if;
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    select status into old_status from public.ordermoa_orders where id = OLD.order_id;
    if old_status in ('confirmed','cancelled') then
      raise exception 'ordermoa: 확정/취소 주문의 품목 라인은 삭제할 수 없습니다(스냅샷 불변, order %)', OLD.order_id;
    end if;
    return OLD;
  end if;

  -- UPDATE
  select status into old_status from public.ordermoa_orders where id = OLD.order_id;
  select status into new_status from public.ordermoa_orders where id = NEW.order_id;

  -- 라인 이동(order_id 변경): 출발/도착 어느 쪽이든 확정(또는 출발이 취소)이면 차단
  if NEW.order_id is distinct from OLD.order_id
     and (old_status in ('confirmed','cancelled') or new_status in ('confirmed','cancelled')) then
    raise exception 'ordermoa: 확정/취소 주문의 품목 라인은 다른 주문으로 이동할 수 없습니다 (order % → %)', OLD.order_id, NEW.order_id;
  end if;

  -- 스냅샷 컬럼 변경: 확정/취소 주문에서 금지 (order_id 포함)
  if old_status in ('confirmed','cancelled') and (
       NEW.unit_price is distinct from OLD.unit_price
    or NEW.quantity   is distinct from OLD.quantity
    or NEW.product_id is distinct from OLD.product_id
    or NEW.unit       is distinct from OLD.unit
    or NEW.order_id   is distinct from OLD.order_id
  ) then
    raise exception 'ordermoa: 확정/취소 주문의 품목 라인은 수정할 수 없습니다(스냅샷 불변, order %). 수정은 정정 절차로.', OLD.order_id;
  end if;
  return NEW;
end;
$$;
drop trigger if exists ordermoa_trg_order_items_frozen on public.ordermoa_order_items;
create trigger ordermoa_trg_order_items_frozen
  before insert or update or delete on public.ordermoa_order_items
  for each row execute function public.ordermoa_check_order_items_frozen();

-- ─────────────────────────────────────────────────────────────────────────────
-- [실험 전용 — 마이그레이션 아님] 0011 가드 검증 H1~H7b.
-- ⚠️ 예상 오류가 나는 검증(H3·H4·H5·H6b·H7a)을 한 트랜잭션에서 그냥 연속 실행하면,
--    첫 오류에서 트랜잭션이 aborted 상태가 되어 이후 statement가 전부 무의미해진다.
--    → 각 검증을 DO 블록의 EXCEPTION으로 격리(또는 개별 실행)해야 한다.
-- 전체 실행 절차·기대 결과·원복·실패 중단 기준은 사용자용 가이드에 runnable 형태로 정리했다:
--     docs/guide-apply-0011-order-pricing-guard.md  (준비: 본인 company_id/customer_id/product_id 치환)
--
-- 각 검증이 확인하는 것 (기대):
--   H1  qc 라인 단가 UPDATE ............................. 성공(허용, 가격 마감 정상 경로)
--   H2  qc → confirmed 승격 ............................. 성공(허용)
--   H3  confirmed 라인 단가 UPDATE ...................... 차단(스냅샷 불변)
--   H4a confirmed → quantity_confirmed 되돌림 ........... 차단(취소로만 전이)
--   H4b confirmed → draft .............................. 차단
--   H5  confirmed 라인 DELETE .......................... 차단
--   H6a confirmed → cancelled .......................... 성공(허용, 기존 취소 경로)
--   H6b cancelled → confirmed 되살리기 ................. 차단(취소는 종결)
--   H7a confirmed 주문에 라인 INSERT(주입) ............. 차단
--   H7b quantity_confirmed 주문에 라인 INSERT .......... 성공(허용, 가격 마감 전 정상 삽입 · saveOrder 경로 A 공존)
--
-- 안전: 가이드 스크립트는 전체를 begin … rollback으로 감싸 아무것도 커밋하지 않는다(실데이터 무변경, 별도 삭제 불필요).
-- ─────────────────────────────────────────────────────────────────────────────
