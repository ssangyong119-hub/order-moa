# 오더모아 W23-R5b 확정 주문 정정 — 구현 준비 설계

작성일: 2026-07-12 · 작성 주체: Claude (설계만 — 앱 코드/SQL/Supabase 무접촉)
기준 커밋: `877f948` (branch `codex/integrate-mvp-docs-web`) · 작업 브랜치: `claude/r5b-correction-design`
상위 기준: `docs/superpowers/specs/2026-07-11-order-moa-operations-ux-tax-design.md` §3(R5b) · `docs/order-moa-system-redesign-2026-07-11.md` §2·§5·§15-2 · `docs/order-moa-w23-r1-state-model-decision.md`
상태: **설계 확정 — Codex 결정 D1~D8 반영 완료(§12, 2026-07-12).** 마이그레이션 SQL은 참고 초안이며, 이 문서는 어떤 파일 생성·적용도 수행하지 않는다. 실제 구현과 0012 적용은 별도 게이트.
병렬 주의: W23-R4(대시보드)는 기준 브랜치에 **통합 완료**(`ab94b2a`, 2026-07-12 검수 확인 — order-store.ts·0010/0011 무변경, 0012 번호 비어 있음) — **R5b 구현은 그 병합된 최신 상태에서 새 worktree로 시작**한다(§10 선행 조건).

---

## 0. 고정 원칙 (기준서 재확인 — 본 설계의 불변 조건)

```text
기존 최종 확정 주문 선택
→ 취소 확인
→ 기존 품목·수량·단가를 새 편집 주문으로 복사
→ 수정
→ 새 주문으로 재확정
→ 새 주문은 원주문 연결(corrected_from_order_id)을 보존
```

- 기존 confirmed 주문의 라인·단가 스냅샷을 직접 수정하지 않는다(0010/0011 가드가 DB에서 강제).
- 기존 주문은 cancelled로 보존하고 이력에서 "정정됨"으로 추적 가능해야 한다.
- cancelled 주문은 합산표·월합계·일반 업무 목록에서 제외한다.
- 새 주문의 명세서를 새로 발행하며 기존 명세서는 바꾸지 않는다.
- quantity_confirmed(가격 대기)와 confirmed(최종 확정)를 섞지 않는다 — 정정은 confirmed 전용 절차다.
- raw_text 삭제 가능 원칙 유지 · 모든 DB 객체 `ordermoa_` 접두사 · `web/.env.local` 무접촉.

## 1. 확인된 현재 사실 (2026-07-12, 코드·마이그레이션 실측)

| # | 사실 | 위치 | R5b에 주는 의미 |
|---|---|---|---|
| C1 | 상태 전이 가드: `confirmed→cancelled`만 허용(그 외 confirmed발 전이 차단), `cancelled`는 **종결 상태**(되살리기 금지) | 0011 ①(38~60행) | 정정의 "기존 주문 취소"는 가드와 정확히 호환. un-cancel 불가 → 복원은 "새 주문 재발행"으로만 가능 |
| C2 | 라인 동결 가드: **confirmed/cancelled** 주문의 order_items는 INSERT(주입)·UPDATE·DELETE·order_id 이동 전부 차단. qc 상태에서만 수정 가능 | 0011 ②③(63~110행) | 원주문 라인은 취소 후에도 DB가 보존을 강제. 복사는 읽기 전용이므로 충돌 없음 |
| C3 | `saveOrder`는 항상 **qc로 insert → items insert → confirmed 승격**(경로 A 포함). items 실패 시 새 주문을 cancelled로 보상. 승격 실패 시 qc로 남아 가격 마감으로 재확정 가능 | order-store.ts:535~615 | 정정본 생성은 saveOrder 재사용으로 충분 — 별도 insert 경로 불필요, 가드 통과 검증 완료된 경로 |
| C4 | `loadOrders`는 `.in("status",["confirmed","quantity_confirmed"])`만 조회 → cancelled는 **어떤 화면·집계에도 자동 미포함** | order-store.ts:504 | "취소 주문 제외" 불변은 이미 성립. 이력 추적만 별도 조회로 추가하면 된다 |
| C5 | 합산표=`filteredOrders`(전역 orders 그대로: confirmed+qc), 월합계=`orders.filter(status==="confirmed")`, 주문 CSV=전역 orders. aggregate/monthly 순수 함수엔 status 로직 없음(호출부 필터) | page.tsx:1053~1065 · 1486~1488 · 1203~1214, aggregate.ts, monthly-summary.ts | 포함/제외는 전부 호출부 결정(R1 F8 재확인). **전역 orders에 cancelled를 섞으면 안 된다** — 이력은 별도 상태로 |
| C6 | 사용자용 주문 취소 UI는 **현재 없음**(cancelled는 saveOrder 보상 전용). 주문 목록 행 동작 = [가격 마감](qc)/[보기](confirmed)뿐 | page.tsx:1896~1940 | R5b가 최초의 사용자용 취소 경로를 도입한다(정정에 내장) |
| C7 | `ordermoa_orders.source text` — **CHECK 없음**. `orders.memo` 미사용. orders delete 정책 없음(RLS), update/insert 정책 존재 | 0001:92~103 · 0002:94~97 | 링크 컬럼 추가에 RLS 변경 불필요. source에 'correction' 같은 값 자유 사용 가능 |
| C8 | 교차회사 방어 = 테이블별 트리거(FK는 RLS를 우회하므로 트리거가 방어선). 0006이 "링크 컬럼 추가+트리거 보강" 선례(`add column if not exists`+함수 교체) | 0001:120~193 · 0006 | corrected_from에도 동일 패턴 필요. 단 0012는 0001 함수를 건드리지 않는 **신규 트리거**로(§5) |
| C9 | 컬럼 폴백 하우스 패턴: `isMissingColumnError(error, col)` + select 재시도(0007/0009 미적용 대비 3단 폴백) | product-store.ts:104~111 · 180~187 | `corrected_from_order_id`도 0012 미적용 DB에서 loadOrders가 깨지지 않게 동일 폴백 필수(§7.3) |
| C10 | `ConfirmedOrder.status`는 `"confirmed"\|"quantity_confirmed"` 2값. `mapDbOrder`는 모르는 status를 confirmed로 정규화 | order-store.ts:33·129 | 이력 조회를 추가하면 cancelled를 confirmed로 오표기 → 타입·정규화 확장 필요(§7.2) |
| C11 | 발주 원문은 `ordermoa_order_imports.order_id`(0006, on delete cascade)로 원주문에 연결. `deleteOrderRawText`는 imports만 UPDATE(라인 동결과 무관) | order-store.ts:722~733 · 0006 | 원문은 원주문에 남긴다. **취소된 원주문의 원문도 여전히 삭제 가능**(raw_text 원칙 유지) |
| C12 | 검수표(review 화면)는 `ParsedLine[]` 기반 — productId/quantity/unit/unitPrice 편집, 즉석 품목 등록, 미매칭 차단(`canConfirm`) 포함. 재설계 §8: "모든 입력 채널은 공통 검수표로 수렴" | order-parser.ts:9~38, page.tsx review 뷰 | 정정 편집 화면 = 검수표 재사용이 원칙과 코드 양쪽에서 최소 경로(§6.1) |
| C13 | fake supabase 빌더 mock으로 saveOrder/closeOrderPrices 오케스트레이션을 검증하는 테스트 패턴 존재 | order-store.test.ts:406~529 | correctOrder 통합 테스트가 그대로 재사용할 틀 |
| C14 | 마이그레이션 최신 = 0011(적용 완료). W23-R4는 읽기 전용 집계라 마이그레이션 없음(재설계 §10) | web/supabase/migrations/ · 재설계 §10 | R5b 링크 마이그레이션 = **0012**(구현 세션에서 번호 재확인) |

