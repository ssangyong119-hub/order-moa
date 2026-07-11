# W23-R1 결정 기록 — 가격 대기 주문의 상태·저장 모델 (승인 게이트)

작성일: 2026-07-11 · 작성 주체: Claude (설계만 — 코드/SQL 적용 없음)
상위 근거: `docs/order-moa-system-redesign-2026-07-11.md` §5·§11·§14·§15 · 헌장 §3(스냅샷 재정의)·§6(보안 규율)
작업 프롬프트: `docs/task-prompt-W23-R1-state-model-design.md`
상태: **게이트 통과 — 실측 완료·0010 적용 완료 (2026-07-11, 사용자 실행)**. 실험 결과: E1·E2 = unit_price 0→UPDATE 2500 시 amount 7500 자동 재계산 ✅ / E3 = NULL 단가 insert 시 23502 not-null 위반(의도된 에러 — 1a 탈락 실증) ✅ / E4 = CHECK 재정의 후 기존 행 count 2 통과(backfill 0 실증) ✅ / 실험 테이블 drop 완료 / **0010 본 마이그레이션 `Success. No rows returned`**. 사용자(오너) 주도로 적용했고 Codex 사후 검수는 커밋 시점에 §8 열린 결정과 함께 진행. → R2 구현 착수 가능.

---

## 1. 확인된 현재 사실 (2026-07-11, 마이그레이션·코드 실측)

| # | 사실 | 위치 | R1에 주는 의미 |
|---|---|---|---|
| F1 | `orders.status` CHECK = `('draft','confirmed','cancelled')`, default `'confirmed'`. `'draft'`는 **미사용** | 0001 | 신규 상태를 넣으려면 CHECK 재정의 1회 필요. draft 재사용 옵션 존재 |
| F2 | `order_items.unit_price integer NOT NULL DEFAULT 0 CHECK(>=0)` | 0001 | **nullable 전환 없이도 "0으로 저장 후 마감 때 UPDATE"가 성립** |
| F3 | `order_items.amount integer NOT NULL generated always as (round(quantity*unit_price)::integer) stored` | 0001 | unit_price가 NULL이면 생성식이 NULL → **NOT NULL 위반으로 insert 자체가 실패**(1a 탈락 근거). stored 생성 컬럼은 UPDATE 시 자동 재계산(실험 E2로 확증 예정) |
| F4 | order_items에 RLS **update 정책 이미 존재**(`ordermoa_order_items_update`) | 0002:102 | 가격 마감의 UPDATE에 정책 추가 불필요 |
| F5 | 교차회사 트리거 `ordermoa_trg_order_items_company`는 **before insert or update** | 0001:191 | UPDATE 경로에서도 교차회사 방어 유지 — 추가 조치 불필요 |
| F6 | orders에 delete 정책 없음, 취소=`status='cancelled'` update. update 정책 존재 | 0002 | 상태 전이(qc→confirmed 등)는 기존 정책으로 가능 |
| F7 | 앱: `toOrderInsert`가 `status:"confirmed"` 명시, `loadOrders`는 `.eq("status","confirmed")`만 조회, 보상 취소는 update | order-store.ts 58·419·468 | 가격 대기 주문은 현재 코드에 **자동으로 보이지 않음**(안전한 기본값). R2에서 조회·저장 경로 의도적 수정 필요 |
| F8 | 월합계는 로드된 주문의 `order.total`(스냅샷 합)만 사용, 합산표·명세서도 로드된 주문 상태 기반. csv는 범용 함수 | monthly-summary.ts·aggregate.ts·page.tsx | 포함/제외 규칙은 전부 **호출부(어떤 주문을 넘기느냐)**에서 결정 가능 — 순수 함수 무변경 |

## 2. 옵션 비교

| 기준 | 1a. unit_price·amount nullable | **1b-ii. unit_price=0 유지 + 신규 상태(권장)** | 1b-i. 1b + 'draft' 재사용 | 2. 별도 초안 테이블 |
|---|---|---|---|---|
| order_items 스키마 변경 | NOT NULL 2개 해제(비가역적 — 재강화엔 backfill) | **0건** | 0건 | 0건(대신 새 테이블 2개) |
| orders 스키마 변경 | CHECK 재정의 | CHECK 재정의 1회(additive) | **0건** | 0건 |
| F3 생성식 충돌 | **실패**: NULL 전파 → amount NOT NULL 위반. amount까지 nullable로 풀면 합산·CSV·타입 전반이 null 처리 필요 | 없음(잠정 0/입력값으로 항상 정수) | 없음 | 없음 |
| 스냅샷 안전 | "NULL=미확정" 관례 의존 | 상태가 진실 + **DB 가드 트리거로 confirmed 불변 강제** | 동일 가능 | orders에 확정값만 유입(원칙 그대로) |
| 의미 명확성 | 중 | **높음**(`quantity_confirmed` = 재설계 §2 "수량 확인"과 1:1) | **낮음** — 문서 전체가 draft를 "미저장 입력 중, 1차 미사용"으로 정의(function-spec §4.8, C1/A). 재사용하면 문서 재정의 비용이 마이그레이션 비용을 대체할 뿐 | 높음 |
| 기존 주문 호환/backfill | backfill 0 | **backfill 0**(기존 confirmed/cancelled 전부 CHECK 통과) | backfill 0 | backfill 0 |
| 조회 복잡도 | 낮음 | **낮음**(단일 테이블, status in 필터) | 낮음 | **높음**(초안+확정 이중 소스 병합 — 재설계 §11에서 이미 기각 사유) |
| 마이그레이션 실질 개수 | 1(크고 위험) | **1(작음: CHECK+가드 트리거)** | 가드 트리거를 넣는 순간 **어차피 1** → "0건" 이점 소멸 | 1(테이블+RLS 4정책+트리거 — 가장 큼) |
| 실패 복구 | — | 마감=UPDATE라 단순 재시도 | 동일 | 초안→확정 복사 부분 실패 보상 필요 |

