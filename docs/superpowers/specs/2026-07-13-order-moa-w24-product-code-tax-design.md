# 오더모아 W24 품목코드·과세구분 — 구현 준비 설계

작성일: 2026-07-13 · 작성 주체: Claude (설계만 — 앱 코드/SQL/Supabase 무접촉)
기준 커밋: `8689dcd` (branch `codex/integrate-mvp-docs-web`) · 작업 브랜치: `claude/w24-product-code-tax-design`
상위 기준: `docs/superpowers/specs/2026-07-11-order-moa-operations-ux-tax-design.md` §5(품목코드)·§6(과세구분) · `docs/order-moa-system-redesign-2026-07-11.md` §6 · `docs/order-moa-expanded-roadmap.md`
상태: **설계 초안 — Codex 승인 게이트 전 구현 착수 금지.** 이 문서는 어떤 마이그레이션·코드도 승인하지 않는다. 세금 법률 판단·임의 과세 분류를 만들지 않는다.

---

## 0. 고정 원칙 (작업 지시 재확인 — 불변 조건)

- 이미 확정된 주문의 품목·수량·판매단가 스냅샷을 수정하지 않는다(0010/0011 가드 유지).
- 기존 주문 라인에는 과세구분이 없으므로 backfill 의미를 임의로 추정하지 않는다(**과거 order_items.tax_type_snapshot은 NULL 유지**, backfill 금지, 과거 명세서 형식 유지). 신규 라인만 실제 값(taxable/exempt/unset)을 저장한다(§6.1).
- raw_text 삭제 가능 원칙 유지 · quantity_confirmed(가격 대기)와 confirmed(최종 확정)를 섞지 않는다.
- R5b 정정 원주문↔정정본 연결(`corrected_from_order_id`·`correction_started_at`)을 깨지 않는다.
- 세금계산서 직접 발행은 이번 범위가 아니다(표시 규칙까지만). 다단위·재고·OCR·이카운트 연동을 끼워 넣지 않는다.
- 모든 DB 객체 `ordermoa_` 접두사 · Supabase 직접 변경 금지 · `web/.env.local` 무접촉.

## 1. 확인된 현재 사실 (2026-07-13, 코드·마이그레이션 실측)

| # | 사실 | 위치 | W24에 주는 의미 |
|---|---|---|---|
| C1 | **`ordermoa_products.tax_type text NOT NULL DEFAULT 'taxable' CHECK (in 'taxable','exempt')` 컬럼이 이미 존재** | 0001:50 | 과세구분 컬럼은 새로 만들 필요 없을 수 있음. 단 값이 **2종·기본 taxable**이라 W24의 3종(과세/면세/미설정)과 불일치(§4) |
| C2 | **그 tax_type은 앱에서 완전 휴면** — `web/src` 전체에서 read/write 0건. `Product` 타입에 taxType 없음, `PRODUCT_COLS`·`toProductInsert/Update`·`mapProduct` 모두 제외 | domain/types.ts, product-store.ts (grep 0건) | 전 품목이 스키마 기본값 'taxable'을 들고 있으나 **사용자가 정한 값이 아님**(무의미). 재활용 시 backfill 정당성의 근거(§4.2) |
| C3 | 외부코드 `source_code text` nullable + 부분 유니크 `(company_id, source_code) where not null`. import 멱등 매칭 전용, "UX 중심 키 아님" 명시 | 0008 | app_code(내부코드)와 **다른 컬럼·다른 목적·다른 유니크**. 충돌 없음(§5). app_code 발급 모델의 부분 유니크 선례 |
| C4 | 품목 PK=uuid. `app_code` 없음. 카탈로그 import는 200배치 insert(`applyCatalogImportToDb`), source_code로 멱등 | product-store.ts:349~452 | app_code는 insert 트리거로 발급하면 import 배치도 자동 채번(§5.3). 앱 max+1 금지(동시성) |
| C5 | order_items insert = `company_id,order_id,product_id,raw_name,quantity,unit,unit_price`. **amount는 generated**(insert 제외). tax 없음 | order-store.ts:81~90 (toItemInserts) | `tax_type_snapshot`은 신규 컬럼. insert payload에 추가 필요(generated 아님) |
| C6 | `OrderLine`/`DraftLine`/`ORDER_SELECT`/`ORDER_SELECT_WITH_CORRECTION`/`mapDbOrder` 어디에도 tax 필드 없음 | order-store.ts:20~53·118~143·489~492 | 스냅샷을 UI까지 나르려면 이 체인 전체에 taxType 추가(§6.2 impl 목록) |
| C7 | 0011 스냅샷 동결 가드 검사 컬럼 = `unit_price·quantity·product_id·unit·order_id`. tax_type_snapshot 미포함 | 0011:95~101 | 신규 컬럼은 기본적으로 동결 대상 아님 → W24가 가드를 create-or-replace로 확장할지 결정(§7·D4) |
| C8 | R5b 정정 = `orderToParsedLines(원주문)` → 검수표 → `saveOrder(..., correction)`. 라인은 product_id/quantity/unit/unitPrice 복사 | order-store.ts(correctConfirmedOrder), order-correction.ts | 정정본 라인의 tax_type_snapshot 복사 규칙 필요(§6.4·D5) |
| C9 | 거래명세서(page.tsx)는 **"공급가 합계 (부가세 없음)" / "VAT 미적용" 하드코딩**. 라인 컬럼=공급가액, tfoot=공급가 합계 1줄 | page.tsx:2926·2937·2963~2974 | 혼합 과세 표시는 이 블록을 조건부로 확장. 과거(전부 NULL) 주문은 현 형식 그대로 유지(§8) |
| C10 | 월합계=`order.total`(Σamount) 스냅샷만. 합산표=수량만. 둘 다 순수 함수, 단가·세금 로직 없음 | monthly-summary.ts, aggregate.ts | **VAT를 저장 금액에 넣지 않으면**(공급가만 저장) 월합계·합산표 무영향(§8·§6.3) |
| C11 | 컬럼 폴백 하우스 패턴 `isMissingColumnError` + `selectProductsWithFallback` 3단(FULL→CAT→BASE) | product-store.ts:104~187 | tax_type/app_code 컬럼도 미적용 DB에서 안 깨지게 4단 폴백 추가(§6.2) |
| C12 | 마이그레이션 최신=0012(적용 완료). 0013 이후 비어 있음 | web/supabase/migrations/ | W24 = **0013(app_code) + 0014(tax)** 권장(§9). 구현 세션에서 번호 재확인 |
| C13 | security definer 헬퍼 선례(`ordermoa_is_company_member`, `set search_path=public`) | 0002:7~23 | app_code 채번 함수를 SECURITY DEFINER로 두어 카운터 RLS 우회 안전(§5.3) |
| C14 | 실 카탈로그 import 원본 = `품목마스터.xlsx`+`단가마스터.xlsx`(repo 밖). 과세구분 컬럼 유무 미확인 | order-moa-catalog-real-draft 관련 | 이카운트 export의 과세구분 컬럼명·값·가격 VAT포함여부를 **사용자 확인 선행**(§11·§13) |