## 2. 설계 요약 (확정안 한눈에 — 상세는 §12)

| 항목 | 확정 |
|---|---|
| 복사본의 존재 형태 | **화면 상태(검수표 재사용)** — DB 초안 객체 없음(재설계 §11 기각 논거 유지) |
| DB 쓰기 시점 | **"정정 확정" 클릭 시 일괄**: ① 원주문 조건부 취소 → ② saveOrder(정정본, confirmed). 진입 시 다이얼로그는 의도 고지만 하고 아무것도 쓰지 않는다 |
| 취소·생성 순서 | **취소 선행 고정**(DB 트리거도 이 순서를 강제) — 이중 집계(초과 발주·매출 중복)가 구조적으로 불가능 |
| 원주문 연결 | `ordermoa_orders.corrected_from_order_id uuid null self-FK` + 자기참조 CHECK + **활성 정정본 부분 유니크** + 교차회사·원본상태·불변 트리거(0012 초안 §5.4) |
| 정정 시작 표식 | `ordermoa_orders.correction_started_at timestamptz null` — **정정 확정이 원주문을 confirmed→cancelled로 바꾸는 그 조건부 UPDATE에서만 기록**(같은 문장). 일반 주문·일반 취소(보상 포함)는 항상 null. INSERT 주입·사후 설정·수정·삭제 전부 트리거 차단(§5.4-⑤) |
| 정정 버튼 노출 | confirmed만. qc는 기존 [가격 마감]으로(정정 아님). cancelled는 이력 보기에서만 — **`correction_started_at`이 있는 행(=정정 절차가 취소까지 갔던 원주문)** 중 활성 정정본이 없는 행에만 재발행 노출(D3 복구 한정을 DB 표식으로 강제) |
| 이력 추적 | 주문 목록 "취소 이력 보기" 토글 + 별도 조회 `loadCancelledOrders` — **전역 orders 배열에 cancelled를 섞지 않는다** |
| 명세서 | 새 주문 = 기존 note 뷰 그대로 발행. 원주문 명세서는 재출력 비제공(1차), 내역·원문은 이력에서 열람 |

## 3. 정정의 허용·거절 조건

| 대상 주문 상태 | 정정 버튼 | 근거 |
|---|---|---|
| `confirmed` | **허용** — 본 절차의 유일한 정식 대상 | 기준서 §3 R5b. 스냅샷은 가드로 동결이므로 취소+재발행만 가능 |
| `quantity_confirmed` | **거절(버튼 미노출)** — 기존 [가격 마감]으로 안내 | qc는 라인이 아직 동결 전(C2)이라 정정 절차가 필요 없다. 혼용 금지 원칙(§0). qc 라인 편집 UX 자체는 R5 범위(재설계 §13)로 별개 |
| `cancelled` + 활성 정정본 있음 | **거절** — "이미 정정된 주문" | 같은 원주문의 이중 정정 = 이중 집계. 부분 유니크 인덱스가 DB에서도 차단(§5.4-③) |
| `cancelled` + `correction_started_at` **null** | **거절(버튼 절대 미노출)** — 이력에는 [취소됨]로 보이기만 한다 | 정정 절차가 시작된 적 없는 취소(예: saveOrder 저장 실패 보상 취소). 여기에 재발행을 허용하면 사실상 일반 취소→재발행 = **D6 거절 원칙 위반**. 표식이 없으므로 구분이 DB에서 강제된다 |
| `cancelled` + `correction_started_at` **있음** + 활성 정정본 없음 | **D3 채택(복구 한정)** — 이력 보기의 "정정본 만들기(재발행)" | **정정 확정이 취소까지 갔다가 생성에 실패(F3·F4)한 원주문**만 해당. 취소된 정정본 자식(F4 잔여)은 표식이 null이라 자동 제외. 취소 종결(C1)이라 un-cancel은 불가 — 재발행이 유일한 완결 경로 |
| 데모 모드 | DB 모드와 동일 규칙(메모리) | smoke 검증 가능해야 함 |

거절 시 동작: 버튼 미노출이 기본. 경합으로 뚫린 경우(두 탭)는 DB가 막고(조건부 취소 0행·유니크 위반) 앱은 "이미 처리된 주문입니다. 목록을 새로고침해주세요." 계열 메시지로 안내한다(closeOrderPrices의 기존 문구 패턴).

## 4. 복사 계약 — 무엇을 복사하고 무엇을 절대 복사하지 않나

| 항목 | 복사? | 비고 |
|---|---|---|
| `customer_id` | **복사(고정)** | 정정 화면에서 거래처 select는 **비활성**(표시만). 거래처 변경은 1차 불허(D4 채택). 거래처가 틀린 주문의 정리 수단은 R5b 범위 밖(단독 취소 D6 제외) |
| `order_date` | 복사 후 **편집 가능** | W18 주문일 수정 패턴 그대로(`confirmDate` 입력 재사용) |
| 라인 `product_id`·`quantity`·`unit`·`unit_price` | **복사 후 편집 가능** | 단가는 원주문 스냅샷이 시작값. 라인 추가/삭제는 검수표 기존 기능 |
| 라인 `raw_name` | 복사 | 표시 폴백·유래 보존(보관된 품목이어도 이름 표시 가능, C10의 mapDbOrder 폴백과 일관) |
| `productName`(표시) | 원주문 라인 값 사용 | products 재조회로 재해석하지 않는다 — 보관/개명된 품목도 원주문 표기 유지 |
| `source` | **복사하지 않고 `'correction'` 저장** | source CHECK 없음(C7). 'kakao' 그대로 두면 유래가 오기록됨. D5 채택 |
| `id`·`created_at`·`status` | **절대 복사 금지** | 새 uuid·새 시각·새 상태 전이(qc→confirmed) |
| `amount`·`total`·`margin` | **절대 복사 금지** | amount는 generated 컬럼(insert 제외 원칙), total/margin은 파생값 |
| `raw_text`(order_imports) | **절대 복사·이동 금지** | 원문은 원주문의 imports 행에 남는다(C11). 정정본은 원문 없음(`rawText` 미저장). 취소된 원주문에서도 원문 삭제 가능 유지 |
| `corrected_from_order_id` | 원주문 값 복사 금지 — **새 주문에 `원주문.id` 저장** | 체인: A←B←C (각 정정본은 직전 원본만 가리킴). 전체 이력은 링크 추적으로 복원 |
| `memo` | 복사 안 함 | 앱 미사용 컬럼(C7) — R5b에서 건드리지 않음 |

