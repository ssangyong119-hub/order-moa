# 세션 인계 — 오더모아 (Order-Moa) MVP

작성일: 2026-07-08 (DB 모드 실측 마무리 후)
작업 폴더: `D:\Documents\ERP-1` ← **Claude Code를 반드시 이 폴더에서 열 것** (자동낙찰기 `D:\Projects\new app`에서 열면 문서 클릭·경로가 어긋남)
브랜치: `codex/integrate-mvp-docs-web`

> 새 세션은 이 문서 + `docs/order-moa-system-meta-prompt.md`(헌장) + `docs/order-moa-progress-data.json`(진행 단일 소스)를 먼저 읽고 시작한다.

## 환경
- 스택: Next.js 15 + TS + Vitest, Supabase(Auth+Postgres+RLS). 배포 없음 — 로컬(`cd web; npm run dev`).
- Supabase: 기존 `yangsan-inventory` 프로젝트 **공유** → 오더모아 객체는 전부 `ordermoa_` 접두사. `web/.env.local`(미추적) 있으면 DB 모드, 없으면 데모 모드.
- **로그인**: 매직링크는 무료 메일 rate limit으로 자주 막힘 → **비밀번호 로그인 추가됨**(`a696a36`). 실측 계정은 Supabase Auth에 password+Auto Confirm으로 사용자가 생성(예: `admin@ordermoa.app`).
- 협업: **Claude는 커밋/머지/push 안 함 — 보고만.** 커밋은 Codex 판단. 마이그레이션·스키마는 Codex 승인 게이트.
- ⚠️ cwd가 매 명령 후 리셋될 수 있음 → git/npm 전 항상 `cd "D:/Documents/ERP-1"`.

## 이번 세션(2026-07-07~08)에 한 일 — 커밋
- `755188c` docs: 발주 원문 DB 검증 기록(W09 적용/실측 문서화)
- `ed2898c` feat: 발주 원문(raw_text) 저장/보기/삭제(W09) + 0006 order_import 링크 마이그레이션 — **0006 Supabase 적용 완료, DB 실측 완료**
- `89315d2` feat: 단가 관리(W04) + 매입처 연락처/주소(0005) — **0005 Supabase 적용 완료**
- `2acb14f` feat: 품목·별칭 관리(W03)
- `d36cfae` feat: 매입처 관리 화면(W07)
- `f2db8c2` feat: 합산표 개선 팩(W17) — 발주 문장 템플릿·누락 카운터·미지정 뱃지·매입처 색·문구
- `73b0595` docs: 피드백 로드맵(설계 문서 + 진행판 갱신)
- `a696a36` feat: 비밀번호 로그인 fallback / `38f4e6c` fix: 0004 idempotent / `7d3de93` feat: 거래처 관리 CRUD + 매입처 영속화
- (앞선 세션) `fc59baa`~ 헌장 4종, 진행판 세분화(W01~W17), 즉석 품목 등록
- 마무리 리뷰에서 `NEXT-SESSION.md`까지 최신 상태로 갱신.

## 현재 상태
- git: `codex/integrate-mvp-docs-web`. 최신 커밋/원격 상태는 `git status --short --branch`와 `git log -1 --oneline`으로 확인.
- **✅ 완료**: W01(헌장) · **W02 거래처 · W03 품목·별칭 · W04 단가 · W07 매입처(연락처/주소 포함) = 기준정보 4종 전부** · W05·W06(매입처 DB화) · W08(주문 저장 실측) · **W09(raw_text 저장/삭제)** · **W10(저장 주문 기반 합산표)** · **W11(명세서 재출력+인쇄 마감)** · **W12(거래처별 월 합계)** · W17(합산표 개선 팩). → **8c 1차 마무리.**
  - 0004_suppliers.sql **Supabase 적용 완료**. 비밀번호 로그인 → 발주 확정 → **F5 후 주문 유지 실측 성공**.
  - 기준정보 4종은 **데모 모드 브라우저 실측 완료**(추가/수정/보관/복원/별칭/단가→파싱 반영). **DB 모드도 2026-07-08 실측 완료** — 매입처 연락처/주소 저장→F5 유지, 단가 저장→F5 유지, 변경 단가→발주 파싱 반영, 주문 확정 1건 확인.
  - 0005_supplier_contact.sql **Supabase 적용 완료**(SQL Editor `Success. No rows returned`). 이제 DB(로그인) 모드에서 매입처 phone/address select가 막히지 않아야 함.