## 2. 설계 요약 (권장안 한눈에)

| 결정 | 권장안 |
|---|---|
| 내부 품목코드 | `ordermoa_products.app_code text` — **회사별 순번 `OM-000001`**, 카운터 테이블(next_value=last issued) + SECURITY DEFINER 발급 함수 + BEFORE INSERT OR UPDATE 트리거(자동 채번·**명시 주입 차단**·**UPDATE 변경 차단**, backfill NULL→값만 허용), backfill 후 NOT NULL + `unique(company_id, app_code)` |
| source_code 관계 | **완전 분리** — app_code(내부·항상 존재·NOT NULL) vs source_code(외부·nullable). 다른 컬럼, 섞지 않음 |
| 과세구분 저장 | products.tax_type을 **재활용**(3종 `taxable/exempt/unset`으로 확장, 기본 unset) + **휴면 'taxable'→'unset' 표식 가드 1회 backfill**(C2 근거·§4.2). order_items에 **`tax_type_snapshot` 신규 컬럼**(nullable, `taxable/exempt/unset/null`). **과거=NULL, 신규 미설정='unset'**(§6.1) |
| 스냅샷 시점 | order_items INSERT 시점(qc 저장 시) product.tax_type에서 캡처 → 확정 시 동결. 가격 마감(qc→confirmed)은 unit_price만 갱신, tax 스냅샷 불변 |
| 과거 주문 | order_items.tax_type_snapshot **NULL 유지**(backfill 금지). 전부 NULL이면 명세서는 현 "VAT 미적용" 형식 그대로(§8) |
| 정정본 | 원주문 라인의 tax_type_snapshot **복사**(unit_price 복사와 일관, D5) |
| 명세서 | 전부 NULL이면 현 형식. 스냅샷 있으면 면세공급가/과세공급가/부가세/합계 + 라인 과세·면세 표시. 미설정 섞이면 세무형 인쇄 차단·안내 |
| 금액 불변 | 저장 금액(unit_price·amount·order.total)은 **VAT 제외 공급가** 유지. **VAT는 명세서 표시 계산 전용**(저장 안 함) → 월합계·합산표·CSV 무영향 |

## 3. 현재 데이터 모델 조사 결과 (품목·주문·정정)

- **품목**: `ordermoa_products(id uuid, company_id, name, base_unit, tax_type[휴면], base_purchase_price, base_sale_price, category, source_code, purchase_supplier_id, archived_at, created_at)`. 앱이 쓰는 컬럼은 tax_type을 제외한 전부. 보관=soft(archived_at), 삭제 경로 없음.
- **주문/라인**: `ordermoa_orders(status: draft/quantity_confirmed/confirmed/cancelled, corrected_from_order_id, correction_started_at)` + `ordermoa_order_items(product_id NOT NULL, quantity, unit, unit_price[스냅샷], amount[generated=round(qty*price)])`. 확정 라인만 저장, 스냅샷 불변(0010/0011 가드).
- **정정(R5b)**: 원주문 confirmed→cancelled(+표식) 후 새 confirmed 주문 생성, corrected_from_order_id로 연결. 라인은 원주문 스냅샷 복사.
- **표시 경로**: 명세서=confirmed만·공급가 하드코딩. 월합계=confirmed·order.total. 합산표=confirmed+qc·수량. 셋 다 tax 무관.

## 4. 과세구분 저장 모델

### 4.1 값 인코딩

- 저장값(stable token, 영문): **`taxable`(과세) · `exempt`(면세) · `unset`(미설정)**. UI 라벨만 한글(과세/면세/미설정).
- 기존 tax_type이 이미 영문 `taxable/exempt`을 쓰므로 **같은 컬럼을 3종으로 확장**하면 인코딩이 일관된다(신규 컬럼보다 정합).
- `unset`은 "현재 자료에 없어 사람이 아직 정하지 않음". 재설계 §6.1의 "임의 추정 금지"를 값으로 강제한다.

### 4.2 products.tax_type 재활용 vs 신규 컬럼 (핵심 열린 결정 D2)

| 안 | 내용 | 장점 | 단점 |
|---|---|---|---|
| **A. 재활용(권장)** | CHECK를 `('taxable','exempt','unset')`로 확장, DEFAULT를 `'unset'`로, **기존 'taxable'→'unset' 1회 backfill** | 컬럼 1개로 통일, 인코딩 일관, 휴면 컬럼 정리 | 데이터 backfill 1회 발생(W24 유일) — 정당성 필요 |
| B. 신규 컬럼 | `tax_category text` nullable 신규, tax_type은 휴면 방치 | backfill 0 | 세금 컬럼 2개(혼란), 휴면 컬럼 영구 잔존 |

