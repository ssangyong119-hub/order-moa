# Claude 작업 지시 — W23-R5b 확정 주문 정정

아래 전체를 구현 세션의 Claude에 붙여넣어 사용한다. **Codex가 설계(D1~D8)를 승인한 뒤에만 시작한다.**
설계 단일 소스: `docs/superpowers/specs/2026-07-12-order-moa-r5b-correction-design.md` (이하 "설계서")

---

오더모아 W23-R5b — 확정 주문 정정을 구현해주세요.

작업 위치: `D:\Documents\ERP-1`
브랜치: `codex/integrate-mvp-docs-web`

## 가장 먼저 확인할 것

- `git pull --ff-only` · `git status --short --branch` — 워킹트리가 깨끗하지 않으면 수정 없이 상태만 보고 후 중단.
- **W23-R4(대시보드)가 커밋/머지 완료됐는지 확인.** 안 됐으면 중단하고 보고(page.tsx 충돌 방지).
- `web/supabase/migrations/`에 0012가 비어 있는지 확인(다른 작업이 선점했으면 다음 번호 사용, 설계서의 0012 표기를 보고에서 정정).
- 설계서 전체 + `docs/NEXT-SESSION.md` + `docs/order-moa-w23-r1-state-model-decision.md` + 0010/0011 SQL을 읽기.
- Codex 승인 결과(D1~D8 각 채택 여부)를 확인하고, 컷된 항목은 구현에서 제외.
- `web/.env.local` 절대 수정·이동 금지. 브라우저 확인은 데모 모드 강제 별도 포트(launch.json `ordermoa-demo-3210`). Claude는 Supabase 직접 적용 금지 — 커밋/푸시는 세션 지시에 따름.

## 작업 목표

confirmed 주문의 `취소 확인 → 검수표로 복사 → 수정 → 새 주문 재확정(원주문 링크)` 정정 흐름. 설계서 §0 고정 원칙과 §5.3 전이 대조를 벗어나는 구현 금지.

## 절대 지킬 것

- 0010/0011의 함수·트리거를 교체·수정하지 말 것(0012는 신규 객체만).
- `saveOrder`의 qc→items→승격 구조, `closeOrderPrices`, `unit_price` 스냅샷, `amount` generated(insert 제외), raw_text 삭제 가능, 예상 마진 비저장 원칙 유지.
- **취소 선행 순서 고정**(설계서 §7) — 생성을 먼저 하는 변형 금지.
- 전역 `orders` 배열에 cancelled 주문을 절대 섞지 말 것(이력은 별도 상태).
- [수량만 확정]을 정정 모드에서 노출하지 말 것(qc·confirmed 혼용 금지).
- 세금/과세, app_code, 다단위, OCR, 기본 매입처 저장, 정정 사유 입력란은 범위 밖.
- 새 사이드바 메뉴 추가 금지(이력은 주문 목록 안 토글).

## 구현 순서 (설계서 §10 — 테스트 먼저)

1. `web/supabase/migrations/0012_order_correction_link.sql` — 설계서 §5.4 초안 기반 작성만. **적용 금지.**
2. `docs/guide-apply-0012-order-correction-link.md` — 적용 절차 + G1~G7 실측 스크립트(설계서 §9.3, guide-apply-0011 형식·begin…rollback 래핑).
3. `web/src/lib/order-correction.ts` + 테스트 — 순수 헬퍼(설계서 §9.1: orderToParsedLines·canCorrectOrder·컨텍스트 초기화·orders 교체).
4. `web/src/lib/order-store.ts` + 테스트 — `OrderStatus`에 "cancelled"·`correctedFromOrderId`·ORDER_SELECT 폴백(`isMissingColumnError`, `correctionSchemaReady`)·`toOrderInsert/saveOrder` opts·`cancelOrder`·`correctConfirmedOrder`·`loadCancelledOrders`(설계서 §6.2~6.3, mock 테스트 §9.2 — 기존 fake 빌더 재사용).
5. `web/src/app/page.tsx` — [정정] 버튼(confirmed 행)·[정정본] 뱃지·검수표 정정 모드(배너·거래처 잠금·버튼 라벨)·이력 토글·데모 동등 동작·문구(설계서 §6.4·§11). status 소비처 전수 재점검(설계서 §6.3 목록).
6. 검증: root/web `npm test` · `npm run build` · `npm audit --audit-level=low` · `git diff --check`. 시작 시 기존 테스트 수 기록(기준선 web 186/186 + R4 증가분).

## 브라우저 smoke (데모 모드)

설계서 §9.4의 1~7을 그대로 수행(정정 완료·이중 집계 없음·월합계·이력·qc 미노출·컨텍스트 초기화·기존 회귀·390px·콘솔 0).

## DB 적용·실측 (게이트 — Claude가 하지 않음)

- Codex 승인 → 사용자 SQL Editor에서 0012 적용(`Success. No rows returned`) → G1~G7 실측 → 로그인 DB 모드에서 정정 1건 + F5 유지 + 0012 미적용 폴백은 적용 전에 미리 확인.
- 적용 전에는 DB smoke를 "완료"로 보고하지 말 것(0011 관례).

## 문서와 최종 보고

- `docs/agent-worklog.md`에 W23-R5b 기록, `docs/NEXT-SESSION.md` 갱신(R5b 결과·W24는 여전히 별도 승인), 진행판 갱신(`docs/order-moa-progress-data.json` → `py -3 scripts/generate-progress.py`).
- 구현 후 변경 파일 재독으로 자체 리뷰: 스냅샷·취소 선행·전역 orders 순수성·혼용 금지·범위.
- 최종 보고: ① 구현 내용·파일별 역할 ② 테스트 수/​build/audit/diff-check ③ 데모 smoke 결과 ④ 0012 적용 대기 상태와 사용자 실측 절차 안내 ⑤ Codex 검수 포인트(설계서 §5.3 전이 대조 재확인 포함) ⑥ D1~D8 중 컷된 항목의 잔여 영향.
