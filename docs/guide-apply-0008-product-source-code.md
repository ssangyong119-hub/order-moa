# 0008 적용 가이드 — 품목 외부코드(source_code) (W21)

> Codex 승인 후, **사용자가 Supabase SQL Editor에서** 적용한다. Claude는 파일 작성까지만.
> 컬럼 1개 + 부분 유니크 인덱스 추가뿐이라 위험 낮음(additive, 데이터 삭제 없음).
> **0007(카테고리)와 함께/먼저 적용 권장** — W21 import의 DB 반영이 category·source_code 둘 다 쓴다.

## 무엇을 바꾸나
- `ordermoa_products`에 `source_code text` (nullable) 추가.
- 부분 유니크 인덱스 `ordermoa_uq_products_source_code (company_id, source_code) where source_code is not null`.
  - 앱 내 신규 품목은 source_code = null → 유니크 검사 대상 아님(NULL끼리 충돌 없음).
- 용도: 실 엑셀(이카운트) 재import 시 (company_id, source_code)로 기존 품목을 찾아 update, 없으면 insert (멱등). 품목명은 중복이 흔해(W20에서 중복명 210그룹) 매칭 키로 부적합.
- RLS/트리거 변경 없음. `order_items`/과거 주문/명세서/월합계 무영향(품목 마스터 속성).

## 적용 순서 (SQL Editor)
1. (0007 미적용이면) 먼저 `web/supabase/migrations/0007_product_category.sql` 적용.
2. `web/supabase/migrations/0008_product_source_code.sql` 전문을 붙여넣고 Run.
3. `Success. No rows returned` 확인. (선택) Table Editor에서 `ordermoa_products.source_code` 컬럼 확인.

> 멱등: add column if not exists / create unique index if not exists → 두 번 실행해도 안전.

## 적용 후 DB 실측 체크리스트 (로그인 모드)
W21-B에서 DB 영구 반영 경로가 구현됐다. 0007·0008 적용 후 로그인 모드에서 소량으로 먼저 확인한다.

- [ ] 로그인 → 데이터 내보내기/가져오기 → 카탈로그 초안 JSON 업로드 → 소량(10~20건) 선택 반영.
- [ ] 반영된 품목이 품목·별칭 관리에 보이고 **F5 후 유지**(source_code 저장 확인).
- [ ] 같은 JSON을 다시 반영 → 중복 생성되지 않고 update로 처리되는지(멱등 매칭) 확인.
- [ ] 발주 붙여넣기에서 반영된 품목명이 매칭되는지.
- [ ] 회귀: 파싱 → 확정 → 합산표 → 명세서 → 월합계 정상(카테고리·source_code와 무관).

> 대량 반영은 공유 Supabase 쿼터에 부담이 있으므로 처음에는 10~20건만 선택해 확인한다. 출고단가는 저장하지 않고, 입고단가만 `base_purchase_price`로 들어간다.
