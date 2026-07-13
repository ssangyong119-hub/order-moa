# Claude 작업 지시 — W24 품목코드·과세구분

아래 전체를 구현 세션의 Claude에 붙여넣어 사용한다. **Codex가 설계 열린 결정(D1~D9)을 승인한 뒤에만 시작한다.**
설계 단일 소스: `docs/superpowers/specs/2026-07-13-order-moa-w24-product-code-tax-design.md` (이하 "설계서")

## 선행 조건 (시작 전 필수)

- **W24는 별도 승인 게이트.** Codex가 설계서 §12의 D1~D9 각 채택 여부를 확정했는지 확인하고, 컷된 항목은 구현에서 제외.
- **이카운트 엑셀 정보(설계서 §11) 사용자 확인**: 과세구분 컬럼 존재·헤더명·값 표기·매핑·가격 VAT 기준. 없으면 전 품목 'unset'로 진행(과세 UI만 제공, import 과세 보강은 생략).
- R5b(정정)가 기준 브랜치에 병합돼 있고(현재 HEAD `8689dcd` 이상), 0012까지 Supabase 적용 완료 상태 확인.

## 시작 절차

- **R5b 병합된 최신 기준에서 새 worktree로 시작**한다(이 설계 worktree `claude/w24-product-code-tax-design`가 아니라, 최신 base에서 구현용 worktree/브랜치를 새로 만든다).
  예: `git -C D:\Documents\ERP-1 worktree add -b codex/w24-product-code-tax D:\Documents\ERP-1-wt-w24-impl <최신 base 커밋>`
- `git pull --ff-only` · `git status --short --branch`로 워킹트리 clean 확인 — 깨끗하지 않으면 수정 없이 상태만 보고 후 중단.
- `web/supabase/migrations/`에 0013·0014가 비어 있는지 확인(선점됐으면 다음 번호 사용, 설계서 표기를 보고에서 정정).
- 설계서 전체 + `docs/order-moa-w23-r1-state-model-decision.md` + 0001·0008·0010·0011·0012 SQL + `docs/superpowers/specs/2026-07-11-order-moa-operations-ux-tax-design.md` §5·§6을 읽기.
- `web/.env.local` 절대 수정·이동 금지. 브라우저 확인은 데모 모드 강제 별도 포트(**cwd를 구현 worktree의 web으로** — 정션 경유 base 앱이 뜨지 않게 절대경로 지정). Claude는 Supabase 직접 적용 금지.

## 작업 목표

품목 내부코드(app_code `OM-000001`) + 품목 과세구분(과세/면세/미설정) + 주문 라인 과세 스냅샷 + 혼합 과세 거래명세서 표시. 설계서 §0 고정 원칙·§2 금액 불변을 벗어나는 구현 금지.

## 절대 지킬 것

- 0010/0011의 기존 검사 로직을 **약화하지 말 것**(D4 채택 시 동결 가드는 create-or-replace **상위집합**으로만 확장 — 기존 unit_price/quantity/product_id/unit/order_id 검사 전부 보존 + tax_type_snapshot 추가). 0012 correction 트리거·링크·표식 무접촉.
- **저장 금액은 VAT 제외 공급가 유지** — unit_price·amount(generated)·order.total에 VAT를 더하지 말 것. VAT는 명세서 표시 계산 전용(저장 안 함) → 월합계·합산표·CSV 무영향.
- **과거 주문 backfill 금지**(order_items.tax_type_snapshot는 과거 NULL 유지). 명세서 전부 NULL이면 현 "VAT 미적용" 형식 회귀 100%.
- `unit_price` 스냅샷·`amount` generated(insert 제외)·raw_text 삭제 가능·예상 마진 비저장·qc/confirmed 혼용 금지 유지.
- **app_code는 DB 트리거가 발급** — 앱에서 max+1로 만들지 말 것. app_code를 일반 편집으로 수정하지 말 것. source_code 의미(외부 import 키)를 바꾸지 말 것.
- products.tax_type backfill('taxable'→'unset', D2 채택 시)은 **최초 1회 전제** — 앱이 tax_type을 쓰기 시작한 이후 재실행 금지(마이그레이션 주석·가이드에 명시).
- 세금계산서 발행·부가세 신고·다단위·재고·OCR·이카운트 연동은 범위 밖. 세금 법률 판단·임의 과세 분류 확정 금지("세금계산서 아님, 전문가 확인" 문구 유지).
- 새 사이드바 메뉴 추가 금지.