**권장 A의 backfill 정당성**: C2로 tax_type은 **앱이 한 번도 쓴 적 없는 스키마 기본값**임이 실측(web/src 참조 0건). 전 품목의 'taxable'은 사용자가 정한 과세 판단이 아니라 0001 DEFAULT의 부산물이다. 이를 'unset'으로 바꾸는 것은 **정보의 임의 추정이 아니라 무의미한 기본값의 정정**이다(기존 'taxable'을 그대로 두면 오히려 735품목을 사용자 확인 없이 "과세"로 오표기 = 추정 금지 위반). → backfill을 권장하되 **Codex 승인 항목**으로 명시(§12 D2). 보수적으로 가려면 B.

### 4.2b backfill 재실행 안전 계약 (표식 가드 — Codex 검수 보정 2026-07-13)

`update ... where tax_type='taxable'`만으로는 재실행 안전하지 않다. 사용자가 나중에 **의도적으로 taxable로 정한** 품목까지 0014 재실행이 unset으로 덮어버린다("legacy 기본값 taxable"과 "사용자가 고른 taxable"을 값만으로 구분 불가). → **1회 완료 표식**으로 backfill을 잠근다.

- 0014 안에 `ordermoa_` 접두사의 **완료 표식 구조**를 둔다(예: `ordermoa_migration_flags(flag text primary key, applied_at timestamptz default now())` 같은 1행 잠금 테이블, 또는 `ordermoa_products` 컬럼 코멘트/전용 flag row).
- backfill은 **같은 트랜잭션**에서 다음 순서로만 실행한다:
  1. 표식(`w24_tax_type_backfill` 등)이 **없을 때만** `update ordermoa_products set tax_type='unset' where tax_type='taxable'`.
  2. 성공하면 같은 트랜잭션에서 표식을 기록(`insert ... on conflict do nothing`).
- 재실행: 표식이 이미 있으므로 backfill을 **건너뛴다**(사용자가 이후 고른 taxable 보존).
- 최초 적용이 실패/rollback되면 표식도 함께 rollback → 남지 않아 **재시도 가능**(원자성). 표식과 backfill이 한 트랜잭션이라 "표식만 남고 backfill 누락"이 불가능.
- 컬럼 구조(CHECK 3종 확장·DEFAULT unset·컬럼 추가)는 표식과 무관하게 idempotent(`drop constraint if exists→add`, `alter default`, `add column if not exists`). 표식 가드는 **데이터 backfill 한 문장에만** 적용된다.
- 가이드(guide-apply-0014)와 GB3/GB6은 이 계약을 실측한다: 표식 없는 최초 적용=backfill 발생, 표식 있는 재실행=backfill 0행이되 컬럼/CHECK는 그대로.

> 대안(보수적, D2 B안): products.tax_type을 방치하고 신규 `tax_category` 컬럼(default unset, backfill 자체가 없음)을 쓰면 이 표식 구조가 불필요하다. 재활용(A)을 택할 때만 표식 가드가 필요하다.

### 4.3 품목 기본값과 주문 라인 스냅샷의 관계

- `products.tax_type` = 품목 **기본 과세구분**(마스터 속성, 언제든 수정 가능). category와 같은 성격.
- `order_items.tax_type_snapshot` = 라인 저장 시점에 품목 기본값을 **복제한 스냅샷**(이후 품목 기본값을 바꿔도 과거 라인 불변). unit_price 스냅샷과 동일 철학.
- 관계: 라인 생성(qc 저장 또는 경로 A) 시 `tax_type_snapshot := product.tax_type`. 품목이 'unset'이면 스냅샷도 **'unset'**(신규 라인은 실제 값을 저장 — 과거 NULL과 구분, §6.1 D9).

### 4.4 스냅샷 시점 (qc / confirmed)

- **경로 A(가격 포함 바로 확정)**: saveOrder가 qc로 라인 insert(이때 tax_type_snapshot 캡처) → confirmed 승격. 확정 시 동결.
- **경로 B(수량 먼저·가격 나중)**: qc 저장 시 라인 insert(이때 tax_type_snapshot 캡처). 가격 마감(closeOrderPrices)은 **unit_price만 UPDATE**, tax_type_snapshot 불변. → 과세구분 스냅샷은 "수량 확인(qc) 시점" 기준. product_id·unit·quantity가 이미 그 시점에 캡처되는 것과 일관(C5).
- 근거: order_items INSERT는 항상 qc 상태에서 일어나므로(0011 가드·saveOrder 구조 C4/C8) tax_type_snapshot을 insert payload에 넣으면 두 경로 모두 자연히 캡처된다. 별도 시점 로직 불필요.

## 5. 내부 품목코드 app_code

### 5.1 컬럼·형식·정책

| 속성 | 결정 | 근거 |
|---|---|---|
| 컬럼 | `ordermoa_products.app_code text` | 품목 1건의 식별 코드 |
| 형식 | `OM-` + 6자리 zero-pad 순번 = `'OM-'||lpad(seq::text,6,'0')` (`OM-000001`) | 설계서 §5.2 고정 |
| 유일성 | **회사 안에서 유일** `unique(company_id, app_code)` | 회사별 독립 순번 |
| null 여부 | backfill 후 **NOT NULL**(모든 품목이 항상 보유) | 설계서 §5.1 "새 품목도 반드시 받는다" |
| 발급 | **카운터 테이블 + SECURITY DEFINER 함수 + BEFORE INSERT 트리거가 자동 채번** — 앱 max+1 금지 | 동시성 원자성(C4·C13) |
| 명시 주입 | **일반 INSERT에서 app_code 직접 지정 차단**(트리거: INSERT 시 NEW.app_code가 not null이면 raise) — 트리거만 발급 | 코드 무결성(Codex 보정) |
| 수정(UPDATE) | **DB에서 app_code 변경 차단**(트리거: OLD.app_code not null이고 값이 바뀌면 raise). 단 **NULL→값 backfill은 허용**(OLD가 null) → 마이그레이션 내부 backfill만 통과 | 발급값 고정, backfill 공존 |
| 순번 gap | 허용(롤백·삭제로 생길 수 있음) — 코드는 안정 식별자지 연속 보장 아님 | 실무 무해 |
| 보관/삭제 | archived_at soft만 존재 → app_code는 보관돼도 유지, **재사용 안 함**(카운터는 증가만) | C4, 코드 안정성 |
| source_code | app_code와 별개(외부 import 키). source_code만 import에서 갱신, app_code는 불변 | 설계서 §5.2·§5.3 |

