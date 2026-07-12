# Claude 작업 지시 — W23-R5b 확정 주문 정정

아래 전체를 구현 세션의 Claude에 붙여넣어 사용한다. **Codex 결정 D1~D8은 이미 확정됐다(설계서 §12).** 별도 재승인 없이 이 지시서대로 진행하되, 0012 마이그레이션 적용은 여전히 Codex 검수+사용자 SQL Editor 게이트를 거친다.
설계 단일 소스: `docs/superpowers/specs/2026-07-12-order-moa-r5b-correction-design.md` (이하 "설계서")

## 확정된 설계 결정 (설계서 §12 요약 — 구현 시 그대로 반영)

- **D1 채택**: `corrected_from_order_id` + 자기참조 CHECK + 활성 정정본 부분 유니크 + 별도 가드 트리거(0012).
- **D2 채택**: DB 쓰기는 정정 진입 시가 아니라 **[정정 확정] 클릭 시에만** 시작(취소→생성 일괄).
- **D3 채택(복구 한정)**: cancelled 주문 재발행은 **정정 절차가 취소 후 생성 실패한 경우에만** 허용. 일반 취소→재발행 기능이 아니다.
- **D4 채택**: 정정 중 거래처 변경 불허(거래처 select 비활성).
- **D5 채택**: 정정본 `source='correction'`.
- **D6 거절**: confirmed/qc 단독 [취소] 버튼을 **만들지 않는다**. `cancelOrder`를 독립 export하지 말고 `correctConfirmedOrder` 내부 조건부 취소 단계로만 둔다.
- **D7 채택**: RPC 미도입 — 기존 조건부 취소·보상·재시도 패턴 유지.
- **D8 채택**: 취소 이력 CSV·원주문 명세서 재출력·명세서 정정 표기 전부 1차 제외.

---

오더모아 W23-R5b — 확정 주문 정정을 구현해주세요.

## 가장 먼저 확인할 것

- **선행 조건: W23-R4가 기준 브랜치(`codex/integrate-mvp-docs-web`)에 병합됐는지 확인.** 안 됐으면 중단하고 보고(page.tsx 충돌 방지).
- **R4 병합된 최신 기준에서 새 worktree로 시작**한다(이 설계 worktree `claude/r5b-correction-design`가 아니라, 최신 base에서 구현용 worktree/브랜치를 새로 만든다). `git pull --ff-only` · `git status --short --branch`로 워킹트리가 깨끗한지 확인 — 깨끗하지 않으면 수정 없이 상태만 보고 후 중단.
- `web/supabase/migrations/`에 0012가 비어 있는지 확인(다른 작업이 선점했으면 다음 번호 사용, 설계서의 0012 표기를 보고에서 정정).
- 설계서 전체 + `docs/NEXT-SESSION.md` + `docs/order-moa-w23-r1-state-model-decision.md` + 0010/0011 SQL을 읽기.
- `web/.env.local` 절대 수정·이동 금지. 브라우저 확인은 데모 모드 강제 별도 포트(launch.json `ordermoa-demo-3210`). Claude는 Supabase 직접 적용 금지 — 커밋/푸시는 세션 지시에 따름.

## 작업 목표

confirmed 주문의 `취소 확인 → 검수표로 복사 → 수정 → 새 주문 재확정(원주문 링크)` 정정 흐름. 설계서 §0 고정 원칙과 §5.3 전이 대조를 벗어나는 구현 금지.

## 절대 지킬 것

- 0010/0011의 함수·트리거를 교체·수정하지 말 것(0012는 신규 객체만).
- `saveOrder`의 qc→items→승격 구조, `closeOrderPrices`, `unit_price` 스냅샷, `amount` generated(insert 제외), raw_text 삭제 가능, 예상 마진 비저장 원칙 유지.
- **취소 선행 순서 고정**(설계서 §7) — 생성을 먼저 하는 변형 금지.
- 전역 `orders` 배열에 cancelled 주문을 절대 섞지 말 것(이력은 별도 상태).
- [수량만 확정]을 정정 모드에서 노출하지 말 것(qc·confirmed 혼용 금지).
- **confirmed/qc 단독 [취소] 버튼을 만들지 말 것(D6 거절).** `cancelOrder`는 `correctConfirmedOrder` 내부 단계로만.
- 세금/과세, app_code, 다단위, OCR, 기본 매입처 저장, 정정 사유 입력란은 범위 밖.
- 새 사이드바 메뉴 추가 금지(이력은 주문 목록 안 토글).