## 구현 순서 (설계서 §10 — TDD, 테스트 먼저)

1. `web/supabase/migrations/0013_product_app_code.sql` — 설계서 §5.2(app_code 컬럼·카운터 테이블·SECURITY DEFINER 발급 함수·BEFORE INSERT 트리거·backfill·NOT NULL·unique). **작성만 — Codex 검수와 사용자 SQL Editor 적용 전 절대 실행 금지.**
2. `web/supabase/migrations/0014_product_tax.sql` — 설계서 §9(tax_type 3종 확장·DEFAULT unset·backfill·order_items.tax_type_snapshot+CHECK·D4 채택 시 동결 가드 확장). 작성만·적용 금지.
3. `docs/guide-apply-0013-product-app-code.md` · `docs/guide-apply-0014-product-tax.md` — 적용 절차 + GA1~GA6·GB1~GB6 실측(설계서 §10-b, guide-apply-0012 형식·begin…rollback 래핑).
4. `web/src/lib/tax.ts` + `tax.test.ts` — `computeStatementTax` 순수 함수(설계서 §6.2·§10-b 2). 실패 테스트 먼저.
5. `web/src/lib/domain/types.ts` · `product-store.ts`(+test) — Product.appCode/taxType, PRODUCT_COLS·폴백 확장·insert/update(tax만, app_code는 트리거)·mapProduct(설계서 §6.2·§10-b 6).
6. `web/src/lib/order-store.ts`(+test) — toItemInserts tax_type_snapshot, ORDER_SELECT·mapDbOrder·폴백·OrderLine.taxTypeSnapshot, `taxSchemaReady`류 게이팅(설계서 §6.2·§10-b 3·4·7).
7. `web/src/lib/order-correction.ts`(+test) — 정정본 tax 스냅샷 복사(설계서 §6.4·§10-b 5·8).
8. `web/src/app/page.tsx` · `product-management-view.tsx` — 명세서 세무형 분기(전부 NULL=현 형식, 스냅샷 있으면 면세/과세/부가세/합계, 미설정 섞이면 안내)·과세구분 select·app_code 표시/검색·품목 CSV 열(설계서 §6.2·§8).
9. 검증: root/web `npm test` · web `npm run build` · `npx tsc --noEmit` · web `npm audit --audit-level=low` · `git diff --check`. 시작 시 기존 수 기록(기준선 root 5 / web 205).

## 마이그레이션 작성과 적용의 분리 (게이트)

- 0013/0014는 **파일 작성만.** Claude는 SQL을 실행하거나 Supabase에 적용하지 않는다.
- Codex 승인 → 사용자 SQL Editor에서 0013→0014 순서 적용(`Success. No rows returned`) → GA1~GA6·GB1~GB6 실측 → 로그인 DB 모드에서 과세 혼합 주문 1건 명세서 + app_code 채번 + F5 유지 확인.
- 적용 전에는 DB smoke를 "완료"로 보고하지 말 것(0011/0012 관례). 앱 코드는 0013/0014 미적용 DB에서도 폴백으로 안 깨져야 한다(과세/app_code UI 숨김, 명세서 현 형식).

## 브라우저 smoke (데모 모드)

설계서 §10-b "브라우저 smoke" 1~8을 수행(과세구분 저장·표시·검색, 혼합/전과세/전면세/미설정 명세서, 과거 주문 회귀, 금액 불변, 정정본 tax 보존, 폴백 UI 숨김).

## 문서와 최종 보고

- `docs/agent-worklog.md`에 W24 기록, `docs/NEXT-SESSION.md` 갱신, 진행판 갱신(`docs/order-moa-progress-data.json` → `py -3 scripts/generate-progress.py`).
- 구현 후 변경 파일 재독으로 자체 리뷰: 금액 불변(VAT 미저장)·과거 backfill 금지·스냅샷 시점·app_code 트리거 발급·source_code 의미·0010/0011/0012 무약화·범위.
- 최종 보고: ① 구현 내용·파일별 역할 ② 테스트 수/build/tsc/audit/diff-check ③ 데모 smoke 결과 ④ 0013/0014 적용 대기 상태와 GA/GB 실측 절차·사용자 안내 ⑤ Codex 검수 포인트(D1~D9 반영·금액 불변·backfill 정당성·동결 가드 확장) ⑥ 이카운트 과세 컬럼 확인 결과와 미확인 시 'unset' 진행 여부.

커밋·푸시는 세션 지시에 따른다. 게이트(SQL 적용)는 사용자·Codex 몫이다.