## 3. 권장안 — **1b-ii: "상태가 진실, 스키마는 그대로"**

1. `order_items`는 **무변경**. 가격 대기 주문의 라인도 지금 구조 그대로 저장한다 — `unit_price`는 확정 화면의 값 그대로(기본 0, 사용자가 미리 적은 값이 있으면 그 값). `amount`는 잠정 파생값이며, 잠정치가 월합계·명세서에 새지 않는 것은 **상태 필터**(아래 §5)가 보장한다.
   - **C1/A("확정 라인만 저장") 원칙과의 관계**: 이 결정은 C1/A를 개정하되 핵심은 유지한다 — 저장되는 라인은 여전히 **품목·수량이 사람 확인을 통과한 라인만**(`product_id` NOT NULL 불변, 미매칭·수량불확실·파싱 후보는 계속 DB 미저장). 바뀌는 것은 "판매단가까지 확정된 주문만 저장"에서 "수량 확인 주문도 저장(가격은 대기)"으로의 확장뿐이다. R1 승인 시 function-spec §7/§13.1/§14.1과 db-schema §2의 해당 경계 문구를 이 정의로 갱신한다(R2 문서 동기화 항목).
2. `orders.status`에 **`quantity_confirmed`(수량 확인·가격 대기)** 를 추가한다(CHECK 재정의 1회). `draft`는 기존 의미("미저장 입력 중" 예약, 미사용) 그대로 두고 건드리지 않는다 — 값 제거도 하지 않는다(제거는 데이터 검증 불가 리스크만 추가).
3. **가격 마감 = ① 해당 주문 order_items의 unit_price UPDATE(생성 컬럼 amount 자동 재계산) → ② orders.status를 'confirmed'로 UPDATE.** 이 순서면 중간 실패 시에도 주문은 가격 대기로 남아 재시도 가능(부분 실패 보상 불필요).
4. **스냅샷 보호는 2중**: (앱) R2/R3 코드가 quantity_confirmed에서만 라인 수정 허용 + (DB) **가드 트리거** — `status='confirmed'`인 주문의 order_items에 대해 unit_price·quantity·product_id·unit 변경과 행 DELETE를 차단(raise). 헌장 §6의 3중 방어(RLS·트리거·앱) 관행과 일치. 정정(F18)은 이후 별도 설계에서 이 가드를 우회하는 절차가 아니라 **별도 경로**(예: 취소+재발행 or 조정 라인)로 푼다.
5. `confirmed → quantity_confirmed` **역전이는 금지**(orders 가드 트리거) — "최종 확정은 최종"(재설계 §5). 허용 전이: `quantity_confirmed → confirmed`(가격 마감) · `quantity_confirmed → cancelled` · `confirmed → cancelled`(기존 취소/보상 경로 유지).

### 탈락 사유 요약
- **1a**: F3 실측 구조상 성립하려면 amount까지 NOT NULL 해제 → 되돌리기 어려운 스키마 완화 + 전 소비자 null 처리. 얻는 것("미확정=NULL"의 표현력)은 상태 컬럼이 이미 제공.
- **1b-i**: 가드 트리거가 필요하다는 결론이 나는 순간 0010은 어차피 존재 → "마이그레이션 0건" 이점이 사라지고, draft 의미 충돌(문서 재정의 비용)만 남는다.
- **2**: 합산표가 이중 소스가 되는 순간 조회·화면·id 승계 복잡도가 전 화면으로 번짐(재설계 §11 기각 논거 유지). 단, 1b-ii가 실험(§7)에서 깨질 경우의 후퇴안으로 보존.

## 4. 상태 매핑·전이 매트릭스 (DB 값 기준)

| DB status | 재설계 §2 용어 | 합산·매입처 발주 | 명세서 | 월합계 | 라인 수정 | 전이 |
|---|---|---|---|---|---|---|
| (없음 — 화면 상태) | 입력 중 | 제외 | 불가 | 제외 | 자유 | 저장 시 quantity_confirmed 또는 confirmed |
| `quantity_confirmed` (신규) | 수량 확인(가격 대기) | **포함** | **차단** | **제외** | 수량·단위·단가·매입처 허용 | → confirmed(가격 마감) / → cancelled |
| `confirmed` (기존) | 최종 확정 | 포함 | 가능 | 포함 | **차단(가드 트리거)** — 정정 절차만(후속) | → cancelled |
| `cancelled` (기존) | 취소 | 제외 | 취소 표시 | 제외 | — | (복원 정책 별도 — 열린 결정 유지) |
| `draft` (기존·미사용) | — (예약) | — | — | — | — | 사용하지 않음(의미 불변) |

