# 단위 8 작업 프롬프트 — Supabase 영구 저장 흐름 (주문 저장·기간 집계·거래명세서 재출력)

작성일: 2026-06-30
작성 주체: Claude (단위 8 사전 설계 점검)
기준 브랜치: `codex/integrate-mvp-docs-web`
상위 근거: `docs/db-schema-definition.md`, `docs/supabase-rls-policy.md`, `docs/function-specification.md`(F1~F13, §5.1/§5.2), `docs/task-prompt-unit-2-db-rls.md`, `docs/task-prompt-unit-6-nextjs-demo-flow.md`, `docs/delivery-note-print-spec.md`

> 이 문서는 **다음 세션 작업지시 프롬프트**다. 작성(이번) 단계에서는 Supabase 적용·마이그레이션·코드 구현을 하지 않는다. 아래는 단위 8에서 실행한다.

> **[2026-07-07 헌장 정렬]** 8a 완료, 8b 코드 완료(실측 남음). 남은 8c 실행 시 차수는 `docs/order-moa-system-meta-prompt.md`(헌장)가 우선한다. 본 문서 §3 금지 범위 중 **"매입처 테이블·품목별 기본 매입처"는 2차에서 1차 보강으로 이동**했다(8c 전 권장, Codex 승인 후 additive 마이그레이션 — 헌장 §6.4). 매입처별 발주 **기록** 저장/전송·원가는 여전히 2차.

---

## 1. 단위 8 목표

현재 데모(단위 6·7)는 클라이언트 메모리 상태로만 동작한다(새로고침 시 초기화). 단위 8은 이 흐름을 **Supabase에 실제 저장**으로 전환한다.

- 확정 주문이 DB에 저장되어 새로고침/재방문 후에도 남는다.
- 거래처/품목/별칭/단가가 회사별로 저장·조회된다(회사 격리 RLS).
- 거래처별 일/월/년 금액 집계, 거래명세서 재출력이 **저장 데이터만으로** 가능하다.
- 품목별 합산표·매입처 발주 문장은 저장된 주문에서 그대로 산출된다.

핵심 가치는 그대로다: "붙여넣으면 합산표·발주문장·거래명세서가 나온다" + **이제 기록이 남는다.**

---

## 2. 구현 범위 (단위 8)

> **Codex 확인 필요(범위 결정)**: 앞 단위(6·7)는 로그인을 보류했으나, RLS 회사 격리에는 `auth.uid()`가 필요하므로 본 문서는 **최소 인증(F1)·회사 부트스트랩(F2)을 단위 8에 포함**하는 안을 권장한다. 부담되면 **8a(스키마+RLS+인증+회사) / 8b(화면 DB 연결)** 로 분할 가능. 인증 포함 여부를 Codex가 먼저 확정할 것.

- Supabase 프로젝트에 **스키마 마이그레이션 적용**(`db-schema-definition.md` §6 SQL 기준): companies, company_members, customers, products(+`base_purchase_price`), product_aliases, customer_prices, order_imports, orders, order_items.
- **RLS 정책 적용**(`supabase-rls-policy.md`): 회사 격리, `is_company_member()` 헬퍼, service role key 서버 전용.
- **최소 인증(F1)**: Supabase Auth 이메일 1종(매직링크 등). 비밀번호 자체 저장 금지.
- **회사 생성/소속(F2)**: 회사+owner 멤버를 단일 RPC/트랜잭션으로 부트스트랩(RLS 부트스트랩 회피).
- **CRUD 영속화**: 거래처(F3)·품목(F4, base_purchase_price 포함)·별칭(F5)·거래처별 단가(F6) 저장/조회.
- **주문 영속화(F10)**: 확정 시 `orders`+`order_items` 저장(라인 단가 스냅샷). `order_imports.raw_text` 기본 저장 ON·삭제 가능.
- **조회 화면 DB 연결**: 주문 목록·품목별 합산표(F11)·거래처별 주문표/기간 집계(F12)·거래명세서 재출력(F13)을 저장 데이터로 렌더.
- 기존 순수 로직(`order-parser`/`calculations`/`aggregate`)은 **그대로 재사용**(저장 계층만 추가).

### 선택(여유 시, Codex 승인 후)
- `delivery_notes` 저장형(번호 채번 후순위) — 1차는 미저장 재출력으로 충분하므로 **기본 제외**.
- `receivables` 수동 status만 — 기본 제외 가능.

---

## 3. 금지 범위 (단위 8)