### 5.2 발급 메커니즘 (0013 초안 방향)

**카운터 의미 통일(Codex 보정)**: `next_value` = **마지막으로 발급한 값(last issued)**. 발급 함수는 카운터를 +1 한 뒤 **그 증가된 값을 반환**(= 이번에 쓸 번호). 따라서 backfill 뒤 카운터는 `max(부여번호)`(= 마지막 발급값)로 맞춰야 다음 신규 품목이 `max+1`을 받는다. (max+1로 세팅하면 한 번호를 건너뛴다 — 이전 초안의 버그를 정정.)

- **카운터 테이블** `ordermoa_product_code_counters(company_id uuid primary key references ordermoa_companies(id) on delete cascade, next_value bigint not null default 0)`. `default 0` = 아직 아무것도 발급 안 됨(첫 발급이 1).
- **발급 함수** `ordermoa_next_product_code(cid uuid) returns text` — `language plpgsql security definer set search_path=public`:
  - `insert into ordermoa_product_code_counters(company_id,next_value) values(cid,1) on conflict (company_id) do update set next_value = ordermoa_product_code_counters.next_value + 1 returning next_value` → 반환값 v(=이번에 쓸 번호, 첫 회사=1)로 `'OM-'||lpad(v::text,6,'0')`. **UPSERT+RETURNING이 카운터 행을 원자적으로 잠가** 동시 insert가 직렬화(중복 불가). 반환 v = 발급 후의 last issued이자 이번 번호(둘이 같음).
  - SECURITY DEFINER라 카운터 RLS와 무관하게 함수가 읽고 쓴다(C13). 회사 경계는 트리거가 NEW.company_id를 넘겨 보장.
- **트리거** `before insert or update on ordermoa_products`(발급+무결성 한 함수):
  - INSERT: `if NEW.app_code is not null then raise exception '...app_code는 직접 지정할 수 없습니다'; end if; NEW.app_code := ordermoa_next_product_code(NEW.company_id);` → 명시 주입 차단 + 자동 채번.
  - UPDATE: `if OLD.app_code is not null and NEW.app_code is distinct from OLD.app_code then raise exception '...app_code는 변경할 수 없습니다'; end if;` → 발급값 불변. **OLD가 null인 경우(=backfill의 NULL→값)는 통과**하므로 마이그레이션 backfill과 공존.
- **backfill**(마이그레이션 내 1회, idempotent): 회사별로 `app_code is null`인 기존 품목을 **안정 순서(created_at, id)** 로 1..N 부여(UPDATE — 위 UPDATE 분기가 OLD null이라 통과). 부여 후 각 회사 카운터를 `next_value = N`(= **max(부여번호), 마지막 발급값**)으로 upsert. `app_code is null` 조건이라 재실행 시 0행(멱등). 앱 채번 경로(트리거)와 backfill이 **같은 last-issued 의미**를 공유 → 다음 신규 품목 = N+1 연속(GA7 검증).
- backfill 후 `alter column app_code set not null` + `create unique index if not exists ordermoa_uq_products_app_code on ordermoa_products(company_id, app_code)`.

### 5.3 source_code와의 관계·충돌 방지

| 필드 | 존재 | null | 유일성 | 목적 | 발급 |
|---|---|---|---|---|---|
| `app_code` | 항상 | NOT NULL | `(company_id, app_code)` | 오더모아 내부 식별·검색·표시 | DB 트리거 자동 |
| `source_code` | 선택 | nullable | `(company_id, source_code) where not null` | 이카운트 import 멱등 대조 | import가 세팅 |

- **다른 컬럼·다른 목적** → 충돌 없음. 카탈로그 import 배치 insert(C4)는 source_code를 넣고, app_code는 트리거가 각 행에 자동 채번(200행 배치 → 트리거 200회, 카운터 직렬화, 한 트랜잭션 내 순번 연속).
- 화면·CSV에서 두 코드를 **구분 표시·검색**(설계서 §5.2): app_code=항상, source_code=있으면.

## 6. 앱 영향·구현 계층

### 6.1 인코딩 결정 (order_items.tax_type_snapshot — 과거 NULL / 신규 미설정 'unset', D9 보정)

**Codex 검수 보정(2026-07-13)**: 과거 NULL과 신규 미설정을 NULL로 통일하던 이전안을 **취소**한다. 둘을 구분해야 "과거 주문(정보 없음)"과 "신규 주문에서 사람이 아직 과세구분을 안 정함"이 명세서에서 다르게 처리된다.

- `order_items.tax_type_snapshot text` **nullable**, `CHECK (tax_type_snapshot is null or tax_type_snapshot in ('taxable','exempt','unset'))`.
- **과거 주문 = NULL 유지**(W24 이전 라인, backfill 금지 §0). **신규 주문 = 항상 실제 값 저장** — 라인 생성 시 `tax_type_snapshot := product.tax_type`이며 품목이 미설정이면 **'unset'**을 저장한다(NULL로 내리지 않는다).
- 세 갈래가 명세서 분기(§8)와 1:1 대응한다:

| 라인 집합 | 의미 | 명세서 |
|---|---|---|
| **전부 NULL** | 과거 주문(W24 이전) | 현 "VAT 미적용" 형식 그대로(회귀 100%) |
| **한 줄이라도 'unset'** | 신규인데 과세구분 미설정 잔여 | **세무형 차단·안내**("과세구분 미설정 품목이 있어 세무형 명세서를 만들 수 없습니다") + 현 형식 |
| **taxable/exempt만**(unset·NULL 없음) | 과세구분 확정된 신규 | 세무형: 면세공급가/과세공급가/부가세/합계 + 라인 과세·면세 표시 |