- DB 실측 메모(2026-07-08): 검수용 매입처 `검수매입처-070842476` 추가됨. `가람식당/두부` 단가를 2,801원으로 저장→F5 유지→`두부 3판` 8,403원 파싱→주문 확정 후, 현재 단가표는 원래 2,500원으로 복원함(확정 주문은 스냅샷 검증용으로 남음).
- W09 DB 실측 메모(2026-07-08): 0006 적용 후 `가람식당`에 `콩나물 1박스 / 두부 1판 / 미나리 1단` 주문 확정 → 주문 상세에서 원문 표시 → 원문 삭제 → F5 후 원문 없음 유지, 주문/금액/명세서 유지 확인.
- W10 메모(2026-07-08): 합산표는 DB 모드에서 `loadOrders`로 불러온 저장 주문을 날짜·거래처 필터로 집계한다. 신규 마이그레이션 없이 기존 `aggregate.ts`를 재사용하고, 대시보드/합산표 문구와 빈 조건 안내를 현재 상태에 맞게 보정했다.
- W11 메모(2026-07-08): 저장 주문 거래명세서 재출력 흐름을 확인하고, 인쇄 양식 하단 마감을 보정했다. 표 선은 `border-collapse`로 이어 붙이고, 공급가 합계는 표 `tfoot` 안에 정렬, 비고/인수확인 마감행과 고정 15행으로 A4 출력이 일정하게 떨어지도록 조정했다.
- W12 메모(2026-07-08): 조회 메뉴에 '거래처별 월 합계' 추가. `monthly-summary.ts` 순수 함수가 저장된 주문의 `order.total`(스냅샷)만으로 월·거래처별 합계를 낸다(customer_prices 재조회 없음 — 데모에서 단가 99,999원 변경 후에도 과거 월 합계 불변 확인). 세금계산서 발행 아님을 화면에 명시. 마이그레이션 없음.
- W15 메모(2026-07-08): '데이터 내보내기' 화면을 열어 거래처·매입처·품목/별칭·단가·주문 목록을 CSV로 내려받을 수 있게 했다. 월 합계 화면에도 CSV 버튼을 추가했다. 내보내기만 완료했고, 엑셀 가져오기/복원은 후순위다.
- **W13 메모(2026-07-08)**: 실제 발주 테스트 1차 라운드. 현장식 문장으로 파서 최소 보강 2건 — (1) **한 줄 공백/붙여쓰기 다품목 분리**(`splitByCountClusters`: 수량단위 클러스터 2개↑면 분리, 규격+수량 `청양고추 1kg 2봉`은 미분리). 뒤 품목이 경고 없이 유실되던 치명 문제 해결. (2) 종결어미 `이요`·조사 `는/은` 제거. `real-order-fixture.test.ts`에 W13 섹션 11건 추가(web 117→**128**). 브라우저 데모 smoke 2건(공백/완전붙여쓰기 다품목 분리→확정→명세서→합산표, 콘솔 앱에러 0). 스키마·마이그레이션 0, 스냅샷 원칙 유지. 상세: `docs/agent-worklog.md`(2026-07-08 W13). 변경: `web/src/lib/order-parser.ts`, `real-order-fixture.test.ts`, 진행판 3종.
- 검증 최신값(2026-07-08, W13): root `npm test` 5/5 · web `npm test` **128/128** · `npm run build` 성공 · `npm audit --audit-level=low` 0건 · `git diff --check` 통과.

## 다음에 이어서 할 일 (우선순위)
0. **W18 Phase 1 UX** — 주문일(KST) 표시/수정 · 파싱 화면 단가 Enter이동+변경단가 전체저장 · 주문목록 날짜조회. 마이그레이션 없음, 데모 실측 완료(합산표/월합계 무영향 확인함).
1. **Phase 2 — 카테고리 6종(농산물·공산품·냉식·육류·수산·기타)** — 방향 좋음, **스키마 필요라 마이그레이션 세션으로 분리**. RLS·교차회사 검사·idempotent backfill 필수.
2. **Phase 3 — 다단위 + 기본단가/거래처 예외(product_units)** — 스키마 설계 필요, 별도 Phase.
3. **[위험] 전용 Supabase 분리 논의** — 공유 쿼터 경고. CSV 백업 수단 있어 분리 리스크 낮아짐 → 적기.
4. **엑셀 가져오기(import)** — W15 나머지 절반(초기 세팅용, 후순위). 백업에 archived 포함도 여기서.
5. **잔여 보강** — 인쇄 실물 육안(A4 1장), 품목 15개↑ 다중 페이지, 명세서 채번(별도 승인). W14(명세서 양식 심화)·미수금·세금(2차)은 헌장 순서대로.

