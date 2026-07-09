-- 오더모아 Phase 2(W19): 품목 카테고리 6종(농산물/공산품/냉식/육류/수산/기타).
-- ordermoa_products에 category 컬럼 하나만 추가한다(별도 테이블/FK 없음 — 6종 고정, 사용자 정의 없음).
--   · text · NOT NULL · DEFAULT '기타' · CHECK(6종)
-- 기존 데이터는 DEFAULT/backfill로 '기타'가 된다(별도 수동 UPDATE 불필요).
-- RLS: 기존 ordermoa_products 정책(0002)이 테이블 단위라 컬럼 추가에 그대로 적용 — 새 정책 불필요.
-- 교차회사: 카테고리는 FK 없는 enum이라 교차회사 트리거 불필요.
-- 스냅샷 불변: 카테고리는 품목 마스터 속성 → order_items에는 저장하지 않는다(과거 주문/명세서/월합계 무영향).
-- idempotent: add column if not exists / set default / backfill / set not null / pg_constraint 가드 → 두 번 실행해도 안전.

-- 1) 컬럼 추가(없으면). nullable로 먼저 넣고 아래에서 backfill 후 NOT NULL 승격.
alter table public.ordermoa_products
  add column if not exists category text;

-- 2) 기본값 '기타'(앱 DEFAULT_PRODUCT_CATEGORY와 동일). 재실행 안전.
alter table public.ordermoa_products
  alter column category set default '기타';

-- 3) 기존 null 행 backfill(이전에 nullable로 추가됐던 경우 대비 — DEFAULT만으로는 기존 NULL이 안 채워짐).
update public.ordermoa_products
  set category = '기타'
  where category is null;

-- 4) NOT NULL 승격(재실행 안전 — 이미 NOT NULL이면 무변화).
alter table public.ordermoa_products
  alter column category set not null;

-- 5) 6종 CHECK 제약(없으면 추가). PostgreSQL은 ADD CONSTRAINT IF NOT EXISTS 미지원 → pg_constraint 가드.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ordermoa_products'::regclass
      and conname = 'ordermoa_products_category_check'
  ) then
    alter table public.ordermoa_products
      add constraint ordermoa_products_category_check
      check (category in ('농산물', '공산품', '냉식', '육류', '수산', '기타'));
  end if;
end;
$$;