- 근거: NULL로 통일하면 "과거 주문"과 "신규 미설정"이 같은 값이 되어, 신규 주문에서 사용자가 과세구분을 채우도록 유도하는 안내(§8·D6)를 발동할 수 없다. 'unset'을 실제 저장해야 신규 주문의 미완료를 명세서·검수에서 식별할 수 있다.

### 6.2 구현 파일·계약 (구현 세션 작업)

| 파일 | 변경 |
|---|---|
| `web/src/lib/domain/types.ts` | `Product`에 `appCode?: string \| null`·`taxType?: 'taxable'\|'exempt'\|'unset'` 추가. `OrderLine`에 `taxTypeSnapshot?: 'taxable'\|'exempt'\|'unset'\|null` 추가(과거=null, 신규='unset' 포함) |
| `web/src/lib/product-store.ts` | `PRODUCT_COLS`에 `app_code,tax_type` 추가 + **폴백 확장**(app_code/tax_type 누락 DB 대비 `isMissingColumnError` 단계 추가). `toProductInsert/Update`에 tax_type(app_code는 트리거 발급이라 insert 제외). `mapProduct`에 appCode/taxType. **catalog import insert에 tax_type**(있을 때만, §6.3)·app_code는 자동 |
| `web/src/lib/order-store.ts` | `toItemInserts`에 `tax_type_snapshot`(product.tax_type 유래 — 신규 라인은 'unset'까지 실제 저장, 절대 NULL로 내리지 않음) 추가. `ORDER_SELECT*`에 `tax_type_snapshot`. `mapDbOrder`가 taxTypeSnapshot 매핑(null 그대로). **폴백**: tax_type_snapshot 누락 DB면 컬럼 뺀 select 재시도(`correctionSchemaReady`류 `taxSchemaReady` 플래그로 명세서 세무형 표시 게이팅) |
| `web/src/lib/order-correction.ts` | `orderToParsedLines`가 원주문 라인 taxTypeSnapshot을 정정본 초깃값으로 전달(D5 복사) |
| 신규 `web/src/lib/tax.ts` | **순수 함수** `computeStatementTax(lines)`: 면세공급가=Σ(exempt amount), 과세공급가=Σ(taxable amount), 부가세=round(과세공급가×0.10), 합계=면세+과세+부가세. 반환에 **`mode`**(`legacy`=전부 NULL / `unset`=하나라도 'unset' / `taxed`=taxable·exempt만) → 명세서 3갈래 분기(§6.1) |
| `web/src/app/page.tsx` 명세서 블록 | `mode==='legacy'`(전부 NULL) 현 형식. `mode==='unset'`(신규 미설정 섞임) 세무형 대신 안내 + 현 형식. `mode==='taxed'` 라인 과세/면세 표시 + tfoot 면세공급가/과세공급가/부가세/합계(§6.1·§8·D6) |
| `web/src/app/product-management-view.tsx` | 과세구분 select(과세/면세/미설정) + app_code 표시·검색. 카테고리 UI 옆 |
| CSV(page.tsx exportProductsCsv) | 품목 CSV에 `app_code`·`과세구분` 열 추가. **주문 CSV·합산표·월합계는 무변경**(D8) |

### 6.3 이카운트 import 경계 (재확인)

- 친구 품목마스터에 **과세구분(또는 동등) 컬럼이 있을 때만** 화이트리스트로 읽어 tax_type 후보(§11에서 사용자 확인). 없으면 전부 'unset'.
- 고객명·매입처명·전화·주소·사업자번호는 import 범위 밖(기존 원칙).
- `base_sale_price`의 VAT 포함/제외는 **자동 변환 금지** — 사용자가 이카운트 가격 기준을 한 번 확인한 뒤에만 별도 보정(§11·D는 아님, 사용자 정보 항목).

## 7. RLS·회사 경계·트리거·스냅샷 가드 충돌 검토

- **RLS 무변경(products/order_items)**: 컬럼 추가는 행 단위(company_id) 정책에 영향 없음(0006~0009 선례).
- **카운터 테이블 RLS**: 신규 테이블 → RLS enable + 정책 필요 여부 결정. 권장: **RLS enable + company member 4정책**(다른 테이블과 동형) **그리고** 발급 함수는 SECURITY DEFINER(정책과 무관하게 동작, 이중 안전). 최소안: 함수만 SECURITY DEFINER, 카운터는 앱이 직접 접근 안 하므로 RLS enable + 정책 없음(트리거 경로만) — **권장은 정책도 추가**(대시보드/디버깅 조회 대비).
- **교차회사**: 트리거가 NEW.company_id로만 채번 → 코드가 남의 회사로 새지 않음. 카운터 FK(company_id→companies, on delete cascade)로 회사 삭제 시 정리.
- **0010/0011 동결 가드 vs tax_type_snapshot(D4)**: 0011 검사 컬럼에 tax_type_snapshot이 없어(C7) 확정 주문의 스냅샷 tax를 이론상 UPDATE할 수 있다(앱엔 그 경로 없음). **권장: W24 마이그레이션이 0011 동결 함수를 create-or-replace로 상위집합 확장**(기존 검사 전부 보존 + `tax_type_snapshot is distinct from` 추가). 0011이 0010을 상위집합으로 대체한 선례와 동형. 앱이 안 건드려도 스냅샷 불변을 DB로 강제. → 열린 결정 D4(확장 권장 vs 미확장).
  - 주의: 함수 교체 시 **정정 절차·가격 마감이 쓰는 전이가 여전히 통과**하는지 재확인(가격 마감은 unit_price만 UPDATE→tax 스냅샷 무변경→통과. 정정본 insert는 qc라 통과). 0012의 correction 트리거와는 별개 함수라 상호 무영향.

## 8. 명세서·월합계·합산표·CSV 영향도

