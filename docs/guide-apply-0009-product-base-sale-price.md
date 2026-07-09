# 0009 적용 가이드 — 품목 기본 출고단가(base_sale_price) (W22)

> Codex 승인 후, **사용자가 Supabase SQL Editor에서** 적용한다. Claude는 파일 작성까지만.
> 컬럼 1개 + CHECK 제약 추가뿐이라 위험 낮음(additive, 데이터 삭제 없음).

## 무엇을 바꾸나
- `ordermoa_products`에 `base_sale_price integer` (nullable) 추가.
- CHECK `base_sale_price is null or base_sale_price >= 0` (음수 금지).
- 용도: 거래처별 단가(`ordermoa_customer_prices`)가 **없을 때만** 발주 파싱 fallback으로 쓸 "품목 기본 출고단가".
- **customer_prices에 아무것도 자동 생성하지 않는다.** 거래처별 예외단가는 그대로 별개 구조.
- RLS/트리거 변경 없음. `order_items`/과거 주문/명세서/월합계 무영향(품목 마스터 속성, unit_price는 확정 시점 스냅샷).

## 왜 products에 두나 (customer_prices가 아니라)
- 엑셀 출고단가는 "이 품목의 표준가"지 특정 거래처와의 계약가가 아니다. 전 거래처에 자동으로 customer_prices row를 만들면 (a) 거래처×품목 조합이 폭증하고 (b) "이 거래처에는 예외가 있다"는 신호가 사라진다.
- 우선순위를 코드에서 판정한다: **거래처별 단가 > 품목 기본 출고단가 > 미등록(0원)**. 기본가는 어디까지나 대체값.

## 적용 순서 (SQL Editor)
1. (0007·0008 미적용이면) 먼저 그 마이그레이션들을 적용.
2. `web/supabase/migrations/0009_product_base_sale_price.sql` 전문을 붙여넣고 Run.
3. `Success. No rows returned` 확인. (선택) Table Editor에서 `ordermoa_products.base_sale_price` 컬럼 확인.

> 멱등: add column if not exists / drop+add constraint → 두 번 실행해도 안전.

## 적용 후 절차 — 카탈로그 재import (기본 출고단가 채우기)
0009 적용 **전**에 W21에서 이미 import한 품목은 `base_sale_price`가 비어 있다(그땐 출고단가를 저장 안 했음). 채우려면 **같은 카탈로그를 다시 import** 한다 — source_code 멱등이라 중복 품목은 생기지 않고 기존 품목의 `base_sale_price`(+매입단가·카테고리)만 update 된다.

- [ ] 로그인 → 데이터 내보내기/가져오기 → 카탈로그 초안 JSON 업로드.
- [ ] 먼저 소량(10~20건) 선택 → "DB에 반영"으로 경로 확인.
- [ ] 소량 확인 후에는 **검토필요 아닌 신규·중복명 제외 품목**을 한 번에 반영해도 된다. 현재 Usage 기준(DB 6%, Storage 0%, Egress <1%)으로는 용량보다 데이터 품질이 더 큰 리스크다.
- [ ] 품목·별칭 관리에서 해당 품목의 **기본 출고단가**가 채워졌는지, **F5 후 유지**되는지 확인.
- [ ] 거래처 단가가 없는 그 품목으로 발주 붙여넣기 → 파싱 금액이 0원이 아니라 기본가로 뜨고 상태가 **"기본 단가 적용"**으로 표시되는지.
- [ ] 거래처별 단가가 있는 품목은 여전히 그 값이 우선인지(기본가로 안 덮이는지).
- [ ] 회귀: 파싱 → 확정 → 합산표 → 명세서 → 월합계 정상. **과거 주문 금액은 재계산되지 않아야 함**(스냅샷).
- [ ] Supabase에서 `customer_prices`에 새 row가 생기지 **않았는지** 확인.

> 재import는 W21-B 경로 그대로(200건 배치·source_code 멱등). 전체 1590건을 무작정 넣기보다, 중복명/검토필요는 보류하고 품질이 괜찮은 신규 품목부터 반영한다.