## 5. R2/R3 코드 영향 맵 (이번 세션 수정 없음 — 구현 세션 작업 목록)

| 파일 | 변경 | 단계 |
|---|---|---|
| `web/src/lib/order-store.ts` | `toOrderInsert`에 status 인자(기본 confirmed — 경로 A 무변경) · `saveOrder`에 모드 인자 · `loadOrders` 필터를 `.in("status",["confirmed","quantity_confirmed"])`로 + 행에 status 포함 · `ConfirmedOrder` 타입에 `status` 필드(타입명 개명 여부는 R2 판단) · 신규 `closeOrderPrices(db, companyId, orderId, lines)`: items unit_price UPDATE → orders.status='confirmed' UPDATE 순서 | R2·R3 |
| `web/src/app/page.tsx` | 확정 버튼 분기("가격 포함 확정"=기존 / "수량만 확정"=신규) · 주문 목록 상태 뱃지·필터 · note 뷰 진입 가드(confirmed만) · 월합계 호출부에 confirmed만 전달 · 합산표엔 confirmed+quantity_confirmed 전달 · 주문 CSV에 status 열 · 데모 모드 메모리 상태 동일 규칙 | R2·R3 |
| `web/src/lib/monthly-summary.ts` / `aggregate.ts` / `delivery-note.ts` | **무변경** — 포함/제외는 호출부가 걸러서 전달(F8). 순수 함수 원칙 유지 | — |
| `web/src/lib/order-parser.ts` / product·price·supplier·customer-store | 무변경 | — |
| RLS/정책 | 무변경(F4·F6) | — |
| 테스트 | order-store 상태 필터·closeOrderPrices payload 빌더 단위 테스트, 상태별 명세서 차단 로직 테스트 | R2·R3 |

## 6. 마이그레이션 초안 — `web/supabase/migrations/0010_order_pricing_state.sql`

**파일 작성됨 · 적용 금지(승인 게이트).** 구성: ① orders CHECK 재정의(quantity_confirmed 추가, draft 보존) ② orders 역전이 가드 트리거 ③ order_items 스냅샷 가드 트리거(UPDATE+DELETE). 전부 idempotent(drop if exists → create), 데이터 무접촉, backfill 0건, `ordermoa_` 접두사, RLS 변경 없음. 상세 주석은 파일 참조.

## 7. 검증 계획

### E1~E4 일회용 실험 스크립트 (사용자 SQL Editor 실행, 승인 후)
`ordermoa_tmp_r1` 접두사 임시 테이블로 실데이터 무접촉 검증 후 즉시 drop. 스크립트 전문은 0010 초안 하단 주석 블록에 포함(적용 SQL과 분리된 "실험 전용" 블록).

| 실험 | 검증 내용 | 기대 결과 |
|---|---|---|
| E1 | `unit_price=0` insert → amount | amount=0 (F2·F3) |
| E2 | unit_price UPDATE → stored generated 재계산 | amount 자동 갱신 (권장안의 핵심 전제) |
| E3 | unit_price NULL insert(임시 테이블에서 NOT NULL 해제 후) | **amount NOT NULL 위반 에러** = 1a 탈락 실증 |
| E4 | CHECK drop→add 재정의 + 기존 행 통과 | 에러 없음 = backfill 0 실증 |

### R2 구현 시 회귀 게이트
- 기존 confirmed 주문: 로드·명세서 재출력·월합계 **값 불변**(스냅샷) 회귀 테스트
- quantity_confirmed 주문이 명세서·월합계에 나타나지 않고 합산표에는 나타나는 것
- 가드 트리거: confirmed 주문 라인 UPDATE 시도 → 에러(수동 SQL 실측 1회)

## 8. 열린 결정 (Codex 승인 요청 항목)

1. **권장안 1b-ii 채택** 여부 (§2 비교표 기준)
2. 가드 트리거 범위 — UPDATE만 vs **UPDATE+DELETE(권장)** vs 트리거 없이 앱만(비권장 — 헌장 3중 방어와 불일치). 주의: DELETE 가드는 orders 행 삭제 시 cascade 항목 삭제도 차단한다 — 앱 경로에는 orders delete가 없고(soft cancel만) 관리자 수동 정리 시에만 만나는 제약이므로 의도된 보호로 간주(필요 시 트리거 drop 후 정리)
3. `draft` 값 CHECK 보존(권장) vs 제거
4. 가격 대기 저장 시 unit_price에 화면 값 저장(권장) vs 무조건 0 — 사용자가 일부 단가를 미리 적은 경우의 보존 여부
5. `ConfirmedOrder` 타입명 처리(R2에서 status 필드만 추가=권장 vs 개명 리팩터)
6. 가격 대기 명세서 "워터마크 미리보기"(재설계 §5) — R3 범위 포함 여부(기본: 차단만)