| 영역 | 영향 | 근거 |
|---|---|---|
| 거래명세서(note) | **전부 NULL(과거 주문)** → 현 "공급가 합계(부가세 없음)/VAT 미적용" 형식 그대로(회귀 100%). **한 줄이라도 'unset'(신규 미설정)** → 세무형 합계를 추정하지 않고 "과세구분 미설정 품목이 있어 세무형 명세서를 만들 수 없습니다" 안내 후 현 형식 유지. **taxable/exempt만** → 라인 과세/면세 표시 + 면세공급가/과세공급가/부가세/합계 | C9, 재설계 §6.2, §6.1 D9 |
| 월합계(monthly) | **무변경**. 저장 금액(order.total=Σ공급가 amount)은 VAT 제외 공급가 그대로. VAT는 명세서 표시 계산 전용(저장 안 함) → 월 매출 합계 불변 | C10, §2 금액 불변 |
| 합산표(aggregate) | **무변경**(수량 기반, 세금 무관) | C10 |
| 주문 목록/CSV | 주문 CSV·목록 **무변경**(D8). 품목 CSV·품목 관리에만 app_code·과세구분 추가 | §6.2 |
| 정정(R5b) | 정정본 명세서는 새 주문 기준(§6.4). 원주문 명세서는 그대로(불변) | C8 |
| 가격 마감/qc 격리 | 무변경 — tax 스냅샷은 qc insert 시 캡처, 마감은 unit_price만. qc·confirmed 혼용 없음 | §4.4 |

**혼합 과세 표시 원칙과 세금계산서 경계**: 명세서는 면세공급가/과세공급가/부가세/합계를 **업무 표시**로 보여줄 뿐, 세금계산서를 발행·신고하지 않는다. 화면에 "세금계산서 아님, 세무 처리는 전문가 확인" 문구 유지. 부가세 계산식은 과세 공급가 총합에 10%를 한 번 적용(라인별 반올림 누적 아님) — 국세청 일반 매출세액 방식과 정합(재설계 §6.1).

## 6.4 정정본 과세구분 복사 (R5b 연계)

- 정정본 라인의 tax_type_snapshot = **원주문 라인의 tax_type_snapshot 복사**(D5 권장). 근거: 정정은 unit_price 스냅샷도 복사하므로 tax 분류도 원주문 시점을 보존하는 것이 일관.
- 대안: 정정 시점 product.tax_type 재유도(사용자가 그새 미설정→과세를 고친 경우 반영). 권장은 **복사**(조용한 재분류 방지), 필요 시 사용자가 품목 기본값을 고친 뒤 새 주문으로 처리.
- 구현: `orderToParsedLines`가 taxTypeSnapshot을 ParsedLine 초깃값으로 전달 → 검수표 → 정정본 라인 insert에 그대로. R5b의 product_id/unit/price 복사 체인에 tax 한 줄 추가.

## 9. 마이그레이션 번호·순서·idempotent 방향

권장: **2개로 분리**(각각 독립 검수·적용·테스트 — 프로젝트 관행).

| 번호 | 파일 | 내용 | idempotent |
|---|---|---|---|
| **0013** | `0013_product_app_code.sql` | app_code 컬럼 + 카운터 테이블(next_value=last issued, +RLS) + 발급 함수(SECURITY DEFINER) + **BEFORE INSERT OR UPDATE 트리거**(채번·명시 주입 차단·변경 차단, backfill NULL→값 허용) + backfill(카운터=max) + NOT NULL + unique | `add column if not exists`·`create table if not exists`·`create or replace function`·`drop/create trigger`·backfill `where app_code is null`·`create unique index if not exists` |
| **0014** | `0014_product_tax.sql` | products.tax_type CHECK 3종 확장 + DEFAULT unset + **표식 가드 1회 backfill**('taxable'→'unset', §4.2b) + order_items.tax_type_snapshot(+CHECK 4값) + (D4) 0011 동결 가드 확장 | `drop constraint if exists→add`·`alter default`·**표식 없을 때만 backfill+표식 기록(한 트랜잭션)**·`add column if not exists`·`create or replace function` |

- 분리 이유: app_code(식별 인프라)와 tax(표시·스냅샷)는 독립 가치·독립 롤아웃. 하나가 막혀도 다른 하나 진행. **단일 0013 통합도 가능**(D7) — 권장은 분리.
- 데이터 무접촉 원칙의 예외 2건(정당화 필수·Codex 승인): ① 0013 app_code backfill(전 품목 채번 — 불가피, NOT NULL 전제. `where app_code is null` 조건이라 재실행 0행) ② 0014 tax_type 'taxable'→'unset' backfill(§4.2 근거). ②는 값 조건만으로는 재실행 안전하지 않아 **표식 가드**로 최초 1회만 실행(§4.2b) — 사용자가 이후 고른 taxable을 재실행이 덮지 않는다.
- 앱 코드는 0013/0014 **미적용 DB에서도 폴백으로 안 깨져야**(C11) — 컬럼 없으면 app_code/tax UI 숨김, 명세서는 현 형식. 코드 머지와 DB 적용 순서 자유도 확보(0007/0009 관례).

## 10. 구현 파일 목록·순서 (다음 구현 세션, TDD)

| 순서 | 파일 | 내용 |
|---|---|---|
| 1 | `web/supabase/migrations/0013_product_app_code.sql` 신설 | §5.2 방향. **작성만·적용 금지(Codex 승인+사용자 SQL Editor 게이트)** |
| 2 | `web/supabase/migrations/0014_product_tax.sql` 신설 | §9. 작성만·적용 금지 |
| 3 | `docs/guide-apply-0013-product-app-code.md` · `docs/guide-apply-0014-product-tax.md` 신설 | 적용 절차 + 가드/발급 실측 스크립트(guide-apply-0012 형식·begin…rollback) |
| 4 | `web/src/lib/tax.ts` + `tax.test.ts` 신설 | `computeStatementTax` 순수 함수(§6.2) — 실패 테스트 먼저 |
| 5 | `web/src/lib/domain/types.ts` · `product-store.ts`(+test) 수정 | Product.appCode/taxType, PRODUCT_COLS·폴백·insert/update·mapProduct(§6.2) |
| 6 | `web/src/lib/order-store.ts`(+test) 수정 | toItemInserts tax_type_snapshot, ORDER_SELECT·mapDbOrder·폴백·OrderLine.taxTypeSnapshot(§6.2) |
| 7 | `web/src/lib/order-correction.ts`(+test) 수정 | 정정본 tax 스냅샷 복사(§6.4) |
| 8 | `web/src/app/page.tsx` · `product-management-view.tsx` 수정 | 명세서 세무형 분기·과세구분 select·app_code 표시·품목 CSV 열(§6.2·§8) |
| 9 | 검증·smoke | §10 체크리스트. DB smoke는 0013/0014 적용 후 사용자 |
| 10 | 문서 | agent-worklog·NEXT-SESSION·진행판(JSON→generate-progress.py) — 구현 세션 |