## 구현 순서 (설계서 §10 — 테스트 먼저)

1. `web/supabase/migrations/0012_order_correction_link.sql` — 설계서 §5.4 초안 기반 작성만. **적용 금지.**
2. `docs/guide-apply-0012-order-correction-link.md` — 적용 절차 + G1~G7 실측 스크립트(설계서 §9.3, guide-apply-0011 형식·begin…rollback 래핑).
3. `web/src/lib/order-correction.ts` + 테스트 — 순수 헬퍼(설계서 §9.1: orderToParsedLines·canCorrectOrder·컨텍스트 초기화·orders 교체).
4. `web/src/lib/order-store.ts` + 테스트 — `OrderStatus`에 "cancelled"·`correctedFromOrderId`·**`loadOrders` 반환을 `Promise<{ orders: ConfirmedOrder[]; correctionSchemaReady: boolean }>`로 변경**(설계서 §6.3: 정상 조회=true, `corrected_from_order_id` 누락 폴백=false)·ORDER_SELECT 폴백(`isMissingColumnError`)·`toOrderInsert/saveOrder` opts·`correctConfirmedOrder`(내부 조건부 취소 단계 포함)·`loadCancelledOrders`(설계서 §6.2~6.3, mock/반환계약 테스트 §9.2 — 기존 fake 빌더 재사용). **단독 `cancelOrder`는 export하지 않는다(D6 제외).**
5. `web/src/app/page.tsx` — **`loadOrders` 호출부(298행) 구조 분해 + `correctionSchemaReady` 상태 신설**(false면 정정 UI 전부 숨김)·[정정] 버튼(confirmed 행)·[정정본] 뱃지·검수표 정정 모드(배너·거래처 잠금·버튼 라벨)·이력 토글(정정 실패 복구 재발행 포함)·데모 동등 동작·문구(설계서 §6.4·§11). status 소비처 전수 재점검(설계서 §6.3 목록). **단독 [취소] 버튼은 만들지 않는다(D6 제외).**
6. 검증: root/web `npm test` · `npm run build` · `npm audit --audit-level=low` · `git diff --check`. 시작 시 기존 테스트 수 기록(기준선 web 186/186 + R4 증가분).

## 브라우저 smoke (데모 모드)

설계서 §9.4의 1~7을 그대로 수행(정정 완료·이중 집계 없음·월합계·이력·qc 미노출·컨텍스트 초기화·기존 회귀·390px·콘솔 0).

## DB 적용·실측 (게이트 — Claude가 하지 않음)

- Codex 승인 → 사용자 SQL Editor에서 0012 적용(`Success. No rows returned`) → G1~G7 실측 → 로그인 DB 모드에서 정정 1건 + F5 유지 + 0012 미적용 폴백은 적용 전에 미리 확인.
- 적용 전에는 DB smoke를 "완료"로 보고하지 말 것(0011 관례).

## 문서와 최종 보고

- `docs/agent-worklog.md`에 W23-R5b 기록, `docs/NEXT-SESSION.md` 갱신(R5b 결과·W24는 여전히 별도 승인), 진행판 갱신(`docs/order-moa-progress-data.json` → `py -3 scripts/generate-progress.py`).
- 구현 후 변경 파일 재독으로 자체 리뷰: 스냅샷·취소 선행·전역 orders 순수성·혼용 금지·범위.
- 최종 보고: ① 구현 내용·파일별 역할 ② 테스트 수/​build/audit/diff-check ③ 데모 smoke 결과 ④ 0012 적용 대기 상태와 사용자 실측 절차 안내 ⑤ Codex 검수 포인트(설계서 §5.3 전이 대조 + `loadOrders` 반환 계약 재확인 포함) ⑥ D6 거절(단독 취소 미구현)로 남는 공백 — 잘못 들어간 confirmed 주문의 정리 수단은 이번 범위 밖임을 명시.
