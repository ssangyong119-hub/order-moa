-- 오더모아 W22: 품목 기본 출고단가(base_sale_price) — 발주 파싱 단가 fallback 전용.
-- 배경: 거래처별 단가(ordermoa_customer_prices)가 없으면 발주 금액이 0원으로 나온다.
--   베타 검증(금액/명세서/합산표)을 위해 품목 자체에 "기본 출고단가"를 두고,
--   거래처별 단가가 없을 때만 이 값을 fallback으로 쓴다.
-- 원칙:
--   · 출고단가를 customer_prices에 자동 생성하지 않는다(거래처별 예외단가는 그대로 별개 구조).
--   · 거래처별 단가가 있으면 항상 그것이 우선. base_sale_price는 없을 때의 대체값일 뿐.
--   · order_items.unit_price는 여전히 확정 시점 스냅샷 — 이 컬럼은 마스터 속성이라 과거 주문 무관.
--   · Phase 3(product_units 다단위)는 별개. 이번은 베타 검증용 최소 구조(컬럼 1개).
-- ordermoa_products에 base_sale_price integer null 추가.
--   · integer · nullable(미등록이면 null → 파싱 fallback도 미적용 → 기존처럼 0원/미등록)
--   · CHECK(null 또는 0 이상) — 음수 방지
-- RLS: 기존 ordermoa_products 정책(0002) 상속 — 컬럼 추가라 정책 변경 없음.
-- idempotent: add column if not exists / drop+add constraint → 두 번 실행해도 안전.

alter table public.ordermoa_products
  add column if not exists base_sale_price integer;

-- 음수 금지(null 허용). 재실행 안전을 위해 먼저 제거 후 추가.
alter table public.ordermoa_products
  drop constraint if exists ordermoa_products_base_sale_price_check;
alter table public.ordermoa_products
  add constraint ordermoa_products_base_sale_price_check
  check (base_sale_price is null or base_sale_price >= 0);