## 11. 사용자에게 받아야 할 이카운트 엑셀 정보 (선행)

구현 전 사용자 확인이 필요한 3가지(없으면 전 품목 'unset'로 진행하고 과세 UI만 제공):

1. **과세구분 컬럼 존재·이름**: `품목마스터.xlsx`(또는 단가마스터)에 과세/면세를 나타내는 컬럼이 있는가? 정확한 **헤더명**과 **값의 표기**(예: "과세"/"면세", "10%"/"0%", "Y"/"N")를 알려줄 것.
2. **값 매핑**: 그 표기를 taxable/exempt/unset로 어떻게 대응할지(불명확·빈칸은 반드시 unset).
3. **가격 VAT 기준**: 이카운트의 단가(base_sale_price 원천)가 **VAT 포함가인지 제외가(공급가)인지**. 오더모아는 공급가(VAT 제외)로 해석하므로, 포함가라면 사용자 확인 후에만 별도 보정(자동 변환 금지).

## 10-b. 테스트 계획 (구현 세션 체크리스트)

### 단위(순수 함수)
1. `ordermoa_next_product_code` 형식(순수 계층은 앱 아님 — DB 실측 G로 대체) / 앱측 app_code는 표시·검색만 단위 테스트.
2. `computeStatementTax` mode 3갈래: 전부 NULL → `mode='legacy'`; 하나라도 'unset' → `mode='unset'`(세무형 차단); taxable/exempt만 → `mode='taxed'`(전부 taxable=round(합×0.1) / 전부 exempt=0 / 혼합=면세·과세 분리+round(과세×0.1)).
3. `toItemInserts`: product.tax_type가 taxable/exempt/unset이면 그 값을 tax_type_snapshot에 **그대로 저장**(신규는 'unset'도 저장, NULL로 내리지 않음).
4. `mapDbOrder`: tax_type_snapshot → OrderLine.taxTypeSnapshot(null·'unset' 구분 보존).
5. `orderToParsedLines`(정정): 원주문 taxTypeSnapshot 복사.
6. product-store 폴백: app_code/tax_type 누락 시 컬럼 뺀 select 성공 + UI 게이팅 플래그.

### 통합(mock — 기존 fake 빌더 재사용)
7. saveOrder 경로 A: 라인 insert payload에 tax_type_snapshot 포함.
8. correctConfirmedOrder: 정정본 라인에 원주문 tax 스냅샷 전달.

### DB 가드 실측 (0013/0014 적용 후 사용자 SQL Editor, begin…rollback)
| # | 검증 | 기대 |
|---|---|---|
| GA1 | app_code 미지정 품목 insert | 트리거가 `OM-000001` 형식 자동 채번 |
| GA2 | 같은 회사 연속 insert 2건 | 번호 연속(+1), 중복 없음 |
| GA3 | 동시(별 트랜잭션) insert | 카운터 직렬화로 중복 번호 없음(수동 2세션) |
| GA4 | 타 회사 insert | 그 회사 순번으로 채번(격리) |
| GA5 | backfill 재실행 | app_code null 없음 → 0행(멱등) |
| GA6 | unique(company_id, app_code) 위반 수동 insert | 유니크 위반 |
| GA7 | **backfill 후 신규 품목 insert** | app_code = `max(backfill 번호)+1`(연속 — 카운터 last-issued 의미 검증) |
| GA8 | **app_code 명시 지정 INSERT**(NEW.app_code not null) | 트리거 raise(명시 주입 차단) |
| GA9 | **기존 품목 app_code UPDATE**(값 변경) | 트리거 raise(변경 차단) |
| GA10 | 마이그레이션 backfill의 NULL→값 UPDATE | 통과(OLD null이라 변경 차단 예외 없음) |
| GB1 | tax_type CHECK: `unset` insert | 성공(3종 확장 확인) |
| GB2 | tax_type CHECK: 잘못된 값 | CHECK 위반 |
| GB3a | 표식 없는 최초 적용 | legacy taxable → unset backfill 발생 + 표식 기록 |
| GB3b | 사용자가 한 품목을 taxable로 지정 후 0014 **재실행** | 표식 있어 backfill 건너뜀 → 그 taxable **보존**(unset로 안 덮임) |
| GB3c | 최초 적용을 rollback한 뒤 재적용 | 표식 없어 backfill 재실행 성공(원자성) |
| GB4 | order_items.tax_type_snapshot CHECK: 'unset' insert 성공 / 'foo' insert | 'unset' 성공(4값 허용) · 'foo' CHECK 위반 |
| GB5 | (D4 채택 시) confirmed 라인 tax_type_snapshot UPDATE | 동결 가드 차단 |
| GB6 | 0013/0014 전체 재실행 | 에러 없음(멱등)·컬럼/CHECK/트리거 그대로·**backfill은 표식으로 재실행 안 됨**·사용자 지정값 무변경 |

