# 세션 인계 — 오더모아 (Order-Moa) MVP

작성일: 2026-07-08 · 최종 갱신 2026-07-11 (W23 문서 전수 개편 후)
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
- **W19 메모(2026-07-09, Phase 2 카테고리)**: 품목 카테고리 6종(농산물/공산품/냉식/육류/수산/기타) 도입. **컬럼 1개**(`ordermoa_products.category text NOT NULL DEFAULT '기타' CHECK 6종`) — 6종 고정이라 별도 테이블 없음. **마이그레이션 0007 Supabase 적용 완료**(사용자 SQL Editor `Success. No rows returned`). 품목·별칭 관리 화면에 카테고리 select·목록 표시·필터 추가. **order_items·합산표·명세서·월합계·파서 전부 무변경**(카테고리=품목 마스터 속성, 스냅샷 무관). 적용 가이드: `docs/guide-apply-0007-product-category.md`. 상세: `docs/agent-worklog.md`(2026-07-09 W19). Phase 3(다단위·기본/예외 단가)는 백로그 유지·미구현.
- **W20 메모(2026-07-09, 실 엑셀 기준정보 초안)**: **사용자 결정 — "상호명은 제외하되, 품목·단위·단가 기준정보는 실제 엑셀 패턴을 우선한다."** 친구 실운영 이카운트 엑셀(저장소 밖·미커밋)의 `품목마스터.xlsx`+`단가마스터.xlsx`를 품목코드로 조인→정제해 **`docs/order-moa-catalog-real-draft.json`(1590품목, 588KB)** 산출. `scripts/extract-real-catalog.py`(경로 인자·self-check). 괄호 화이트리스트로 공급사/브랜드 제거(식별정보 자체 스캔 **0건**), 단가 100원 반올림, 카테고리 6종 키워드 초안(자동 60.8%, 나머지 needsReview). **import(DB 반영)는 W21로 분리 — 이번은 초안까지만.** `.gitignore`에 원시데이터 유출 안전망 추가. 관찰: 같은 품목명 다규격/다단위 **210그룹(549품목)** = Phase 3 다단위 근거 / 6종이 조미료·장류·가공을 못 담음(기타 623). 상세: `docs/agent-worklog.md`(2026-07-09 W20).
- **W21 메모(2026-07-09, 카탈로그 import 미리보기/검수 + DB 반영)**: W20 초안(1590품목)을 앱에서 업로드·검수→선택분만 기준정보로 반영하는 흐름. `catalog-import.ts`(순수 로직+test) · `catalog-import-view.tsx`(업로드·요약·필터·50/페이지·행편집·중복명 경고·기존일치). 데이터 뷰를 "데이터 내보내기/가져오기"로 확장(새 메뉴 없음). DB 모드는 `applyCatalogImportToDb`가 200건 배치 insert/update, source_code 멱등 재분류, 별칭 upsert 충돌 무시 후 products 재조회. 데모 모드는 메모리 반영. **0007·0008 Supabase 적용 완료**(사용자 SQL Editor `Success. No rows returned`). 이후 Usage 확인 결과(All projects DB 0.028/0.5GB, Storage 0/1GB, Egress <1%)로 **쿼터보다 데이터 품질(중복명·검토필요)이 핵심 리스크**로 정정. 상세: `docs/agent-worklog.md`(2026-07-09 W21/W21-C).
- 검증 최신값(2026-07-11, **W23-R3 + 검수 보강 세션**): root `npm test` 5/5 · web `npm test` **173/173**(planCloseOrderPrices 11 + planCustomerPriceSaves 4 + closeOrderPrices/saveOrder mock 6 신규) · `npm run build` 성공 · `tsc --noEmit` 통과 · `npm audit --audit-level=low` 0건 · `git diff --check` 통과(CRLF 경고만). 데모 브라우저 smoke 통과·콘솔 0. (직전 W23 문서 세션값은 web 150/150.)
- **W21-C 메모(2026-07-09, DB smoke + 전략 점검)**: W21-A/B는 커밋 `66d1af2`로 반영됨. 실 DB smoke는 **로그인 인증 필요 → Claude(헤드리스) 실행 불가**, 사용자 로그인 세션에서 실행한다. 사용자가 소량 import 후 F5 유지·재반영 중복 없음·파싱 매칭을 확인했다. 이후 Supabase Usage(All projects) 확인 결과 사용량이 매우 낮아 유료/전용 분리는 급하지 않음. **전체 반영 판단은 쿼터가 아니라 데이터 품질 기준**: 중복명/검토필요는 보류하고, 검토필요 아닌 신규·중복명 제외 품목은 한 번에 반영 가능.
- **W22 메모(2026-07-09, 품목 기본 출고단가 base_sale_price — 적용·실측 완료)**: 베타 검증용 최소 구조. 거래처별 단가 없으면 발주 금액 0원 → 품목에 **기본 출고단가**를 두고 fallback. **단가 우선순위 = 거래처별(customer_prices) > 품목 base_sale_price > 미등록(0원)**, 단일 소스 `resolveSalePrice`(domain)로 파서·화면 공유. 파싱 화면에 **"기본 단가 적용"** 뱃지. 카탈로그 import가 `repSalePrice→base_sale_price` 저장(재import 시 기존 품목도 갱신), **customer_prices엔 안 넣음**. `order_items.unit_price` 스냅샷 불변, 과거 주문 재계산 없음. 품목·별칭 관리에 기본 출고단가 입력칸 추가. 0009는 적용됐고 카탈로그 재import·파싱 fallback 실측도 완료했다. 코드는 미적용 DB에서도 **3단 컬럼 폴백**(FULL→category만→base)으로 안 깨진다. 적용 절차 기록: `docs/guide-apply-0009-product-base-sale-price.md`. 구현 당시 검증: root 5/5 · web **149/149** · build 성공 · audit 0 · diff-check clean. 상세: `docs/agent-worklog.md`(2026-07-09 W22). Phase 3(product_units 다단위)는 여전히 별개·미착수.
- **W22 실측 완료(2026-07-10~11, 사용자)**: **0009 Supabase 적용 완료**(`Success. No rows returned`) → 개별 품목 기본 출고단가 저장 → 파싱에서 "기본 단가 적용" 금액 표시 실측 확인 → **카탈로그 735건 DB 반영 완료**(신규 735 · 별칭 207건 시도 · 전부 성공, 중복명·검토필요 품목은 앱이 자동 제외). 잔여: 중복명 품목은 이름 구분(예: `콩나물(시루)`) 후 개별 반영, '기타'로 들어간 카테고리 정리(급하지 않음). Claude 후속 디버깅 1건(`c3dc098` — 기본 단가 fallback 라인의 일괄 저장 제외)까지 푸시됨.
- **W23 기획 준비(2026-07-11, Codex)**: 실사용 인터뷰를 반영해 `가격 포함 바로 최종 확정`과 `수량 확인→매입처 발주→가격 입력→최종 확정`을 함께 제공하는 선택형 흐름을 사용자와 합의했다. 기준 설계: `docs/superpowers/specs/2026-07-11-order-moa-dual-confirmation-workflow-design.md`. Claude 문서개편 지시: `docs/task-prompt-W23-system-redesign-planning.md`.
- **W23 문서 전수 개편(2026-07-11, Claude — 문서 완료·코드 미착수)**: ① 문서·구현 충돌 감사 `docs/order-moa-document-audit-2026-07-11.md`(17개 문서 × 코드 대조, 충돌 7류 확인·처리) ② 새 기준 설계 `docs/order-moa-system-redesign-2026-07-11.md`(15개 절 — 용어·상태 전이표·두 경로·가격 마감 UX·데이터 대안 비교(권장 방향: orders 단일 소스 유지, 내부 표현은 R1에서 비교)·단계 R0~R8·성공/중단 기준·승인 게이트) ③ 헌장·제품정의·요구(F14~F19)·기능(§5.3)·화면(§2-1/§16/§17)·DB(적용 현황·0006 order_id)·모듈맵(M17~M20)·로드맵(W23 단계표)·검수(§12)·검증(§12) 전수 정렬. **앱 코드·SQL 무변경.** 스냅샷 원칙은 "판매단가가 최종 확정되는 시점"으로 재정의(기존 주문 의미 불변). OCR은 "제외"→"검증 게이트 있는 보류 실험(입력 어댑터)"로 재분류.