## 5. `corrected_from_order_id` 데이터 모델 (0012 초안 — 파일 작성은 구현 세션, 적용은 Codex 승인+사용자 SQL Editor)

### 5.1 결정 요약

| 속성 | 결정 | 근거 |
|---|---|---|
| 위치·타입 | `ordermoa_orders.corrected_from_order_id uuid` | 주문 1건의 속성. 별도 링크 테이블은 1:1 관계에 과잉 |
| nullable | **null 허용**(기본 null) | 기존 전 행·일반 주문 = null → backfill 0건, 기존 insert 경로 무변경 |
| self-FK | `references public.ordermoa_orders(id)` — **on delete 무지정(NO ACTION)** | 앱엔 orders delete 경로가 없고 RLS delete 정책도 없음(C7). 관리자 수동 정리는 어차피 0011 라인 동결 때문에 트리거 drop이 선행됨(0011 결정 주석) → set null로 추적을 조용히 잃는 것보다 기본 차단이 프로젝트 철학과 일치. 회사 단위 cascade(companies→orders)는 NO ACTION의 문장 단위 검사로 통과 |
| 인덱스 | **부분 유니크** `where corrected_from_order_id is not null and status <> 'cancelled'` | ① 원주문당 활성 정정본 1건을 DB가 보장(이중 정정=이중 집계 차단) ② 역조회("이 주문을 정정한 주문") 인덱스 겸용 ③ **취소된 정정본(부분 실패 잔여)은 유니크에서 빠져 재시도를 막지 않는다**(§8 실패 매트릭스와 한 몸) |
| 회사 경계 | 트리거로 `원주문.company_id = NEW.company_id` 강제 | FK는 RLS 우회(C8) → 교차회사 방어는 트리거가 담당(0001/0006 하우스 패턴) |
| 원본 상태 | 트리거로 **원주문 status='cancelled' AND `correction_started_at` not null일 때만 링크 insert 허용** | "취소 선행" 순서를 DB가 강제 → 이중 집계 창 원천 봉쇄. **표식 조건이 없으면 표식 없는 일반 보상 취소 주문을 원본으로 한 INSERT가 DB를 통과해 D3 복구 한정이 앱 방어에만 의존** → 트리거에도 넣어 3중 방어 유지(2026-07-12 검수 보강). 재발행(D3) 대상도 표식 있는 cancelled라 동일 규칙 통과 |
| 순환 방지 | ① 링크는 **insert 시에만 설정, 이후 UPDATE로 변경 금지**(트리거) ② `check (corrected_from_order_id <> id)` | insert 전용 링크는 기존 행만 가리킬 수 있어 그래프가 구조적으로 비순환(DAG). CHECK는 1줄 방어 |
| 정정 시작 표식 | `correction_started_at timestamptz null`. **쓰기 규칙(트리거 강제)**: ⓐ INSERT는 null만 허용(주입 차단) ⓑ UPDATE의 null→값 설정은 **OLD.status='confirmed' AND NEW.status='cancelled'인 같은 전이에서만** 허용 ⓒ 한 번 기록되면 수정·삭제(null화) 불가 | 링크는 정정본→원주문 단방향이라 **F3(취소 후 생성 실패)에서는 원주문에 아무 흔적이 없다**. 표식이 "이 취소는 정정 절차의 취소"임을 원주문 쪽에 남겨 D3 재발행을 그 경우로만 한정(D6 위반 차단). 일반 취소·보상 취소는 표식을 건드리지 않아 null 유지 |
| 멱등성 | `add column if not exists` · `drop constraint/trigger if exists → add/create` · `create unique index if not exists` · `create or replace function` | 0006/0010/0011과 동일한 재적용 안전 패턴. 데이터 무접촉·backfill 0건·RLS 무변경 |

### 5.2 RLS·기존 가드와의 공존

- **RLS 무변경**: 정책은 행 단위(company_id 기준)라 컬럼 추가에 정책 변경 불요(0006 선례). insert/update 정책 기존 그대로.
- **0010/0011 무접촉**: 상태 전이 함수·라인 동결 함수를 교체하지 않는다. 정정 절차가 쓰는 전이는 전부 기존 허용 목록(`confirmed→cancelled`, insert qc, `qc→confirmed`) 안이다.
- **신규 트리거는 별도 함수**(`ordermoa_check_orders_correction`): 0001의 `ordermoa_check_orders_company`를 교체하지 않는다. 0006은 순수 교차회사 검사라 함수 교체가 맞았지만, 이번 검사는 원본 상태·불변성까지 포함하므로 관심사를 분리한 새 트리거가 검토·롤백 모두 단순하다.

### 5.3 정정 절차와 가드의 전이 대조 (전부 기존 허용 전이)