### 브라우저 smoke (데모 → DB는 적용 후 사용자)
1. 품목 관리: 과세구분 select 저장·표시, app_code 표시·검색.
2. 과세/면세 혼합 주문 확정 → 명세서에 면세공급가/과세공급가/부가세/합계 + 라인 과세·면세 표시.
3. 전부 과세 주문 → 부가세=round(공급가×0.1) 표시. 전부 면세 → 부가세 0.
4. 미설정 섞인 신규 주문 → 세무형 대신 안내, 현 형식.
5. **과거 주문(tax 스냅샷 없음) 명세서 = 현 "VAT 미적용" 형식 회귀 100%**.
6. 월합계·합산표 = 정정/과세 전후 금액 불변(VAT 미저장).
7. 정정본 명세서가 원주문 과세 분류 보존.
8. 0013/0014 미적용 상태(폴백): 과세/app_code UI 숨김, 명세서 현 형식, 앱 안 깨짐.

### 검증 한 세트
root `npm test` · web `npm test` · web `npm run build` · `npx tsc --noEmit` · web `npm audit --audit-level=low` · `git diff --check`. 시작 시 기존 수 기록(기준선 root 5 / web 205, 2026-07-13 R5b 병합 후).

## 12. 열린 결정 (Codex 승인 요청 — 각 권장안 1개)

| # | 결정 | 권장 | 근거 |
|---|---|---|---|
| D1 | app_code 발급·불변 = 카운터(last-issued) + SECURITY DEFINER 함수 + BEFORE INSERT OR UPDATE 트리거(자동 채번·명시 주입 차단·변경 차단, backfill NULL→값 허용) | **채택** | 원자적·회사격리·import 배치 자동 채번, 앱 max+1 회피. DB가 코드 무결성 강제(주입·변경 불가). backfill 후 신규=max+1 연속(§5.2·GA7~GA10) |
| D2 | products.tax_type **재활용 + 표식 가드 backfill** vs 신규 컬럼 | **재활용(A)** | 휴면 실측(C2)으로 backfill은 무의미 기본값 정정. 미정정 시 735품목 과세 오표기(추정 금지 위반). backfill 재실행 안전은 **완료 표식**으로 보장(§4.2b — 값 조건만으론 사용자 지정 taxable 덮음). 보수적이면 B(신규 컬럼, backfill 없음) |
| D3 | tax_type_snapshot 캡처 = order_items INSERT(qc) 시점 | **채택** | product_id/unit과 동일 시점, 두 경로 자연 캡처, 마감은 unit_price만 |
| D4 | 0011 동결 가드를 tax_type_snapshot까지 확장(create-or-replace 상위집합) | **채택(권장)** | 앱이 안 건드려도 스냅샷 불변 DB 강제. 0011→0010 선례. 미채택도 앱상 무해 |
| D5 | 정정본 tax_type_snapshot = 원주문 복사 vs 재유도 | **복사** | unit_price 복사와 일관, 조용한 재분류 방지 |
| D6 | 미설정 섞인 신규 주문 명세서 | **세무형 차단·안내 + 현 형식 유지** | 추정 금지. 사용자가 과세구분 채운 뒤 세무형 인쇄 |
| D7 | 마이그레이션 0013+0014 분리 vs 통합 | **분리** | 독립 검수·롤아웃. 통합도 가능 |
| D8 | 주문 CSV/목록/합산표/월합계에 과세 열 추가 | **1차 제외**(품목 CSV·품목 관리만 app_code·과세) | 범위 최소화, 금액 불변 |
| D9 | order_items.tax_type_snapshot 미설정 인코딩 | **과거=NULL 유지 / 신규 미설정='unset' 저장**(CHECK 4값 taxable/exempt/unset/null) | 과거(정보 없음)와 신규 미설정(사용자 미완료)을 구분해야 세무형 차단·안내가 발동. NULL 통일 취소(§6.1) |

## 13. 비범위

세금계산서 발행·부가세 신고·회계 마진 저장, 매입가 이력, 다단위(Phase 3), 재고, OCR, 이카운트 실시간 연동, base_sale_price VAT 자동 변환. 세금 법률 판단·임의 과세 분류 확정(사용자·전문가 확인 영역).

## 14. 자체 검토 기록

- **Codex 검수 보정(2026-07-13 2차) 3건**: ① D9 — 과거 NULL / 신규 미설정 'unset' 구분(NULL 통일 취소), CHECK 4값, 명세서 3갈래(legacy/unset/taxed), 타입·`computeStatementTax` mode·정정 복사·테스트·smoke 정렬(§6.1·§8). ② D2 — backfill 재실행 안전을 **완료 표식 가드**로 봉합(값 조건만으론 사용자 지정 taxable 덮음), 표식+backfill 한 트랜잭션(rollback 시 재시도 가능), GB3a/b/c·GB6·가이드 정렬(§4.2b). ③ D1 — 카운터 의미를 **last-issued로 통일**(backfill 카운터=max, 신규=max+1 연속 — 이전 max+1 세팅의 번호 건너뜀 버그 정정), 트리거를 BEFORE INSERT OR UPDATE로 확장(명시 주입 차단·변경 차단, backfill NULL→값만 허용), GA7~GA10 추가(§5.1·§5.2).
- tax_type 휴면(C2)을 web/src 전수 grep 0건으로 실측 → D2 재활용·backfill 정당성의 사실 근거 확보.
- 저장 금액 VAT 제외 유지(§2·§8) → 월합계·합산표·CSV 무영향을 코드(monthly-summary·aggregate 순수 함수)와 대조 확인.
- tax_type_snapshot 캡처를 qc insert로 두면 0010/0011 동결(confirmed에서만 잠금)과 무충돌(§4.4·C7) — 마감 경로가 unit_price만 UPDATE함을 order-store로 확인.
- app_code 트리거·카운터가 카탈로그 200배치 insert(C4)와 공존(트리거 per-row 직렬 채번) 확인.
- R5b 링크·표식 무접촉(§6.4는 라인 tax만 추가, orders 컬럼·트리거 미변경) 확인.
- 열린 결정은 D1~D9뿐이며 각각 권장안 제시. TODO/미정 표기 없음. 행 번호는 `8689dcd` 기준(구현 세션 심볼 재탐색).
