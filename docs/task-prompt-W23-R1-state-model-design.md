# Claude 작업 지시 — W23-R1 가격 대기 상태·저장 모델 설계 (승인 게이트)

아래 프롬프트 전문을 Claude Code에 전달한다.

---

오더모아 W23-R1 — 가격 대기 주문의 상태·저장 모델 설계 세션을 진행해주세요.

작업 위치:
`D:\Documents\ERP-1`

브랜치:
`codex/integrate-mvp-docs-web`

## 0. 작업 성격과 절대 경계

이번 세션은 **설계·검증 계획·마이그레이션 초안 작성만** 수행한다. R1은 W23 재설계의 승인 게이트다 — 여기서 결정이 승인돼야 R2(수량 확인)·R3(가격 마감) 구현이 시작된다.

- 앱 코드(web/src) 수정 금지
- 테스트 코드 수정 금지
- Supabase 직접 적용 금지 (마이그레이션 **파일 초안 작성은 허용**, 적용은 Codex 승인 후 사용자)
- 패키지 설치 금지
- `web/.env.local` 수정/이동 금지
- 원본 사업자 데이터 커밋 금지
- git/npm 전 항상 `cd "D:/Documents/ERP-1"` (cwd 리셋 주의)
- Claude는 커밋·푸시하지 말고 최종 보고 후 중단 (사용자가 세션 중 달리 지시하면 그에 따름)

## 1. 먼저 읽을 것

1. `git status --short --branch` · `git log -5 --oneline`
2. **결정의 상위 근거**: `docs/order-moa-system-redesign-2026-07-11.md` §5(상태 전이표)·§11(대안 비교)·§14(R1 성공/중단 기준)·§15(게이트) — 이 문서가 R1의 요구사항이다.
3. `docs/order-moa-system-meta-prompt.md` §3(불변 규칙 — 특히 스냅샷 재정의 문구)·§6(보안: 새 상태/트리거도 RLS·교차회사·ordermoa_ 접두사 규율)
4. `docs/db-schema-definition.md` §4.8(orders)·§4.9(order_items)·§6.1(교차회사 트리거)
5. **실제 DDL**: `web/supabase/migrations/0001_schema.sql`(orders/order_items), `0002_rls.sql`(정책·트리거 패턴), `0006_order_import_link.sql`(트리거 함수 갱신 선례)
6. **영향받는 코드(읽기 전용)**: `web/src/lib/order-store.ts`(saveOrder·loadOrders — **현재 `status='confirmed'`만 조회함**), `web/src/lib/aggregate.ts`, `web/src/lib/monthly-summary.ts`, `web/src/lib/delivery-note.ts`, `web/src/lib/csv-export.ts`, `web/src/app/page.tsx`(주문 목록·명세서·월합계 흐름)
7. `docs/agent-worklog.md` 2026-07-11 W23 항목(Claude 개편 + Codex 검수 보정 1~5)

## 2. 이미 확인된 기술 사실 (재확인 후 설계에 반영할 것)

R1의 핵심 충돌 지점은 문서 감사에서 이미 드러나 있다:

- `ordermoa_orders.status`의 CHECK는 **이미 `('draft','confirmed','cancelled')`** 다. `'draft'`는 현재 미사용 — **재사용하면 CHECK 마이그레이션 없이 가격 대기 상태를 표현할 수 있다**(단, "입력 중(화면 상태)"과 의미 충돌 여부를 § 상태 전이표와 대조해 판단할 것).
- `ordermoa_order_items.unit_price`는 **NOT NULL DEFAULT 0**, `amount`는 **NOT NULL generated (round(quantity × unit_price))**. 따라서 **unit_price를 nullable로 바꾸면 amount 생성식이 NULL이 되어 NOT NULL 제약과 충돌**한다 — 재설계 §11이 "R1에서 검증 필수"라고 못 박은 지점이 바로 이것.
- Postgres stored generated 컬럼은 UPDATE 시 자동 재계산된다 → "가격 대기 상태에서 unit_price=0으로 저장 후, 가격 마감 때 UPDATE"가 성립하는지가 핵심 검증 대상.
- `loadOrders`가 confirmed만 불러오므로, 어떤 모델을 골라도 R2에서 조회 경로 수정이 필요하다(영향 맵에 포함).

## 3. 비교할 설계 옵션 (최소 3안 — 예단하지 말고 표로)

재설계 §11의 대안 1을 하위 옵션으로 쪼개서 비교한다:

| 옵션 | 요지 |
|---|---|
| 1a | `unit_price`·`amount` nullable 전환 + 신규 상태값. 스키마 변경 큼 |
| 1b | **스키마 최소**: `unit_price=0` 유지, `orders.status`가 가격 대기의 진실. 마감=UPDATE unit_price(자동 재계산). order_items 무변경 |
| 1b-i | 1b + 기존 `'draft'` 재사용(마이그레이션 0건 가능성) |
| 1b-ii | 1b + 신규 상태값(예: `quantity_confirmed`) — CHECK 재정의 마이그레이션 필요 |
| 2 | 별도 초안 테이블(재설계 §11 대안 2) — 위 전부가 기존 조회를 깨뜨릴 때의 후퇴안 |

필수 비교 기준(재설계 §11의 9개 + 추가):
- 기존 확정 주문 무손상·backfill 0건
- 스냅샷 보호 방식: "가격 대기에서만 unit_price 수정 가능, 최종 확정 후 UPDATE 차단"을 **앱 + DB(트리거 or RLS 정책)** 어느 층에서 강제할지
- 0원 확정 주문(기존 단가 미등록 케이스)과 가격 대기 주문의 **구분 방법**
- 합산표·주문 목록·월합계·명세서·CSV가 가격 대기 주문을 각각 포함/제외하는 규칙과 쿼리 변경량
- 취소(cancelled)와의 전이, `order_imports.order_id` 링크 영향
- additive/idempotent 마이그레이션 가능성과 롤백 전략

## 4. 산출물

1. **결정 기록**: `docs/order-moa-w23-r1-state-model-decision.md`
   - 옵션 비교표 + 권장안 + 근거, 상태값 명칭 확정(용어는 재설계 §2 참조), 상태 전이×허용 수정×조회 포함 규칙 매트릭스, 스냅샷 보호 설계, R2/R3에 넘길 코드 영향 맵(파일·함수 단위), 열린 결정
2. **마이그레이션 초안**(필요한 경우만): `web/supabase/migrations/0010_order_pricing_state.sql`
   - 파일만 작성, 적용 금지. additive/idempotent 필수. RLS·교차회사 트리거 영향 명시. 1b-i(마이그레이션 0건)가 결론이면 초안 대신 "0건 근거"를 결정 기록에 명시
3. **검증 계획**: 권장안의 DB 동작(generated 재계산·NULL 전파·CHECK)을 확인할 방법
   - 우선순위: ① 사용자 SQL Editor에서 실행할 **일회용 실험 스크립트**(`ordermoa_tmp_` 접두사 임시 테이블 생성→검증→즉시 drop, 실데이터 무접촉) ② 로컬 Postgres 대안. 실험 스크립트도 적용은 사용자·승인 후
4. **문서 동기화**: NEXT-SESSION(R1 결과·다음 R2), agent-worklog, 진행판 JSON에 W23-R1 카드(표적 편집) → `py -3 scripts/generate-progress.py` 재생성(사용자가 HTML을 직접 열어봄 — 항상 최신화)

## 5. 하지 말 것

- 앱 코드·테스트 수정 (R2 범위)
- 가격 마감 화면 설계 상세화 (R3 범위 — screen-spec §16.3이 이미 있음)
- 매입가 이력 테이블·정정 절차 스키마 (별도 게이트)
- 해석 기억·OCR·다단위 (R6~R8/Phase 3)
- 전체 재고·회계 확장

## 6. 검증

- 코드 무변경 기준선: root `npm test` · `cd web && npm test` · `npm run build` · `npm audit --audit-level=low` · `git diff --check`
- 마이그레이션 초안이 있으면: idempotent 여부 자체 점검(두 번 실행 가정), `ordermoa_` 접두사, 기존 데이터 영향 0 확인 논증
- 문서 QA: 결정 기록의 상태 용어가 재설계 §2 용어표와 일치하는지, "확정 라인만 저장(현재 0001~0009)" 경계 문구와 모순되지 않는지

## 7. 최종 보고 형식

1. 권장안과 탈락안(이유 포함)
2. 스냅샷 보호를 어느 층에서 강제하는지
3. 마이그레이션 필요 여부(0건이면 그 근거)
4. 기존 조회(합산·목록·월합계·명세서) 영향 맵
5. 검증 계획과 사용자가 실행할 실험 스크립트(있다면)
6. R2 구현 세션에 넘길 작업 목록
7. 테스트/build/audit/diff-check 결과
8. Codex 검수 포인트 (이 보고가 곧 R1 승인 게이트의 심사 자료다)

최종 보고 후 중단한다.
