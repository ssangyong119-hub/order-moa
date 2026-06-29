# 단위 2 작업 프롬프트: Supabase DB 스키마 정의 + RLS 정책 설계

작성일: 2026-06-29
용도: 다음 세션에서 Claude가 "단위 2"를 수행하기 위한 **작업지시 프롬프트 문서**.

> 이 문서는 작업지시 프롬프트다. **이번(작성) 단계에서는 DB 스키마 정의서나 SQL을 작성하지 않는다.** 아래 내용은 다음 세션에서 실행한다.

---

## 작업 목표

오더모아 웹 MVP의 **Supabase 기준 DB 스키마와 RLS(행 수준 보안) 정책을 문서로 설계**한다.
기능정의서(`docs/function-specification.md`)의 데이터 객체(§7)·검증(§8)·권한(§9)과 DB 설계 전 확정값(§13, §14.1 A~D)을 그대로 반영한다. 새 기능·새 테이블을 임의로 추가하지 않는다.

## 반드시 읽을 파일

- `docs/function-specification.md` (특히 §7 데이터 객체, §8 검증, §9 RLS, §13 DB 영향/원칙, §14.1 A~D)
- `docs/requirements-definition.md` (§9 데이터 요구사항, §11 권한/보안)
- `docs/web-security-checklist.md` (회사 격리, RLS, service role key)
- `docs/web-architecture-options.md` (§5 데이터 모델, §6 파싱 구조)

## 작업 범위 (단위 2)

- Supabase(PostgreSQL) 기준 **테이블 정의**
- **컬럼/타입/제약 조건** 정의
- **회사별 데이터 격리 구조** 정의(`company_id` + RLS)
- **RLS 정책 설계**(객체별 select/insert/update/delete 방향)
- **RLS 검증 시나리오** 작성
- **SQL 초안 작성 가능**(문서 내 예시 수준)

## 제외 범위 (단위 2)

- Supabase 프로젝트에 **실제 적용 금지**
- **마이그레이션 파일 생성 금지**
- 웹 화면 구현 금지
- API / Server Action 구현 금지
- 카톡 자동읽기 / OCR / 홈택스 / 은행연동 금지

## 산출물 (단위 2)

- `docs/db-schema-definition.md` — 테이블/컬럼/타입/제약/관계 정의 + SQL 초안
- `docs/supabase-rls-policy.md` — 객체별 RLS 정책 설계 + 검증 시나리오

## 테이블 후보

1차 MVP 대상:

| 테이블 | MVP | 비고 |
|---|---|---|
| companies | ✅ | 데이터 격리 단위 |
| company_members | ✅ | role(owner/staff), 1차 owner |
| customers | ✅ | soft delete(archived_at) |
| products | ✅ | tax_type 확장 필드 |
| product_aliases | ✅ | unique(company_id,alias) |
| customer_prices | ✅ | sale_price integer |
| order_imports | ✅ | customer_id NOT NULL, raw_text 기본 ON·삭제 가능 |
| orders | ✅ | 확정 주문 |
| order_items | ✅ | 확정 라인만, product_id NOT NULL |
| delivery_notes | 🔶 선택/후순위 | 미리보기 우선, note_number 채번 후순위 |
| receivables | 🔶 수동 status만 | 자동화 2차 |
| price_history | ⛔ 2차 | 단가 변경 이력 |
| tax_invoice_summaries | ⛔ 2차 | 세금계산서 정리 후보 |

## DB 설계 원칙 (반드시 반영할 결정)

- 모든 업무 테이블은 **`company_id` 기준 격리**(NOT NULL, FK companies)
- **PK는 `uuid`** (default `gen_random_uuid()`), 시각은 `timestamptz`
- **금액은 KRW `integer`**, **수량은 `numeric`**
- **`line_amount = round(quantity × unit_price)`**
- **주문/명세 합계는 라인 금액(line_amount)의 합**(합산 후 반올림 없음)
- **`order_items`는 확정 주문 라인만 저장**
- **`order_items.product_id`는 NOT NULL**
- **파싱 후보 라인은 1차 DB에 영구 저장하지 않음**(화면 + `order_imports.raw_text`)
- **`order_imports.customer_id`는 NOT NULL**
- **`raw_text`는 기본 저장 ON, 삭제 가능**(삭제 시 확정 주문 유지·`raw_text`만 null)
- **VAT 계산 없음**(1차)
- **`products.tax_type`은 확장 필드로만** 둠
- **`delivery_notes` 저장/번호 규칙은 후순위 또는 선택**

## RLS 정책 방향

- 모든 업무 테이블에 **RLS 활성화**.
- 소속 판정은 `security definer` 헬퍼 `is_company_member(company_id)`로 `company_members` 조회(정책 재귀 회피).
- 기본 방향: 회사 소속 사용자만 **select / insert / update** 가능. 다른 `company_id` 데이터 접근 불가.
- **delete는 제한**하거나 soft delete 권장(orders=cancelled, customers/products=archived_at).
- 1차는 **owner 중심**, `staff`는 `role` 스키마만 준비(UI 미구현).
- `order_imports`는 `raw_text` 삭제(UPDATE→null) 허용.
- **service role key는 클라이언트에 노출 금지**(서버 전용).

## 검증 시나리오 (RLS)

- A회사 사용자가 **B회사** `customers`/`orders`/`order_items`/`customer_prices`를 select → **0행**.
- A회사 사용자가 B회사 데이터에 insert/update → **거부**.
- 공개 API에서 `company_id`를 B로 바꿔 요청 → **차단**.
- 비로그인 요청 → 전 테이블 접근 차단.
- `order_imports.raw_text` 삭제 후에도 해당 확정 주문(orders/order_items)은 **유지**됨.

## 작업 후 보고 형식 (단위 2 종료 시)

1. 생성한 파일 경로(`db-schema-definition.md`, `supabase-rls-policy.md`)
2. 정의한 테이블 목록과 1차/후순위 구분
3. RLS 정책 요약(객체별 select/insert/update/delete)
4. RLS 검증 시나리오 결과(문서 기준)
5. 남은 질문/결정 필요 항목
6. `git status --short`

> 제약 재확인: 단위 2는 **문서 + SQL 초안까지만**. Supabase 적용·마이그레이션·구현은 별도 단위(작업지시서)로 분리한다.