## 다음에 이어서 할 일 (우선순위)
0. **W23-R1 ✅ 게이트 통과(2026-07-11)** — 실험 E1~E4 사용자 실측 전부 기대값(2500/7500 재계산 · 의도된 23502 · ok 2) + **0010 Supabase 적용 완료**(quantity_confirmed 상태·역전이 금지·confirmed 라인 스냅샷 가드 트리거 가동). 결정 기록 `docs/order-moa-w23-r1-state-model-decision.md`(권장안 1b-ii 채택·실측 기록 포함). Codex 사후 검수: §8 열린 결정 + 0010 적용 사실.
1. **W23-R2 ✅ 구현·데모 smoke 완료(2026-07-11)** — 파싱 화면 "수량만 확정 (가격 나중)" 버튼, 가격 대기 주문 = 합산표 포함 · 명세서 "가격 마감 후" 잠금 · 월합계 제외 · 목록 [가격 대기] 뱃지·금액 미정 · CSV 상태 열. 경로 A(주문 확정→명세서) 회귀 정상, 콘솔 0, web 152/152. **미커밋 — Codex 검수 대기.** 남은 실측: 로그인 DB 모드에서 수량만 확정→F5 유지(사용자).
2. **W23-R3 ✅ 구현 + 검수 보강 + DB 앱 경로 smoke 완료(2026-07-11, Claude/Codex/사용자)** — 가격 마감 화면(`PriceCloseView`): 품목별 오늘 매입가 1회 입력 → 라인별 판매가 제안(거래처 단가 > 기본 출고단가, 최근 확정가 참고 표시)·참고 마진 → 수정 → **최종 확정**. `closeOrderPrices`(order-store): items unit_price UPDATE(라인 id 기준·`.select("id")`로 **정확히 1행 검증**, 0/2행이면 승격 없이 오류) → orders.status='confirmed'(`.eq status=quantity_confirmed` 경합 차단) 순서. 순수 계획 함수 `planCloseOrderPrices`로 입력 검증(누락/음수/NaN/무한대/중복 id/타주문 id/라인수 불일치). **검수 보강 5종**: ①**0011 INSERT 가드**(confirmed/cancelled 주문에 order_items INSERT 차단, qc 허용 — 트리거 insert/update/delete 전부) + `saveOrder`를 **qc 삽입→items→confirmed 승격**으로 재구성(경로 A 유지) ②영향행 검증(위) + mock 테스트 ③기준정보 저장 실패를 최종 확정 성공 메시지와 분리(성공 flash가 실패를 안 덮음) ④같은 품목 여러 줄·다른 단가면 거래처 기본단가 저장 **조용한 덮어쓰기 금지**(제외+경고, `planCustomerPriceSaves`) ⑤`order_imports.confirmed_at`=주문 등록 시각(가격 마감 아님) 문서화. **0011 마이그레이션은 사용자 SQL Editor에서 적용 완료**(`Success. No rows returned`). 로그인 DB 모드에서 가격 마감→최종 확정→거래명세서 표시까지 실측 성공. H1~H7b 수동 가드 실험은 SQL Editor 임시 테이블 세션 문제로 보류하며, 앱 경로 검증을 우선 신뢰한다. 마진 자동화·자동 저장 없음. web **173/173**, 콘솔 0. **미커밋 — Codex 검수·커밋 대기.**
3. **W23-R5a — 운영 UX 팩 (다음 구현, R4보다 선행 가능)** — 단가 입력 전체선택/Enter 이동, 단가 관리의 기본·실제 적용 단가 표시, 매입처 발주 문장 날짜·직접 수정·명시 재생성, 합산표의 이번 발주만 매입처 재배정. **마이그레이션 없이 R3 경로를 보존하는 작은 UX 팩**. 기준/작업지시: `docs/superpowers/specs/2026-07-11-order-moa-operations-ux-tax-design.md`, `docs/task-prompt-W23-R5a-operational-ux-pack.md`.
4. **W23-R4 — 대시보드 오늘 업무 큐** — R5a 후 또는 독립 세션에서 진행. R6~R8은 `docs/order-moa-expanded-roadmap.md` W23 단계표.
5. **R5b / W24 (승인 뒤 별도)** — R5b는 확정 주문 `취소→복사→재확정` 정정과 원주문 연결. W24는 모든 품목의 오더모아 자체코드(`OM-000001` 형식)·면세/과세/미설정·주문 라인 과세 스냅샷·혼합 명세서이며, 이카운트 export의 과세구분 컬럼 확인이 선행된다. 두 항목 모두 별도 마이그레이션/Codex 승인 게이트.
4. **Phase 3 — 다단위 + 거래처 예외단가 재설계(product_units)** — W20 실데이터 근거(동일 품목명 다규격 210그룹). R6(해석 기억)과 맞물림 — 백로그.
5. **잔여 보강** — 카탈로그 중복명 품목 이름 구분 반영·카테고리 정리(사용자, 짬날 때) · 인쇄 실물 육안 · 명세서 채번(별도 승인) · 전용 Supabase 분리(Usage 낮아 보류) · W14·미수금·세금(2차)은 헌장 순서대로.