- VAT/과세 계산, 세금계산서 직접 발행, 홈택스/이카운트 연동 — **2차**
- ~~매입처 테이블·품목별 기본 매입처~~ — **2026-07-07 헌장 정렬로 1차 보강 이동**(8c 전 권장). 매입처별 발주 **기록** 저장/전송은 **2차** 유지
- 정확한 회계 마진(매입처별 원가·매입이력·재고평가) — **2차**
- PDF 생성, OCR, 카톡 자동 읽기 — 제외
- 단가 변경 이력(`price_history`), 월정산/세금계산서 집계 테이블(`tax_invoice_summaries`) — **2차**
- staff 권한 UI(스키마 `role`만 유지) — 2차
- 장기보관/첨부/원문 OCR 저장 — 후순위

---

## 4. 저장해야 할 데이터 (핵심 질문 1)

주문 확정 시 **반드시 저장**(스키마는 `db-schema-definition.md` §4):

| 테이블 | 저장 내용 | 이유 |
|---|---|---|
| `orders` | company_id, customer_id, order_date, source, status='confirmed', memo | 거래처·일자 단위 거래 기록(집계/재출력/세금계산서 근거) |
| `order_items` | company_id, order_id, product_id, raw_name, quantity, unit, **unit_price(스냅샷)**, amount(generated) | 라인 금액 보존 — 단가 변동과 무관하게 과거 금액 고정 |
| `order_imports` | company_id, customer_id, source, raw_text(기본 ON·삭제 가능), parsed_at, confirmed_at, created_by | 파싱 검수 보조·원문 추적(삭제해도 확정 주문 유지) |

세팅 데이터(주문 전 저장): `customers`, `products`(+`base_purchase_price`), `product_aliases`, `customer_prices`.

**보존 원칙**:
- `order_items.unit_price`는 **확정 시점 스냅샷**. 재출력/집계 시 `customer_prices` 재조회 금지.
- 파싱 후보/draft 라인은 DB에 저장하지 않음(화면 + `raw_text`).
- 예상 마진은 저장하지 않음(표시 시점 `products.base_purchase_price`로 계산하는 참고값).

---

## 5. 화면별 저장/조회 흐름

| 화면 | 동작 | 테이블 |
|---|---|---|
| 로그인(F1) | Supabase Auth 세션 | auth.users |
| 회사 생성(F2) | 회사+owner 부트스트랩(RPC) | companies, company_members |
| 거래처/품목/별칭/단가 | 등록·수정·조회(회사 범위) | customers, products, product_aliases, customer_prices |
| 발주 붙여넣기→파싱 | 거래처 선택+원문→파싱(클라이언트 순수함수), 원문 저장(선택) | order_imports(raw_text) |
| 파싱 확인/수정 | 단가 직접 수정·즉석 저장(customer_prices upsert)·별칭 등록(product_aliases) | customer_prices, product_aliases |
| 주문 확정(F10) | orders+order_items 트랜잭션 저장, order_imports.confirmed_at | orders, order_items, order_imports |
| 주문 목록 | 회사 주문 조회(날짜/거래처) | orders, order_items, customers |
| 품목별 합산표(F11) | 저장 주문에서 품목별 합산 | orders, order_items, products |
| 거래처별 주문표/기간(F12) | 거래처별 일/월/년 합계 | orders, order_items |
| 거래명세서(F13) | 저장 주문으로 재구성·인쇄 | orders, order_items, customers, companies |

---

## 6. 거래처별 일/월/년 금액 집계 방식 (핵심 질문 2)

- 별도 집계 테이블 없이 **쿼리로 산출**(1차):
  - 합계 = `Σ order_items.amount` (해당 `orders`와 join)
  - 범위 = `orders.order_date`가 일/월/년 구간, `orders.customer_id` 일치, `orders.company_id` = 내 회사, `orders.status='confirmed'`
- 인덱스: `orders(company_id, order_date)`, `orders(customer_id)`, `order_items(order_id)`, `order_items(company_id, product_id)` (이미 §4 정의).
- 월정산 캐시/집계 테이블은 성능 필요 시 2차.

---

## 7. 거래명세서 재출력 기준 (핵심 질문 3)