## 사용자 실사용 피드백 백로그
> 사장님 실사용에서 나온 개선 요구를 모아 둔 곳. **아래 "추후" 항목은 기록만 — 해당 Phase 전까지 구현하지 않는다.**

### Phase 1에서 구현 완료 (W18, 2026-07-08)
- **주문일 표시/수정** — 파싱 확인 화면에 주문일 칸. KST 기준(새벽 UTC 오차 수정). 어제 발주도 날짜 바꿔 확정.
- **파싱 화면 단가 일괄 저장** — 단가 칸에서 Enter로 다음 칸 이동, "변경 단가 전체 저장" 한 번으로 저장(불편했던 곳은 단가 관리 화면이 아니라 파싱 확인 화면이었음).
- **주문 목록 날짜 조회** — 기본 오늘, 날짜 선택·전체 보기(클라이언트 필터, 전역 orders 무변경이라 합산표/월합계 무영향).

### 추후로 미룸 (기록만 — 이번엔 구현 안 함)
- **품목 카테고리 6종** (농산물/공산품/냉식/육류/수산/기타) — **Phase 2, 스키마 필요**(마이그레이션 세션으로 분리, RLS·교차회사·idempotent backfill 필수).
- **품목 다단위 구조** — 한 품목에 여러 단위, **환산은 일단 하지 않음**. **Phase 3, `product_units` 스키마 필요**.
- **기본 판매단가 + 거래처별 예외 단가 구조** — 품목 기본가 위에 거래처별 예외가. **Phase 3, 스키마 필요**.
- **단가 관리 화면 재설계** — 위 기본가/예외가 구조에 맞춰 화면 개편.
- **품목 검색/별칭 관리 UX 개선** — 파싱·품목 화면 검색/별칭 편집 흐름 다듬기.
- **주문 목록 서버 날짜/기간 조회** — 지금은 클라 필터. 데이터 커지면 `orderListOrders` 별도 상태로 서버 기간 조회(전역 orders 덮어쓰지 말 것).
- **엑셀 가져오기/import** — W15 나머지 절반(초기 세팅용). 지금은 내보내기(export)만 있음.

> 스키마가 필요한 항목(카테고리·다단위·기본/예외 단가)은 반드시 **별도 마이그레이션 세션**에서 RLS·교차회사 검사·idempotent backfill(`on conflict do nothing` 또는 `if not exists`)을 포함해 진행.

## 꼭 알아야 할 맥락·주의
- **좁은 MVP**: 세금계산서 발행·회계 마진·재고평가·매입처 원가이력·OCR·카톡 자동·이카운트 연동 = 후순위/제외. 사이드바에 2차 메뉴 추가 금지.
- **용어(피드백 정리)**: 주문 확정=거래처 발주를 우리 판매 장부에 저장 / 매입처 발주=우리가 매입처에 보낼 구매 문장. **매입처 쪽 거래명세서는 매입처가 발행 — 우리가 안 만듦.** (상세 `docs/order-moa-feedback-design-2026-07-07.md` §0)
- **DB 불변 규칙(헌장 §3)**: `order_items.amount`는 generated → insert 제외. `unit_price`=확정 시점 스냅샷, 과거 명세서는 customer_prices 재조회 금지. 예상 마진 저장 안 함. raw_text 삭제 가능(확정 주문 유지). soft delete.
- **검증 한 세트**: root `npm test` · web `npm test` · web `npm run build` · web `npm audit --audit-level=low`. UI 변경은 브라우저 확인까지. 진행판 고치면 `py -3 scripts/generate-progress.py`로 HTML/XLSX 재생성(JSON이 단일 소스).
- **[위험] 공유 Supabase 무료 쿼터 경고**("Grace period is over")가 대시보드에 떠 있음 → 한도 소진 시 로그인·저장 막힐 수 있음. 오더모아 전용 프로젝트 분리 시점 논의 필요.
- **[나중]** 매직링크 정식화(Supabase Auth URL Configuration에 개발 URL 등록 — 기본 localhost:3000만 허용됨), 발주 문장 템플릿 설정 화면(2차).
- 관련 문서: `order-moa-system-meta-prompt.md`(헌장) · `order-moa-expanded-roadmap.md` · `order-moa-module-map.md` · `order-moa-ai-working-rules.md` · `order-moa-feedback-design-2026-07-07.md` · `order-moa-progress-{data.json,dashboard.html,tracker.xlsx}`.