## 사용자 실사용 피드백 백로그
> 사장님 실사용에서 나온 개선 요구를 모아 둔 곳. **아래 "추후" 항목은 기록만 — 해당 Phase 전까지 구현하지 않는다.**

### Phase 1에서 구현 완료 (W18, 2026-07-08)
- **주문일 표시/수정** — 파싱 확인 화면에 주문일 칸. KST 기준(새벽 UTC 오차 수정). 어제 발주도 날짜 바꿔 확정.
- **파싱 화면 단가 일괄 저장** — 단가 칸에서 Enter로 다음 칸 이동, "변경 단가 전체 저장" 한 번으로 저장(불편했던 곳은 단가 관리 화면이 아니라 파싱 확인 화면이었음).
- **주문 목록 날짜 조회** — 기본 오늘, 날짜 선택·전체 보기(클라이언트 필터, 전역 orders 무변경이라 합산표/월합계 무영향).

### Phase 2에서 구현 완료 (W19, 2026-07-09 · 0007 적용 완료)
- **품목 카테고리 6종** (농산물/공산품/냉식/육류/수산/기타) — 컬럼 1개(`category`, 6종 CHECK, DEFAULT '기타'). 품목·별칭 관리에 select·목록·필터. 0007 마이그레이션 Supabase 적용 완료. 스냅샷·집계 무영향.