- 재출력에 필요한 저장 데이터: `orders`(거래처·일자) + `order_items`(품목·수량·단위·**스냅샷 단가**·금액) + `customers`(거래처 정보) + `companies`(공급자 정보).
- `delivery_notes` 저장 없이도 동일 명세서 재출력 가능(1차). 금액은 스냅샷이라 단가 변동과 무관하게 동일.
- 양식·인쇄 기준은 `delivery-note-print-spec.md`(A4·@media print·공급자/거래처 블록·VAT 없음).
- 번호(`note_number`) 채번·저장형 명세서는 후순위(필요 시 `delivery_notes`).

---

## 8. 매입처 발주용 합산표와의 관계 (핵심 질문 5·6)

- 품목별 합산표(F11)·복사용 발주 문장은 **현재 주문 데이터(order_items)만으로 충분**하다(단위 7에서 순수함수 `aggregate.ts`로 구현 완료). 저장 전환 후엔 메모리 대신 DB 조회 결과를 같은 함수에 넣으면 된다.
- "품목별 기본 매입처"는 **현재 스키마를 막지 않는다**: `ordermoa_suppliers` 테이블 + `products.purchase_supplier_id`(nullable FK) 추가는 순수 additive. 합산표를 매입처별로 그룹핑하는 UI는 이미 1차 구현됨(화면 상태 기준). **DB화는 1차 보강으로 8c 전 권장**(2026-07-07 헌장 정렬).
- 매입처별 발주 저장/전송·매입 원가는 2차(정확 마진과 함께).

---

## 9. 세금계산서 연동을 위한 1차 보존 데이터 (핵심 질문 4)

- 세금계산서 직접 발행은 2차지만, **근거 데이터는 1차에서 보존**(§5.2 기능정의서):
  - 거래처별 기간(월) `Σ order_items.amount` = 매출 합계의 근거.
  - 주문 단위 `거래처·일자·품목·수량·단가·라인 금액`(스냅샷) 보존.
- 2차에서 `tax_invoice_summaries`(월·거래처·매출합계·발행액·차이)로 정리·대조. 1차는 이 테이블을 만들지 않되, orders/order_items가 그 근거가 되도록 한다.
- VAT는 1차 미계산(`products.tax_type`만 보존). 2차에서 공급가/세액/합계 분리.

---

## 10. 테스트/검증 기준 (단위 8)

- 기존 순수함수 테스트(parser/calculations/aggregate/domain) **전부 유지·통과**.
- 추가(가능하면 순수/헬퍼 단위로 테스트):
  - 주문 저장 payload 빌더(확정 라인 → orders/order_items insert 형태) 단위 테스트.
  - 거래처별 기간 합계 계산 헬퍼(저장 데이터 입력 → 일/월/년 합계).
- RLS 검증(`supabase-rls-policy.md` 시나리오):
  - A회사 사용자가 B회사 orders/order_items/customer_prices select → **0행**, insert/update → **거부**.
  - `order_imports.raw_text` 삭제 후에도 확정 주문 유지.
  - service role key 클라이언트 미노출, `.env` 미커밋.
- 명령: web `npm test`, web `npm run build`, 루트 `npm test`. 모바일 390px 회귀.
- 수동: 주문 확정 → **새로고침 후에도 주문/합산표/명세서 유지** 확인.

---

## 11. 다음 작업자에게 줄 구현 지시

1. 작업 전 `git pull`, 브랜치 확인. **커밋/머지/push는 Codex 판단**(지시 없으면 보고만).
2. Supabase 프로젝트 준비 → `db-schema-definition.md` §6 SQL로 마이그레이션 적용, `supabase-rls-policy.md`로 RLS 활성화. service role key 서버 전용, `.env`는 `.gitignore` 확인.
3. 인증(F1)·회사 부트스트랩(F2, RPC) 최소 구현.
4. 데이터 접근 계층 추가(서버 액션/route handler). 클라이언트에 service key 노출 금지.
5. 화면을 메모리 상태 → DB 조회/저장으로 전환(§5 표). 순수 로직 모듈 재사용.
6. 주문 확정 시 orders/order_items 트랜잭션 저장(단가 스냅샷). raw_text 저장·삭제 동작.
7. 합산표/주문표/기간 집계/거래명세서를 저장 데이터로 렌더.
8. 검증(§10) 실행 후 결과 보고.

### 설계 경계 재확인
- 세금계산서 발행=2차 / 근거 기간 금액=1차 보존.
- 매입처 발주 저장·기본 매입처=2차 / 품목별 합산표·발주 문장=1차.
- 정확 회계 마진=2차 / 기준 매입단가 예상 마진=1차 참고값.
- raw_text 사용자 삭제 가능 / 장기보관·OCR·첨부=후순위.