| 단계 | DB 조작 | 0010/0011 판정 |
|---|---|---|
| ① 원주문 취소+표식 | `orders UPDATE status='cancelled', correction_started_at=now WHERE id=원주문 AND status='confirmed'` — **취소와 표식 기록은 이 한 UPDATE** | 허용(`confirmed→cancelled`) · 조건부라 경합 시 0행. 0012 트리거 ⓑ(confirmed→cancelled 전이에서의 null→값)와 정확히 일치 |
| ② 정정본 insert | `orders INSERT (status='quantity_confirmed', corrected_from_order_id=원주문)` | 상태 가드는 UPDATE 전용이라 무관. 0012 트리거: 동일회사·원본 cancelled·**원본 표식 기록됨(④')** 검사 통과(①에서 표식을 남겼으므로) |
| ③ 라인 insert | `order_items INSERT (order=정정본)` | 허용(대상이 qc — 0011 ② INSERT 가드 통과, saveOrder 기존 경로 그대로) |
| ④ 승격 | `orders UPDATE status='confirmed' WHERE id=정정본 AND status='quantity_confirmed'` | 허용(`qc→confirmed`) |
| (실패 보상) | `orders UPDATE status='cancelled' WHERE id=정정본` | 허용(`qc→cancelled`) — saveOrder 기존 보상. **표식 무접촉(null 유지)** → 0012 트리거 통과, 취소된 정정본 자식은 재발행 대상이 아니게 됨(§3) |

### 5.4 0012 SQL 초안 (참고용 — 이 세션은 마이그레이션 파일을 만들지 않는다)

```sql
-- 0012_order_correction_link.sql (초안) — 전부 additive·idempotent, 데이터 무접촉, backfill 0건, RLS 변경 없음
-- ① 링크 컬럼 (null = 일반 주문)
alter table public.ordermoa_orders
  add column if not exists corrected_from_order_id uuid references public.ordermoa_orders(id);

-- ①' 정정 시작 표식 (null = 정정 절차가 취소까지 간 적 없음 — D3 복구 식별용.
--    정정 확정의 "원주문 confirmed→cancelled 조건부 UPDATE"에서만 같은 문장으로 기록된다.)
alter table public.ordermoa_orders
  add column if not exists correction_started_at timestamptz;

-- ② 자기 참조 금지 (insert 전용 링크라 구조상 불가하지만 1줄 방어)
alter table public.ordermoa_orders
  drop constraint if exists ordermoa_orders_corrected_from_not_self;
alter table public.ordermoa_orders
  add constraint ordermoa_orders_corrected_from_not_self
  check (corrected_from_order_id is null or corrected_from_order_id <> id);

-- ③ 활성 정정본 유일 + 역조회 인덱스 — 취소된 정정본(부분 실패 잔여)은 재시도를 막지 않는다
create unique index if not exists ordermoa_uq_orders_active_correction
  on public.ordermoa_orders(corrected_from_order_id)
  where corrected_from_order_id is not null and status <> 'cancelled';

-- ④⑤ 정정 링크·표식 가드: 교차회사 차단 + 원주문은 "cancelled+표식 기록"만(④') + 링크는 insert 시에만(불변 → 순환 구조 차단)
--    + correction_started_at 쓰기 규칙(ⓐ insert 주입 차단 ⓑ confirmed→cancelled 전이에서만 설정 ⓒ 기록 후 불변)
create or replace function public.ordermoa_check_orders_correction()
returns trigger language plpgsql as $$
declare src_company uuid; src_status text; src_marker timestamptz;
begin
  if TG_OP = 'INSERT' then
    -- ⑤ⓐ 표식 주입 차단: 정정 시작 표식은 INSERT로 만들 수 없다(정정의 원주문 취소 UPDATE에서만 생김)
    if NEW.correction_started_at is not null then
      raise exception 'ordermoa: correction_started_at은 insert로 설정할 수 없습니다 (order %)', NEW.id;
    end if;
    if NEW.corrected_from_order_id is null then
      return NEW;
    end if;
    select company_id, status, correction_started_at into src_company, src_status, src_marker
      from public.ordermoa_orders where id = NEW.corrected_from_order_id;
    if src_company is null or src_company <> NEW.company_id then
      raise exception 'cross-company reference (ordermoa_orders.corrected_from_order_id)';
    end if;
    if src_status <> 'cancelled' then
      raise exception 'ordermoa: 취소된 주문만 정정 원본이 될 수 있습니다 (원주문 %, 상태 %)', NEW.corrected_from_order_id, src_status;
    end if;
    -- ④' 원본 표식 필수: 정정 절차의 취소(표식 기록)만 원본 자격 — 표식 없는 일반 보상 취소를
    --    원본으로 한 재발행(사실상 일반 취소→재발행 = D6 위반)을 DB에서도 차단(앱 §6.2와 동일 규칙)
    if src_marker is null then
      raise exception 'ordermoa: 정정 절차로 취소된 주문(correction_started_at 기록)만 정정 원본이 될 수 있습니다 (원주문 %)', NEW.corrected_from_order_id;
    end if;
    return NEW;
  end if;

  -- UPDATE
  -- ④ 링크 불변
  if NEW.corrected_from_order_id is distinct from OLD.corrected_from_order_id then
    raise exception 'ordermoa: 정정 링크는 생성 후 변경할 수 없습니다 (order %)', NEW.id;
  end if;
  -- ⑤ⓒ 표식 불변: 한 번 기록한 correction_started_at은 수정·삭제(null화) 불가
  if OLD.correction_started_at is not null
     and NEW.correction_started_at is distinct from OLD.correction_started_at then
    raise exception 'ordermoa: correction_started_at은 기록 후 수정·삭제할 수 없습니다 (order %)', NEW.id;
  end if;
  -- ⑤ⓑ 표식 설정(null→값)은 정정의 원주문 취소(confirmed→cancelled) 전이에서만
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
```

## 6. 앱 설계

### 6.1 정정 편집 화면 = 기존 검수표(review 뷰) 재사용

재설계 §8 "모든 입력 채널은 공통 검수표로 수렴"을 그대로 따른다. 새 편집 화면을 만들지 않는다.

- 진입: 주문 목록 confirmed 행의 [정정] → `window.confirm` 고지 → `correctionSource` 상태 설정(`{orderId, customerId, customerName, date, total}`) + `orderToParsedLines(order)`(순수 변환)로 `lines` 채움 + `confirmDate=원주문 날짜` + `setView("review")`.
- 변환 계약(`OrderLine → ParsedLine`): `productId`/`productName`/`quantity`/`unit`/`unitPrice` 복사, `rawText=raw_name ?? productName`, `status:"matched"`, `wasUnmatched:false`, `priceSource`는 스냅샷 유래이므로 undefined("직접 입력" 취급) — 기본단가 뱃지를 잘못 띄우지 않는다.
- 정정 모드 UI 차이: ① 상단 배너 "OO(거래처) {날짜} 주문의 정정본 작성 중 — [정정 확정] 전에는 아무것도 변경되지 않습니다" ② 거래처 select 비활성 ③ **[수량만 확정] 버튼 숨김**(혼용 금지 §0) ④ 확정 버튼 라벨 = "정정 확정(기존 주문 취소)".
- **이탈 = 전면 무해**: `correctionSource`는 다른 화면 이동·새 파싱(`handleParse`)·거래처 변경 시 반드시 초기화한다. 정정 초안과 새 붙여넣기가 섞이면 엉뚱한 주문을 취소하게 되므로 이 초기화는 테스트 대상(§9.1-4).
- 검수표의 기존 기능(라인 추가/삭제/즉석 품목 등록/단가 편집/Enter 이동/`canConfirm` 차단)은 그대로 동작해야 하며 회귀 확인 대상.

### 6.2 order-store 계층 (DB 오케스트레이션)

| 함수 | 계약 |
|---|---|
| `toOrderInsert(..., opts?)` 확장 | `opts.correctedFromOrderId` 있을 때만 `corrected_from_order_id` 키 포함(0012 미적용 DB에서 일반 주문 insert 불변), `opts.source`로 `'correction'` 지정 가능 |
| `saveOrder(..., opts?)` 확장 | opts를 toOrderInsert로 전달. qc insert→items→승격·보상 로직 무변경(C3) |
| (내부) 원주문 조건부 취소+표식 | `correctConfirmedOrder` **내부 전용** 단계 — 별도 export도, 단독 [취소] 버튼도 없다(D6 거절). **취소와 정정 시작 표식은 하나의 UPDATE**: `UPDATE {status:'cancelled', correction_started_at:<now ISO>} WHERE company_id AND id AND status='confirmed'` + `.select("id")`. 1행=지금 취소됨(표식 기록됨), 0행=현재 상태 재조회로 분기(아래). 트리거 ⑤ⓑ가 이 전이 외의 표식 설정을 차단 |
| `correctConfirmedOrder(db, companyId, original, orderDate, lines, products)` 신규 | ① 원주문 조건부 취소+표식(위) → 0행이면 재조회: **cancelled + `correction_started_at` not null + 활성 정정본 없음이면 진행**(F2 경합 재시도와 D3 복구 재발행을 한 분기로 흡수), 활성 정정본 있으면 throw "이미 정정된 주문", **표식 null인 cancelled**(일반 취소·보상 취소)면 throw "정정 절차의 취소가 아님"(D6 위반 차단), confirmed/qc 등 그 외 throw ② `saveOrder(..., status:"confirmed", {correctedFromOrderId: original.id, source:"correction"})` ③ 반환: 정정본 ConfirmedOrder |
| `loadCancelledOrders(db, companyId, products)` 신규 | `ORDER_SELECT` + `.eq("status","cancelled")` 정렬 동일. **전역 orders와 절대 병합 금지** — 이력 화면 전용 상태로만 사용 |

### 6.3 타입·조회 폴백

- `OrderStatus`에 `"cancelled"` 추가 + `mapDbOrder` 정규화 확장(`cancelled → "cancelled"`, 나머지 기존 규칙). `ConfirmedOrder`에 `correctedFromOrderId?: string | null` · `correctionStartedAt?: string | null` 추가(후자는 이력 화면의 D3 재발행 버튼 판정용).
- **status 소비처 전수 확인 목록**(cancelled 유입 지점은 이력 상태뿐이지만 타입 확장 시 컴파일·의미 재점검): page.tsx 849(문구)·1209·1211(CSV)·1901~1936(목록 뱃지/버튼)·1950·1963(가격 마감 가드)·1975·1989(명세서 가드)·1488(월합계 필터) — 행 번호는 `877f948` 기준, R4 병합으로 이동됨(심볼 재탐색). **R4 병합(ab94b2a)으로 추가된 소비처 2곳**: `web/src/lib/dashboard-queue.ts`(confirmed/qc만 집계, cancelled·알 수 없는 상태는 명시 제외 — 검수 확인, 무변경으로 안전) · `web/src/app/order-list-filter.ts`(`OrderListStatusFilter = "all"|"quantity_confirmed"|"confirmed"`, "cancelled는 loadOrders에서 이미 제외" 주석 명시). 월합계는 `=== "confirmed"` 필터라 안전, 합산표는 전역 orders에 cancelled가 없어 안전.
- `ORDER_SELECT`에 0012 컬럼 2종(`corrected_from_order_id`, `correction_started_at`)을 함께 추가 + **0012 미적용 폴백**: 둘 중 어느 컬럼이든 `isMissingColumnError`면 두 컬럼 모두 뺀 기존 목록으로 재시도(C9 패턴 — 두 컬럼은 같은 0012에서 생기므로 폴백 단계는 1개).

#### `loadOrders` 반환 계약 (정확히 명시 — 구현자가 추측하지 않도록)

현재 `loadOrders`는 **주문 배열만** 반환한다(`Promise<ConfirmedOrder[]>`). 폴백 성공 여부를 화면이 알아야 정정 UI를 조건부로 숨길 수 있으므로 반환을 객체로 바꾼다.

- **변경 후 시그니처: `Promise<{ orders: ConfirmedOrder[]; correctionSchemaReady: boolean }>`**.
- 0012 컬럼(`corrected_from_order_id`·`correction_started_at`)을 포함한 조회가 성공하면 `correctionSchemaReady = true`.
- 누락 컬럼 오류로 **기존 컬럼 폴백 조회가 성공하면 `correctionSchemaReady = false`**.
- 원문 병합(`attachRawText`)·정렬 등 내부 로직은 그대로 두고 반환만 객체로 감싼다.
- **호출부는 단 1곳**(`const ords = await loadOrders(...)` — R4 병합 기준 `ab94b2a`의 page.tsx:302, 2026-07-12 재검수 grep으로 다른 호출부·기존 테스트 없음 재확인). 페이지 초기 로더를 `const { orders, correctionSchemaReady } = await loadOrders(...)`로 **구조 분해**해 `setOrders(orders)`와 신규 상태 `setCorrectionSchemaReady(correctionSchemaReady)`를 **각각 갱신**한다. 반환 타입 변경의 파급은 이 한 줄 + 신규 상태뿐.
- **`correctionSchemaReady === false`이면 [정정] 버튼·"취소 이력 보기" 토글·[정정본] 뱃지 등 정정 관련 UI를 전부 숨긴다**(미적용 DB에서 기능 자체가 안 보이게 — 0007/0009 폴백 철학과 동일).

### 6.4 주문 목록·이력·데모 모드

- confirmed 행: [보기] 옆에 [정정] 추가. `correctedFromOrderId`가 있는 행에는 `[정정본]` 뱃지.
- "취소 이력 보기" 토글(주문 목록 안, 새 사이드바 메뉴 금지): `loadCancelledOrders` 결과를 **별도 상태 배열**로 렌더 — 읽기 전용 행(날짜·거래처·품목 요약·참고 금액·[취소됨] 뱃지). **R4가 도입한 주문 목록 상태 필터(`order-list-filter.ts`의 `OrderListStatusFilter`)에 "cancelled"를 추가하는 방식으로 구현하지 말 것** — 그 필터는 전역 orders(활성만)를 거르는 것이고, cancelled를 거기 태우려면 loadOrders를 넓혀야 해서 "전역 orders에 cancelled 금지" 불변이 깨진다. 이력은 반드시 별도 조회+별도 배열. 활성 정정본이 가리키는 원주문은 `[정정됨]` + "새 주문 보기" 링크(역조회는 로드된 활성 orders에서 클라이언트 매칭). 원문 보기/삭제는 이력 행에서도 유지(C11).
- **정정 실패 복구(D3, 복구 한정 — 세 조건 전부 충족 시에만)**: ⓐ `status='cancelled'` ⓑ `correctionStartedAt`이 null 아님(=정정 절차가 취소까지 갔던 원주문) ⓒ 활성 정정본 없음 — 이때만 "정정본 만들기(재발행)" 버튼을 노출한다. **표식 없는 cancelled 행(일반 저장 실패 보상 취소 등)은 이력에 [취소됨]로 보이되 재발행 버튼을 절대 노출하지 않는다**(허용하면 일반 취소→재발행 = D6 위반). 취소된 정정본 자식(F4 잔여)은 표식이 null이라 자동 제외. `correctConfirmedOrder`와 같은 코드 경로(이미 cancelled+표식 있는 원주문을 재조회 분기로 흡수)다.
- 데모 모드 동등 동작: 전역 orders에서 원주문 제거 + `demoCancelledOrders` 배열로 이동(이때 `correctionStartedAt` 기록을 메모리로 동일 재현) + 정정본을 confirmed로 추가. DB와 같은 규칙(혼용 금지·뱃지·이력 토글·재발행 세 조건).
- 완료 후 상태 반영(DB/데모 공통): `setOrders(prev => [정정본, ...prev.filter(o => o.id !== 원주문.id)])` + `setOrderListDate(정정본.date)` + note 뷰 이동(confirmOrder 성공 패턴과 동일).

## 7. 원자성 · 부분 실패 · 재시도 (Supabase 클라이언트는 다중 문장 트랜잭션이 없다)

RPC(단일 트랜잭션 함수)로 묶는 대안이 있으나, 저장소 전체가 "앱 순서 + 조건부 UPDATE + 보상 + DB 가드" 패턴(C3, closeOrderPrices)으로 통일돼 있고 실패 창마다 안전한 복구가 존재하므로 **RPC를 도입하지 않는다**(D7 확정 — §12).

**순서 불변: 취소 → 생성.** 반대 순서(생성 → 취소)는 실패 시 원주문+정정본이 동시에 활성 → 합산표 이중 수량으로 **매입처 초과 발주**, 월합계 매출 중복이라는 조용한 오류를 만든다. 취소 선행의 실패는 "주문이 잠시 안 보임"이라 사용자가 즉시 인지·복구 가능하다. 0012 트리거(원본 cancelled 필수)가 이 순서를 DB에서 강제한다.

| # | 실패 지점 | DB 상태 | 복구 |
|---|---|---|---|
| F1 | 취소 UPDATE 실패(네트워크) | 무변경 | 에러 표시, 화면 초안 유지 → 재시도(같은 버튼) |
| F2 | 취소 0행(경합: 다른 탭이 먼저 취소/정정) | 원주문 cancelled(+먼저 간 쪽이 표식 기록) | 재조회 판별 — **표식 있음+활성 정정본 없음**이면 이어서 진행(멱등 재시도), 활성 정정본 있으면 "이미 정정된 주문" 중단, **표식 null이면 중단**(정정 절차의 취소가 아님) |
| F3 | 취소+표식 성공 → 정정본 orders insert 실패 | 원주문 cancelled + **`correction_started_at` 기록됨**, 정정본 없음 | 화면 초안 유지 → 재시도 시 F2 경로로 이어짐. 이탈해 버리면 이력에서 **표식 덕분에 재발행 가능 행으로 식별**(D3 세 조건 충족) |
| F4 | items insert 실패 | 원주문 cancelled+표식 + **정정본 cancelled(saveOrder 보상, 표식 null)** — corrected_from을 가진 취소 잔여 | 재시도 가능: 부분 유니크가 cancelled를 제외하므로 새 정정본 insert 통과(§5.1). **원주문은 표식+활성 정정본 없음이라 재발행 가능**, 취소된 정정본 자식은 표식 null이라 재발행 대상 아님. 잔여는 이력에 [취소됨]로 표시(정정 실패 흔적 — 허용) |
| F5 | 승격(qc→confirmed) 실패 | 원주문 cancelled + 정정본 **qc**(라인·링크 보존) | 주문 목록에 [가격 대기]+[정정본]으로 노출 → 기존 [가격 마감](R3)으로 완결. 별도 코드 불필요 — 기존 복구 경로에 자연 합류 |
| F6 | 완료 후 새로고침/이탈 | 정상 완료 상태 | loadOrders가 진실 반영(정정본 confirmed, 원주문 미조회) |

동시성: 같은 주문의 동시 정정은 F2(조건부 취소 0행) 또는 부분 유니크 위반으로 한쪽만 성공한다. 앱은 실패 쪽에 새로고침 안내만 하면 된다.

## 8. 화면별 영향도

| 영역 | 영향 | 근거 |
|---|---|---|
| 합산표(aggregate) | **함수 무변경.** 정정 완료 시 전역 orders에서 원주문이 정정본으로 교체되므로 수량이 즉시 새 기준. 과거 날짜 정정이면 그 날짜 합산이 소급 변경(의도) | C5, aggregate.ts에 status 없음 |
| 매입처 발주 문장 | 함수 무변경. 단, 이미 복사·전송한 문장은 자동 회수 불가 → 정정 완료 flash에 "매입처 발주를 이미 보냈다면 변경 내용을 매입처에 알리세요" 1줄 포함 | R5a 문장은 화면 상태(sectionDrafts)라 재생성으로 반영 |
| 월합계(monthly) | 무변경. cancelled는 전역 orders에 없고, 정정본은 confirmed로 포함 → 합계는 항상 정정본 기준 1건만 | page.tsx:1488 필터 |
| 주문 목록 | [정정] 버튼·[정정본] 뱃지·이력 토글 추가(§6.4). 날짜 필터·CSV 로직 무변경(이력은 CSV 미포함 — D8 채택) | C5·C6 |
| 거래명세서(note) | 정정본은 기존 note 뷰로 정상 발행(추가 조건 불필요 — confirmed이므로). 원주문 명세서 재출력은 1차 비제공(이력 행에 인쇄 버튼을 두지 않음). note 양식(A4 15행 마감, W11)은 **무변경** | page.tsx:1989 가드 |
| 가격 마감(priceClose) | 무변경. F5 잔여(qc 정정본)가 기존 화면으로 자연 유입되는 것만 확인 | C3·R3 |
| 대시보드(R4 — `ab94b2a` 병합 확인) | 정정본은 보통 즉시 confirmed라 "가격 대기" 큐에 안 잡힘(F5 잔여만 잡힘 — 올바른 동작). **검수 확인(2026-07-12)**: `dashboard-queue.ts`는 전역 orders 파생 집계이며 confirmed/qc 외(cancelled·미지 상태)를 명시 제외 → R5b 추가 작업 없음, 이력 배열만 대시보드에 넘기지 않으면 됨 | 재설계 §10 · dashboard-queue.ts:59~68 |
| CSV/내보내기 | 주문 CSV는 전역 orders 기준 그대로(정정본 포함, 원주문 제외) | page.tsx:1203~1214 |

## 9. 테스트 계획 (구현 세션 체크리스트)

### 9.1 단위(순수 함수 — `web/src/lib/order-correction.ts` 신설 + order-store)

1. `orderToParsedLines`: 라인 복사(qty/unit/price/rawName), `status:"matched"`, 기본단가 뱃지 미발생(priceSource undefined), 라인 id 신규 부여.
2. `toOrderInsert` opts: correctedFromOrderId 지정 시에만 `corrected_from_order_id` 키 존재(미지정 시 키 자체 부재 — 0012 미적용 호환), `source:'correction'` 반영.
3. `canCorrectOrder`: confirmed=true / qc=false / cancelled는 **세 조건(§6.4: 표식 있음+활성 정정본 없음)** 충족 시에만 재발행 가능 — cancelled+표식null=false(일반 취소), cancelled+표식있음+활성정정본있음=false, cancelled+표식있음+활성정정본없음=true.
4. `correctionSource` 초기화 헬퍼: 새 파싱·화면 이탈 시 정정 컨텍스트가 남지 않는 것(엉뚱한 주문 취소 방지 — §6.1).
5. 전역 orders 교체 헬퍼: 원주문 제거+정정본 삽입, 다른 주문 불변.

### 9.2 통합(mock — order-store.test.ts의 fake 빌더 재사용, C13)

6. `correctConfirmedOrder` 정상: 취소+표식(1행 — **update payload에 `status:'cancelled'`와 `correction_started_at`이 한 문장으로 함께 포함**) → insert(corrected_from·qc) → items → 승격 순서와 payload 검증, 반환값에 `correctedFromOrderId`.
7. 취소 0행 + 재조회 cancelled + **표식 있음** + 활성 정정본 없음 → 진행(F2 재시도·D3 재발행 멱등).
8. 취소 0행 + 활성 정정본 있음 → throw, **orders insert 미발생** 검증.
9. 취소 0행 + 재조회 cancelled + **표식 null**(일반 취소·보상 취소) → throw, **orders insert 미발생**(D6 위반 차단).
10. items 실패 → 정정본 보상 취소 호출 확인(F4 — 보상 update는 **표식 무접촉**) + throw.
11. 승격 실패 → qc 잔여 안내 메시지(F5, saveOrder 기존 동작 회귀).
12. 원주문이 qc → throw(정정 대상 아님).
13. `loadOrders` 반환 계약: (a) 정상 조회 → `{ orders, correctionSchemaReady: true }`, (b) 0012 컬럼 누락 에러 → 기존 컬럼 폴백 조회 성공 시 `{ orders, correctionSchemaReady: false }`. 반환이 **객체(배열 아님)** 임을 검증.
14. `loadCancelledOrders`: status=cancelled 필터·mapDbOrder cancelled 정규화·`correctionStartedAt` 매핑.

### 9.3 DB 가드 실측 (0012 적용 후 사용자 SQL Editor — 0011 H시리즈 형식, begin…rollback 래핑)

| # | 검증 | 기대 |
|---|---|---|
| G1 | 자기 참조 insert | CHECK 위반 |
| G2 | 타 회사 주문을 corrected_from으로 insert | 트리거 예외(cross-company) |
| G3 | confirmed(비취소) 주문을 원본으로 insert | 트리거 예외(취소된 주문만) |
| G4 | 기존 정정본의 corrected_from UPDATE 변경 | 트리거 예외(불변) |
| G5 | 같은 원주문에 활성 정정본 2건째 insert | 유니크 위반 |
| G6 | 취소된 정정본 존재 상태에서 새 정정본 insert | **성공**(부분 유니크 술어 확인) |
| G7 | 0012 재실행 | 에러 없음(멱등) + 기존 행 무변경 |
| G8 | `correction_started_at`을 채운 orders INSERT | 트리거 예외(⑤ⓐ 주입 차단) |
| G9 | confirmed→cancelled 외 시점의 표식 설정 UPDATE(예: confirmed 유지 상태, 이미 cancelled인 행) | 트리거 예외(⑤ⓑ) |
| G10 | 기록된 표식의 값 변경·null화 UPDATE | 트리거 예외(⑤ⓒ 불변) |
| G11 | `status='cancelled'`+표식 기록을 한 문장으로 하는 confirmed 주문 UPDATE(정정의 원주문 취소 경로) | **성공** |
| G12 | **표식 없는 cancelled 주문**(일반 보상 취소)을 corrected_from으로 insert | 트리거 예외(④' — D6 우회 차단) |

### 9.4 브라우저 smoke (데모 모드 별도 포트 → DB 모드는 0012 적용 후 사용자)

1. 확정 주문 → [정정] → 수량 수정 → [정정 확정] → 목록: 원주문 사라짐, 새 주문 [정정본]+명세서 [보기] 가능.
2. 합산표: 정정 전후 해당 품목 수량이 정정본 기준으로만 집계(이중 집계 없음).
3. 월합계: 정정 전후 해당 월 합계 = 정정본 금액만(원주문 금액 소멸).
4. 이력 토글: 원주문 [취소됨·정정됨] + 새 주문 보기 링크. 재발행 버튼은 **D3 세 조건 행에만** 노출(표식 없는 [취소됨] 행에는 절대 없음 — 데모에서 재현이 어려우면 단위 테스트 §9.1-3과 DB 실측으로 대체). (DB 모드) 원문 열람·삭제 동작.
5. qc 주문 행에 [정정] 없음([가격 마감]만).
6. 정정 진입 후 다른 화면 이동→복귀: 정정 컨텍스트 초기화 확인. [수량만 확정] 버튼이 정정 모드에서 숨김.
7. 기존 회귀: 일반 붙여넣기→확정→명세서, 수량만 확정→가격 마감 경로 불변. 390px 넘침 0·콘솔 앱 오류 0.
8. (DB 모드) F5 후 정정 결과 유지, 0012 미적용 상태에서 [정정] 버튼 미노출(폴백).

### 9.5 검증 한 세트(기존 관례)

root `npm test` · web `npm test` · web `npm run build` · web `npm audit --audit-level=low` · `git diff --check`. 시작 시 기존 테스트 수 기록(기준선: web 186/186, 2026-07-11 R5a).

## 10. 구현 파일 목록·순서 (다음 구현 세션)

선행 조건: **W23-R4가 기준 브랜치(`codex/integrate-mvp-docs-web`)에 병합된 최신 상태에서 새 worktree로 시작**(page.tsx 충돌 방지). 0012 번호가 여전히 비어 있는지 확인.

| 순서 | 파일 | 내용 |
|---|---|---|
| 1 | `web/supabase/migrations/0012_order_correction_link.sql` 신설 | §5.4 초안 기반. **적용 금지(Codex 승인+사용자 실행 게이트)** |
| 2 | `docs/guide-apply-0012-order-correction-link.md` 신설 | 적용 절차 + G1~G12 실측 스크립트(guide-apply-0011 형식) |
| 3 | `web/src/lib/order-correction.ts` + `order-correction.test.ts` 신설 | 순수 헬퍼(§9.1) — 실패 테스트 먼저 |
| 4 | `web/src/lib/order-store.ts` + `order-store.test.ts` 수정 | 타입(OrderStatus+cancelled·correctedFromOrderId·correctionStartedAt)·**loadOrders 반환 `{orders, correctionSchemaReady}`로 변경**·ORDER_SELECT 폴백(0012 컬럼 2종)·toOrderInsert/saveOrder opts·correctConfirmedOrder(내부 조건부 취소+표식 단일 UPDATE 포함)·loadCancelledOrders(§6.2~6.3) + mock/반환계약 테스트(§9.2). **단독 cancelOrder는 export하지 않는다(D6 제외)** |
| 5 | `web/src/app/page.tsx` 수정 | **loadOrders 호출부(298행) 구조 분해 + `correctionSchemaReady` 상태 신설**·[정정] 버튼·뱃지·검수표 정정 모드·핸들러·이력 토글(정정 실패 복구 재발행 포함)·데모 동등(§6.1·6.3·6.4). **단독 [취소] 버튼은 만들지 않는다(D6 제외)** |
| 6 | 검증·smoke | §9.4~9.5. DB smoke는 0012 적용 후 사용자 |
| 7 | 문서 | `docs/agent-worklog.md`·`docs/NEXT-SESSION.md`·진행판(JSON→`py -3 scripts/generate-progress.py`) — 구현 세션에서 갱신 |

앱 코드(3~5)는 0012 적용 전에도 배포 가능해야 한다(폴백으로 기능 숨김) — 코드 머지와 DB 적용의 순서 자유도를 확보한다(0007/0009 관례).

## 11. UI 문구 최소 계약

| 지점 | 문구(안) |
|---|---|
| [정정] 진입 confirm | "이 주문을 정정할까요?\n[정정 확정]을 누르면 기존 주문은 취소로 보관되고, 수정한 내용이 새 주문으로 확정됩니다. 확정 전에는 아무것도 바뀌지 않습니다." |
| 정정 모드 배너 | "{거래처} · {날짜} 주문의 정정본 작성 중 — 확정 전에는 기존 주문이 그대로 유지됩니다." |
| 확정 버튼 | "정정 확정(기존 주문 취소)" — 파괴적 행동 시각 구분(화면 명세 §17 원칙) |
| 완료 flash | "정정이 완료되었습니다. 기존 주문은 취소로 보관되고 새 주문이 확정되었습니다. 새 거래명세서를 발행하세요. 매입처 발주를 이미 보냈다면 변경 내용을 매입처에 알려주세요." |
| 경합 실패 | "이미 처리된 주문입니다. 목록을 새로고침해주세요." (기존 문구 패턴 재사용) |

## 12. 확정된 결정 (Codex 반영 — 2026-07-12)

| # | 결정 | Codex 확정 | 근거·구현 함의 |
|---|---|---|---|
| D1 | 0012 데이터 모델(§5: 링크 컬럼+**정정 시작 표식 `correction_started_at`**+자기참조 CHECK+활성 정정본 부분 유니크+별도 가드 트리거) | **채택**(표식은 2026-07-12 D3 강제 보정으로 추가) | 취소 선행·이중 정정 차단·재시도 허용·**복구 재발행의 대상 식별**까지 전부 DB가 보증. additive·backfill 0 |
| D2 | DB 쓰기 시점 | **채택 — [정정 확정] 클릭 시에만 시작**(진입 시 아무것도 쓰지 않음) | 이탈=무해("확정 전 무변경"), 취소 고아 창 최소화. 진입 다이얼로그는 고지 역할만 |
| D3 | cancelled 주문 "정정본 만들기(재발행)" | **채택 — 복구 한정, `correction_started_at`으로 DB 강제** | 정정 절차가 **취소 후 생성 실패**한 경우에만 허용(세 조건 §6.4: cancelled+표식 있음+활성 정정본 없음). 표식 없는 cancelled(일반 보상 취소)는 재발행 불가 — 링크만으로는 F3에서 원주문에 흔적이 없어 이 구분이 불가능했던 것을 표식이 해결. 일반 취소→재발행 기능 아님. `correctConfirmedOrder` 재조회 분기로 흡수(§6.2·6.4) |
| D4 | 정정 중 거래처 변경 | **채택 — 1차 불허** | 단가·검증 전제가 거래처 고정. 거래처 select 비활성(§4) |
| D5 | 정정본 `source='correction'` | **채택** | CHECK 없음(C7)·앱 미소비라 무위험, DB 수준 유래 기록 |
| D6 | 정정 없는 단독 [취소] 버튼(confirmed·qc 공용) | **거절 — 이번 범위 완전 제외** | confirmed·qc 단독 취소 UI를 만들지 않는다. `cancelOrder`를 독립 export하지 않고 `correctConfirmedOrder` 내부 조건부 취소 단계로만 둔다(§6.2). 잘못 들어간 주문 정리는 후속 과제 |
| D7 | RPC(단일 트랜잭션) 미도입 | **채택 — 미도입** | §7 — 기존 조건부 취소·보상·재시도 패턴 유지. 실측에서 부분 실패가 실제 문제가 되면 재검토 |
| D8 | 이력 CSV 포함·원주문 명세서 재출력·명세서 "정정 재발행" 표기 | **채택 — 전부 1차 제외** | 범위 최소화. note 인쇄 양식(W11 마감)은 R5b 무접촉 |

## 13. 비범위 (기준서 §3·작업 지시 재확인)

세금/과세구분(W24), 품목 자체코드 app_code(W24), 다단위(Phase 3), OCR(R8), 기본 매입처 저장(R5a 잔여), 매입가 이력, 정정 사유 입력란, **단독 [취소] 버튼(D6 거절 — confirmed/qc 단독 취소 UI 없음)**, 취소 주문 복원(un-cancel — 0011 종결 원칙 유지, D3 재발행은 취소 후 생성 실패 복구만). W23-R4 대시보드 파일·문서와 충돌하는 변경 금지.

## 14. 자체 검토 기록

- **Codex 결정 D1~D8 반영 완료(§12)**: D1·D2·D4·D5·D7·D8 채택, D3 복구 한정 채택, **D6 거절 → 단독 취소 관련 문구·함수 계약·테스트·UI를 전부 제거**. `cancelOrder`는 `correctConfirmedOrder` 내부 조건부 취소 단계로 좁힘(별도 export·[취소] 버튼 없음, §6.2).
- **불변 원칙 재대조**: (스냅샷) 원주문·정정본의 `unit_price`는 스냅샷 불변 — 라인 편집은 정정본에서만 일어나고 원주문 라인은 0010/0011로 동결(§4·§5.3). (가격 대기 격리) 정정은 confirmed 전용, qc는 기존 [가격 마감]만 — 두 상태를 섞지 않음(§0·§3). (raw_text) 원문은 원주문 imports에 잔류, 취소 후에도 삭제 가능(§4·C11). 세 원칙이 서로 모순 없음을 확인.
- **`loadOrders` 반환 계약 확정(§6.3)**: `Promise<{ orders, correctionSchemaReady }>`. 호출부는 page.tsx:298 단 1곳·기존 테스트 없음(grep 확인) → 파급 최소. `correctionSchemaReady=false`면 정정 UI 전부 숨김.
- **D3 복구 식별 보정(2026-07-12 2차)**: 링크(정정본→원주문)만으로는 F3(취소 후 생성 실패)의 원주문과 일반 보상 취소를 구분할 수 없어 "cancelled+활성 정정본 없음" 조건이 사실상 일반 재발행(D6 위반)이 되는 구멍을 확인 → `correction_started_at` 표식으로 봉합. 표식 쓰기 규칙(ⓐⓑⓒ)·재발행 세 조건·F2~F4·G8~G11·correctConfirmedOrder 분기·데모 재현까지 한 계약으로 정렬했고, 취소된 정정본 자식(표식 null)이 재발행 대상에서 자동 제외됨을 교차 확인.
- **종료 전 디버깅 검수(2026-07-12 3차, 기준 `ab94b2a` 대조)**: ① R4 병합 확인 — order-store.ts·0010/0011 무변경, 0012 번호 비어 있음, loadOrders 호출부 여전히 1곳(행만 298→302 이동) ② R4 신규 status 소비처 2파일(dashboard-queue·order-list-filter)을 §6.3에 반영, R4 상태 필터에 cancelled를 태우는 오구현 경로를 §6.4에서 명시 차단 ③ **트리거 보강(④')**: 원본 검사에 `correction_started_at not null` 추가 — 표식 없는 일반 보상 취소를 원본으로 한 INSERT가 DB를 통과하던 공백을 닫아 D3 복구 한정을 앱+DB 양쪽에서 강제(G12 신설) ④ 0010/0011과 0012 트리거는 모두 BEFORE·raise-or-pass라 발화 순서 무관 확인.
- 정정 절차의 모든 DB 전이를 0010/0011 허용 목록과 대조(§5.3) — 우회·모순 없음(취소+표식 단일 UPDATE는 `before update of status` 전이 가드와 0012 트리거 ⑤ⓑ를 모두 통과). 실패 F1~F6 전부 복구 경로 존재(§7), F4 잔여가 부분 유니크와 정합(§5.1).
- 파일 경로·행 번호는 2026-07-12 `877f948` 워크트리 실측(§1). R4 머지 후 이동할 수 있으므로 구현 세션은 심볼 기준으로 재탐색. SQL은 §5.4 참고 초안이며 이 세션은 마이그레이션 파일을 만들지 않는다.
- 남은 열린 항목 없음. TODO/미정 표기 없음.