### 추후로 미룸 (기록만 — 이번엔 구현 안 함)
- **품목 다단위 구조** — 한 품목에 여러 단위, **환산은 일단 하지 않음**. **Phase 3, `product_units` 스키마 필요**.
- **기본 판매단가 + 거래처별 예외 단가 구조** — 품목 기본가 위에 거래처별 예외가. **Phase 3, 스키마 필요**.
- **단가 관리 화면 재설계** — 위 기본가/예외가 구조에 맞춰 화면 개편.
- **품목 검색/별칭 관리 UX 개선** — 파싱·품목 화면 검색/별칭 편집 흐름 다듬기.
- **주문 목록 서버 날짜/기간 조회** — 지금은 클라 필터. 데이터 커지면 `orderListOrders` 별도 상태로 서버 기간 조회(전역 orders 덮어쓰지 말 것).
- **엑셀 가져오기/import** — W15 나머지 절반(초기 세팅용). 지금은 내보내기(export)만 있음.

> 스키마가 필요한 항목(카테고리·다단위·기본/예외 단가)은 반드시 **별도 마이그레이션 세션**에서 RLS·교차회사 검사·idempotent backfill(`on conflict do nothing` 또는 `if not exists`)을 포함해 진행.

## 꼭 알아야 할 맥락·주의
- **좁은 MVP**: 세금계산서 발행·회계 마진·재고평가·매입처 원가이력은 후순위, 카톡 자동·이카운트 연동은 제외. OCR은 R8 검증 게이트 전 보류 실험이며 핵심 흐름과 분리한다. 사이드바에 2차 메뉴 추가 금지.
- **용어(피드백 정리)**: 주문 확정=거래처 발주를 우리 판매 장부에 저장 / 매입처 발주=우리가 매입처에 보낼 구매 문장. **매입처 쪽 거래명세서는 매입처가 발행 — 우리가 안 만듦.** (상세 `docs/order-moa-feedback-design-2026-07-07.md` §0)
- **DB 불변 규칙(헌장 §3)**: `order_items.amount`는 generated → insert 제외. `unit_price`=확정 시점 스냅샷, 과거 명세서는 customer_prices 재조회 금지. 예상 마진 저장 안 함. raw_text 삭제 가능(확정 주문 유지). soft delete.
- **검증 한 세트**: root `npm test` · web `npm test` · web `npm run build` · web `npm audit --audit-level=low`. UI 변경은 브라우저 확인까지. 진행판 고치면 `py -3 scripts/generate-progress.py`로 HTML/XLSX 재생성(JSON이 단일 소스).
- **[위험] 공유 Supabase 무료 쿼터 경고**("Grace period is over")가 대시보드에 떠 있음 → 한도 소진 시 로그인·저장 막힐 수 있음. 오더모아 전용 프로젝트 분리 시점 논의 필요.
- **[나중]** 매직링크 정식화(Supabase Auth URL Configuration에 개발 URL 등록 — 기본 localhost:3000만 허용됨), 발주 문장 템플릿 설정 화면(2차).
- 관련 문서: `order-moa-system-meta-prompt.md`(헌장) · `order-moa-expanded-roadmap.md` · `order-moa-module-map.md` · `order-moa-ai-working-rules.md` · `order-moa-feedback-design-2026-07-07.md` · `order-moa-progress-{data.json,dashboard.html,tracker.xlsx}`.
