-- 오더모아 W21: 품목 외부코드(source_code) — 실 엑셀(이카운트) import 멱등 매칭 전용.
-- ordermoa_products에 source_code 컬럼 1개 추가. 재import 시 (company_id, source_code)로 기존 품목을
-- 찾아 update, 없으면 insert 하기 위한 안정 키다(품목명은 중복이 흔해 매칭 키로 부적합 — W20에서 중복명 210그룹 확인).
--   · text · nullable(앱 내 신규 품목은 코드 없음 → null)
--   · 부분 유니크: null끼리는 충돌 안 함(부분 인덱스 where source_code is not null)
-- RLS: 기존 ordermoa_products 정책(0002) 상속 — 컬럼 추가라 정책 변경 없음.
-- 스냅샷 불변: source_code는 품목 마스터 속성 → order_items 무관(과거 주문/명세서/월합계 무영향).
-- 우리 PK는 계속 uuid. source_code는 UX 중심 키가 아니라 import 대조용 참고 코드다.
-- idempotent: add column if not exists / create unique index if not exists → 두 번 실행해도 안전.

alter table public.ordermoa_products
  add column if not exists source_code text;

-- 회사 안에서만 유일. NULL(앱 내 신규 품목)끼리는 유일성 검사 대상이 아니다(부분 인덱스).
create unique index if not exists ordermoa_uq_products_source_code
  on public.ordermoa_products (company_id, source_code)
  where source_code is not null;
