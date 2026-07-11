# 에이전트 작업 로그

이 문서는 Codex와 Claude가 같은 프로젝트 폴더에서 작업할 때 현재 작업 상황과 충돌 방지 정보를 남기는 공간입니다.

## 사용 규칙

작업 시작 시:

- 누가 작업하는지 적는다.
- 작업 목표를 적는다.
- 수정 예정 파일을 적는다.
- 상대 에이전트가 건드리지 말아야 할 파일을 적는다.

작업 종료 시:

- 변경 파일을 적는다.
- 검증 결과를 적는다.
- 남은 이슈를 적는다.

## 기록 양식

```markdown
## YYYY-MM-DD HH:mm AgentName

상태:

- 작업 중 / 완료 / 보류

작업 목표:

- ...

수정 파일:

- ...

접근금지 요청:

- ...

검증:

- ...

남은 이슈:

- ...
```

## 2026-06-06 Codex

상태:

- 완료

작업 목표:

- Claude와 Codex의 협업 운영 문서 작성
- Claude가 시작할 때 읽을 지침 파일 작성
- 프로젝트 히스토리 공유 문서 작성

수정 파일:

- `CLAUDE.md`
- `docs/agent-collaboration-protocol.md`
- `docs/project-history-for-claude.md`
- `docs/agent-worklog.md`

접근금지 요청:

- 없음

검증:

- 문서 파일 생성 후 git 상태 확인 예정

남은 이슈:

- Claude가 실제 작업을 시작하면 이 파일에 작업 중 파일을 기록해야 함

## 2026-06-06 23:10 Claude

상태:

- 계획/제안 (구현 미착수, 사용자/Codex 승인 대기)

작업 목표:

- 로컬 정적 MVP → 웹 서비스 MVP(Next.js + Supabase + Vercel) 전환 준비
- 저장소 상태 점검, 파일/폴더 구조·Supabase 스키마 초안·첫 구현 단위 제안

수정 예정 파일 (승인 후 착수, 신규 생성 위주):

- `web/**` (Next.js + TypeScript 스캐폴드 전체, Claude 신규 생성)
- 1차 단위: `web/` 설정 파일, `web/src/lib/domain/*.ts`(기존 `src/domain.js` TS 이전), `web/**/*.test.ts`(Vitest)
- 루트 `.gitignore` 신규 생성 (env/secret 커밋 방지) — 보안 항목, 별도 합의 후
- `docs/agent-worklog.md` (이 기록)

접근금지 요청 (Codex):

- `web/` 폴더 전체 — Claude 작업 완료 전 수정하지 말 것
- 루트 정적 MVP(`index.html`, `src/`, `tests/`, 루트 `package.json`)는 이번 전환에서 Claude가 건드리지 않음 → Codex가 실험/유지용으로 계속 사용 가능

검증:

- `npm test`(루트): 5/5 통과, 실패 0 확인
- git: 브랜치 `codex/order-moa-mvp`, 작업트리 clean, remote `order-moa`

남은 이슈 / 결정 필요:

- 저장소 레이아웃: `web/` 서브폴더(추천) vs 루트 전환 vs `legacy/` 이동 — 승인 필요
- Supabase 스키마/RLS, 금액 타입(KRW integer), 카톡 원문(raw_text) 저장 정책
- 별도 브랜치(`claude/web-mvp-scaffold`) 사용 여부
- `docs/agent-collaboration-protocol.md`의 공용 경로가 옛 경로(`D:\Documents\ERP-1`) → 신규 기준(`D:\프로젝트폴더\ERP-1`)로 갱신 필요 (Codex 문서 영역)

## 2026-06-06 23:20 Codex

상태:

- 결정/지시 완료

작업 목표:

- Claude의 웹 MVP 전환 제안을 검토하고 승인/수정 지시를 확정
- 보안 선결 항목인 `.gitignore` 추가
- 협업 문서의 공용 경로를 새 기준 폴더로 갱신

Codex 결정:

- 저장소 레이아웃은 `web/` 서브폴더 방식으로 진행한다.
- 루트 정적 MVP(`index.html`, `src/`, `tests/`, 루트 `package.json`)는 실험/회귀 검증용으로 유지한다.
- Claude의 첫 구현 단위는 `web/` 스캐폴드 + 기존 도메인 로직 TypeScript 이전 + Vitest 테스트 재현으로 승인한다.
- 큰 기능이므로 Claude는 `claude/web-mvp-scaffold` 브랜치를 새로 만들어 작업한다.
- 금액 타입은 KRW 원 단위 `integer`로 진행한다.
- 카톡/문자 원문은 MVP 1차에서 기본 저장하지 않는다. 확정된 주문 데이터만 저장하는 방향을 우선한다.
- 권한 모델은 MVP 1차에서 owner 중심으로 시작하되, 스키마는 `company_members.role`로 owner/staff 확장 가능하게 둔다.
- VAT/과세/면세는 제품 모델에는 `tax_type`을 두되, 거래명세서 계산 반영은 2차로 미룬다.
- Supabase 스키마/RLS는 `security definer` 헬퍼를 쓰는 방향으로 검토 승인한다.

수정 파일:

- `.gitignore`
- `docs/agent-collaboration-protocol.md`
- `docs/agent-worklog.md`

접근금지 요청:

- Claude가 `claude/web-mvp-scaffold` 브랜치에서 `web/` 작업을 시작하면 Codex는 `web/`을 수정하지 않는다.
- Codex는 문서/리뷰/검증 중심으로 대응한다.

Claude에게 다음 작업 지시:

- 현재 변경사항을 pull한 뒤 `claude/web-mvp-scaffold` 브랜치를 생성한다.
- `docs/agent-worklog.md`에 작업 시작 로그를 남긴다.
- `web/` 폴더에 Next.js + TypeScript + Vitest 스캐폴드를 만든다.
- 기존 `src/domain.js`의 5개 테스트를 `web/`에서 동일하게 재현한다.
- Supabase 연동은 아직 하지 않는다.
- 작업 후 루트 `npm test`와 `web` 테스트를 모두 실행하고 결과를 보고한다.

검증:

- 커밋 전 실행 예정

남은 이슈:

- Claude가 스캐폴드 완료 후 Codex가 파일 구조, 테스트, `.env` 노출 여부를 리뷰해야 함

## 2026-06-06 23:23 Claude (작업 시작)

상태:

- 작업 중

작업 목표 (Codex 승인):

- `web/` 서브폴더에 Next.js + TypeScript + Vitest 스캐폴드 생성
- 기존 `src/domain.js` 도메인 로직을 `web/src/lib/domain`로 TypeScript 이전
- 기존 `tests/domain.test.mjs`의 5개 테스트를 web Vitest로 동일 재현
- Supabase 연동 미포함, 루트 정적 MVP(`index.html`, `src/`, `tests/`, 루트 `package.json`) 미수정

브랜치:

- `claude/web-mvp-scaffold` (`codex/order-moa-mvp`에서 분기, pull 완료 / 작업트리 clean)

작업 중 파일 (접근금지 요청 - Codex):

- `web/**` 전체 — Claude 작업 완료 전 수정 금지

검증 예정:

- 루트 `npm test`, `web`에서 `npm test`(Vitest), `git status --short`
- 환경: Node v24.14.0 / npm 11.9.0

## 2026-06-06 23:32 Claude (작업 완료 - 단위 1)

상태:

- 완료 (Codex 리뷰 대기)

완료한 일:

- `web/`에 Next.js 15 + TypeScript + Vitest 스캐폴드 생성 (App Router, `src/` 구조)
- 기존 `src/domain.js` 도메인 로직을 `web/src/lib/domain/`(`types.ts`, `index.ts`)로 TypeScript 이전
- 기존 `tests/domain.test.mjs` 5개 테스트를 `web/src/lib/domain/domain.test.ts`(Vitest)로 동일 재현
- TDD 적용: 스텁(throw)으로 RED(5건 실패) 확인 → 실제 구현으로 GREEN(5건 통과)
- 보안: `web/.gitignore` 추가(`node_modules`/`.next`/`*.tsbuildinfo`/`.env*` 차단, 예시만 허용), `.env.local.example`만 커밋 대상
- Supabase 연동 없음, 루트 정적 MVP 미수정

변경/추가 파일 (미커밋 — 커밋/푸시는 Codex 판단):

- (수정) `docs/agent-worklog.md`
- (신규) `web/.gitignore`, `web/.env.local.example`
- (신규) `web/package.json`, `web/package-lock.json`, `web/tsconfig.json`, `web/next.config.mjs`, `web/next-env.d.ts`, `web/vitest.config.ts`
- (신규) `web/src/app/layout.tsx`, `web/src/app/page.tsx`
- (신규) `web/src/lib/domain/types.ts`, `web/src/lib/domain/index.ts`, `web/src/lib/domain/domain.test.ts`
- (무시됨/비커밋) `web/node_modules/`, `web/.next/`

검증:

- 루트 `npm test`: **5/5 통과** (실패 0) — 정적 MVP 회귀 안전
- web `npm test` (Vitest 3.2.6): **5/5 통과**
- web `tsc --noEmit`: 에러 0
- web `npm run build` (Next.js 15.5.19): **성공** (정적 페이지 4개, exit 0)
- `git add --dry-run`: `node_modules`/`.env.local`/`.next`/`*.tsbuildinfo` 모두 제외 확인

주의할 점 / 남은 이슈:

- `getOrderTotal`은 원본과 동일하게 `products` 인자를 받지만 사용하지 않음(`_products`) — 시그니처 호환 위해 유지, 후속 정리 가능
- 도메인 모듈을 `types.ts` + `index.ts` 2파일로 최소 구성(YAGNI). 추후 `aggregate`/`pricing`/`delivery-note` 분할 가능(동작 동일)
- 거래명세서 VAT 0 고정(원본 동일). 과세/면세(`tax_type`) 반영은 2차
- 권장 커밋 분리: ① docs(worklog) ② `web/` 스캐폴드

Codex 리뷰 요청:

- `web/` 파일 구조 적절성
- `.env` 노출 여부 / `.gitignore` 정책(루트 + `web/` 이중 구성 OK인지)
- 도메인 타입(`types.ts`)이 Supabase 스키마 방향(uuid PK / KRW integer)과 충돌 없는지
- 머지 방식: `claude/web-mvp-scaffold` → `codex/order-moa-mvp` PR 여부

커밋:

- 코드 커밋 `c2b5479` (`feat: scaffold web MVP (Next.js + TS + Vitest) and port domain logic`, 13파일 +2909) — `claude/web-mvp-scaffold`
- 본 worklog 변경은 후속 `docs:` 커밋으로 분리
- push 대상: `origin/claude/web-mvp-scaffold`

## 2026-06-06 23:47 Claude (오늘 작업 마무리 — 단위 1 종료)

상태:

- 단위 1 완료 + 커밋/푸시까지 종료. 오늘은 여기서 중단(단위 2 미착수).

완료한 일:

- 단위 1(web 스캐폴드 + 도메인 TypeScript 이전 + Vitest 5건 재현) 완료
- 코드/문서 분리 커밋 후 origin 푸시 완료
- 단위 2(Supabase 스키마/RLS)는 지시에 따라 **시작하지 않음**

변경 파일 (오늘 누적):

- (코드) `web/` 13개 — 설정 6 + `.gitignore` + `.env.local.example` + app 2 + domain 3
- (문서) `docs/agent-worklog.md`

검증:

- 루트 `npm test`: **5/5 통과**
- web `npm test`(Vitest): **5/5 통과**
- (이전 단계) web `tsc --noEmit` 에러 0, `next build`(Next 15.5.19) 성공

Git:

- 브랜치: `claude/web-mvp-scaffold` (origin과 동기화, 작업트리 clean)
- 커밋: `c2b5479`(feat: web 스캐폴드/도메인), `26d54f1`(docs: worklog), + 본 마무리 docs 커밋
- push: `origin/claude/web-mvp-scaffold` 완료

남은 이슈:

- 도메인 모듈 2파일 최소 구성(추후 `aggregate`/`pricing`/`delivery-note` 분할 가능)
- `getOrderTotal`의 미사용 `products` 인자(원본 호환 위해 유지)
- 거래명세서 VAT 0 고정 → 과세/면세(`tax_type`)는 2차
- 머지 방식 미정(PR vs 브랜치 유지)

Codex 리뷰 요청:

- `web/` 구조, `.env`/`.gitignore` 정책 적절성
- 도메인 타입(`types.ts`) ↔ Supabase 스키마(uuid PK / KRW integer) 정합성
- `claude/web-mvp-scaffold` → `codex/order-moa-mvp` 머지 방식
- 다음 단위(단위 2: Supabase 스키마/RLS SQL) 진행 승인 여부

## 2026-06-11 19:04 Claude (Codex 리뷰 반영 — postcss 보안 수정)

상태:

- 완료 (단위 2 미착수, 보안 수정만 처리)

작업 목표 (Codex 지시):

- `npm audit` moderate 취약점 해결: postcss <8.5.10 XSS (GHSA-qx2v-qp2m-jg93)
- `npm audit fix --force` 금지(Next 9.x로 다운그레이드되므로) → `overrides` 방식 사용

수정 내용:

- `web/package.json`에 `"overrides": { "postcss": "^8.5.15" }` 추가
- `npm install`로 `web/package-lock.json` 갱신
- 결과: next@15.5.19의 postcss `8.4.31 → 8.5.15`, vite 쪽 postcss와 dedupe(단일 8.5.15)

변경 파일:

- `web/package.json`
- `web/package-lock.json`
- `docs/agent-worklog.md` (본 기록)

검증:

- web `npm audit`: **found 0 vulnerabilities** (exit 0)
- `npm ls postcss`: next/vite 모두 8.5.15 (deduped)
- 루트 `npm test`: **5/5 통과**
- web `npm test`(Vitest): **5/5 통과**
- web `npm run build`(Next 15.5.19): **성공** (exit 0)

남은 이슈:

- overrides는 next가 자체 postcss 버전을 올리면 제거 가능 — next 메이저/마이너 업데이트 시 재확인
- 단위 2(Supabase 스키마/RLS)는 여전히 승인 대기

Codex 리뷰 요청:

- overrides 방식(전역 postcss 고정)이 의도와 맞는지 확인
- 머지 방식 결정 및 단위 2 진행 승인

## 2026-06-30 Claude (단위 6 — Next.js 샘플 데이터 기반 핵심 흐름 구현)

상태:

- 완료 (커밋 안 함 — Codex 검수 후 결정). 작업 브랜치 `claude/web-mvp-scaffold`

작업 목표:

- `docs/task-prompt-unit-6-nextjs-demo-flow.md` 기준으로 샘플 데이터 기반 핵심 흐름을 실제 Next.js 화면으로 구현
- Supabase/로그인/DB/PDF 없이 클라이언트 메모리 상태만 사용

브랜치 결정(사용자 확인):

- web/ 스캐폴드가 `codex/order-moa-mvp`에 없어 작업 중단·확인 → 사용자: **claude/web-mvp-scaffold에서 구현, codex로 임의 머지 금지**

구현한 화면/흐름:

- 샘플 데이터 로딩(가명) → 대시보드 → 발주 붙여넣기(거래처 선택+예시) → 파싱 결과 확인/수정 → 품목별 합산표(CSV) → 판매조회형 주문 목록 → 거래명세서 미리보기/브라우저 인쇄
- 파싱 화면: 품목/수량/단위/단가 직접 수정, 금액 자동 재계산, 미매칭(빨강)/수량확인(노랑)/단가미등록(앰버) 배지, **단가 미등록 시 즉석 입력+[이 단가 저장]**, 미매칭 라인 **별칭 등록**, 미매칭·수량불확실 잔존 시 [주문 확정] 차단
- 예상 마진: 기준 매입단가 있으면 라인/주문 단위 참고값 표시, 없으면 `-`
- 모바일 반응형(입력 16px·터치 44px·표 가로스크롤·overflow 격리), 네이티브 에러 경계(error.tsx)로 오류 비노출

추가/수정 파일(web/ + worklog):

- (수정) `web/src/lib/domain/types.ts` — Product에 `basePurchasePrice?` 추가(additive)
- (신규) `web/src/lib/calculations.ts` — lineAmount/sumAmounts/estimated*Margin/format*
- (신규) `web/src/lib/order-parser.ts` — parseOrderText/canConfirm/confirmBlockReason
- (신규) `web/src/lib/sample-data.ts` — 가명 거래처/품목/별칭/단가/기준매입단가/발주 예시
- (신규) `web/src/lib/calculations.test.ts`, `web/src/lib/order-parser.test.ts`
- (수정) `web/src/app/page.tsx` — 데모 핵심 흐름 UI(단일 페이지 뷰 전환)
- (수정) `web/src/app/layout.tsx` — globals.css import
- (신규) `web/src/app/globals.css` — warm 테마/배지/모바일/@media print
- (신규) `web/src/app/error.tsx` — 친화적 에러 화면
- (수정) `docs/agent-worklog.md` (본 기록)

계산 규칙(준수·테스트):

- 라인 금액 = round(수량×단가), 합계 = 라인 합(추가 반올림 없음)
- 예상 마진 = round((판매단가−기준 매입단가)×수량), 매입단가 없으면 `-`
- 단가 미등록 0원+경고(확정은 막지 않음), 미매칭/수량불확실은 확정 차단

검증:

- web `npm test`(Vitest): **19/19 통과**(기존 도메인 5 + 신규 계산 6 + 파서 8)
- web `npm run build`(Next 15.5.19): **성공**(타입체크 통과, 정적 4페이지)
- 루트 `npm test`: **5/5 통과**(회귀 없음)
- 모바일: 360px에서 dev 서버 렌더·상호작용(샘플 불러오기 클릭) 정상, 콘솔 오류 없음. **스크린샷 캡처는 preview 렌더러 타임아웃(환경 이슈)으로 미수집** — CSS 모바일 가드로 보완

남은 이슈:

- 시각적 스크린샷(360/390/430) 미수집(preview 도구 타임아웃) — 다음에 실제 브라우저 수동 확인 권장
- 영구 저장 없음(새로고침 초기화) — 의도된 데모 범위. 다음 단위: Supabase 연결
- 별칭 등록은 첫 토큰 기반 단순안 — 정교화 후보
- 커밋/머지/push는 Codex 판단

## 2026-06-30 Claude (단위 6 검수 반영 — 별칭 버튼 + 합산표 날짜 필터)

상태:

- 완료 (커밋 안 함). 브랜치 `claude/web-mvp-scaffold`

수정 1 — 별칭 즉석 등록 버튼 노출/동작:

- 문제: 버튼 조건이 `status==="unmatched" && productId`라 노출 불가(미매칭이면 productId null, 지정하면 matched).
- 해결: `ParsedLine.wasUnmatched` 플래그 추가(파싱 시 미매칭이면 true) + `canRegisterAlias()` 순수 헬퍼. 미매칭이었던 라인을 사용자가 품목 지정하면 버튼 노출.
- 별칭 토큰은 `extractNameCandidate(rawText)`로 추출(예: "랩 3개"→"랩"), 선택 품목 aliases에 추가, `aliasRegistered` 플래그로 버튼 숨김 + "별칭 등록됨" 표시 + 안내 메시지.
- 자동 매칭된 정상 라인에는 버튼 미노출(불필요).

수정 2 — 품목별 합산표 날짜 필터:

- date input + [오늘]/[전체 날짜] 버튼 추가. `ConfirmedOrder.date` 기준 필터, 거래처 필터와 AND 결합. 현재 필터 라벨 표시. 빈 상태 메시지 유지.

수정 파일:

- (수정) `web/src/lib/order-parser.ts` — wasUnmatched/aliasRegistered, extractNameCandidate export, canRegisterAlias
- (수정) `web/src/app/page.tsx` — 별칭 버튼 조건(canRegisterAlias), 별칭 토큰 추출, 날짜 필터 UI/로직
- (수정) `web/src/lib/order-parser.test.ts` — 별칭 등록 가능 상태/재파싱 매칭 테스트 3건 추가
- (수정) `docs/agent-worklog.md`

검증:

- web `npm test`: **22/22 통과**(+3)
- web `npm run build`: **성공**
- 루트 `npm test`: **5/5 통과**
- 브라우저 390px(preview_eval 기반): 샘플 로딩 → "위생장갑 2박스/랩 3개" 파싱(랩 미매칭) → 랩을 종이컵으로 지정 시 **별칭 버튼 노출** → 클릭 시 메시지+버튼 숨김 → **재파싱 시 랩→종이컵 자동 매칭** → 합산표 날짜(오늘=표시 / 과거일=빈상태)+거래처 필터 동작 확인. 콘솔 오류 0.

## 2026-06-30 Codex (문서·웹 통합 브랜치 시작)

상태:

- 진행 중. 브랜치 `codex/integrate-mvp-docs-web`

작업 목표:

- `claude/web-mvp-scaffold`의 Next.js 데모 구현 커밋(`6736b48`)을 기준으로 보존한 뒤, `codex/order-moa-mvp`의 핵심 문서/프로토타입 산출물을 선별 통합.
- `.agents/`, `.codex/`, `.planr/`, 원본 설문 데이터는 바로 머지하지 않고 보류. 현재 통합 대상은 `docs/`, `prototype/`, `.gitignore` 중심.

반영한 제품 메모:

- 1차 DB 설계는 주문 확정 시 `거래처·일자·품목·수량·단가·라인 금액`을 보존해야 한다. 이 데이터가 거래처별 일/월/년 금액 집계, 거래명세서 재출력, 추후 세금계산서 발행/대조의 기반이다.
- F11 품목별 합산표는 매입처 발주 시간 단축의 빌드업이다. 1차는 거래처별 주문을 품목별로 합산하고, 2차에서 품목별 기본 매입처를 붙여 매입처별 발주표/복사 문장으로 확장한다.

현재 검증 방침:

- 선별 통합 후 `web npm test`, 루트 `npm test`, `web npm run build`를 다시 실행한다.
- 문서 통합이 앱 동작을 깨지 않는지 확인하고, 민감정보/금지 기능이 새로 들어오지 않았는지 스캔한다.


## 2026-06-30 Claude (단위 7 — 매입처 발주용 품목 합산 흐름)

상태:

- 완료 (커밋 안 함). 브랜치 `codex/integrate-mvp-docs-web`

작업 목표:

- 여러 거래처의 오늘 발주를 품목별로 합산해 "매입처에 바로 보낼 총 발주 수량"을 만든다(F11). 복사용 발주 문장 + 거래처별 기여 내역까지.

구현:

- 신규 순수 모듈 `web/src/lib/aggregate.ts`:
  - `buildAggregateRows(orders, productOrder)` — 품목별 총수량 + 거래처별 기여(수량 내림차순·이름순) + 품목 등록순 정렬
  - `formatPurchaseOrderText(rows, title)` — "오늘 발주 합산\n콩나물 7박스\n양파 3망"
  - `buildContributionText(row)` — "가람식당 3박스, 으뜸반찬 2박스, 한빛카페 2박스"
  - `formatQtyUnit(qty, unit)`
- `web/src/app/page.tsx` 합산표 뷰 개선:
  - 보조 문구 "매입처에 보낼 총 발주 수량" 추가(제목 "품목별 합산표"는 유지)
  - 총수량을 "7박스"처럼 단위 포함 표시, "거래처별 내역" 열 추가(기여 내역)
  - "매입처에 보낼 발주 문장" 카드: 읽기전용 textarea(항상 노출=fallback) + [발주 문장 복사] 버튼
  - 복사: `navigator.clipboard.writeText` 시도 → 실패 시 textarea select + 안내 메시지(사용자 친화)
  - 발주 문장 제목은 날짜 필터에 맞춰 "오늘 발주 합산"/"YYYY-MM-DD 발주 합산"/"발주 합산"
  - 기존 인라인 합산 로직을 aggregate.ts로 이전(중복 제거), CSV/날짜·거래처 필터 유지

수정/추가 파일:

- (신규) `web/src/lib/aggregate.ts`, `web/src/lib/aggregate.test.ts`
- (수정) `web/src/app/page.tsx`
- (수정) `docs/agent-worklog.md`

검증:

- web `npm test`: **29/29 통과**(+aggregate 7)
- web `npm run build`: **성공**(타입체크 통과)
- 루트 `npm test`: **5/5 통과**
- 브라우저 390px: 샘플 로딩 → 3거래처(가람 콩나물3 / 한빛 콩나물2·양파2 / 으뜸 콩나물2·양파1) 확정 → 합산표 **콩나물 7박스·깐양파 3망**, 거래처별 내역 표시, 발주 문장 "콩나물 7박스 / 깐양파 3망", 복사 버튼(헤드리스라 clipboard 차단 → **fallback textarea 전체 선택 + 안내** 동작), 날짜 "오늘" 필터 시 제목 "오늘 발주 합산", 가로 overflow 없음(scrollWidth=390), 콘솔 오류 0

설계 경계(준수):

- 매입처별 저장/분리 없음, 품목 기본 매입처 등록 없음, 매입단가 이력/정확 마진/재고 없음(2차)
- Supabase/로그인/DB/영구저장/PDF/세금계산서/연동/OCR 없음

남은 이슈:

- 복사 성공 경로는 실제 브라우저(localhost 보안 컨텍스트)에서 동작, 헤드리스 preview에선 fallback로 검증됨
- 거래처별 기여 정렬은 수량 내림차순+이름순(고정). 발주 단위가 품목별로 섞이면(예: 같은 품목 다른 단위) 단순 합산 — 1차 단순안
- 커밋/머지/push는 Codex 판단

Codex 검수:

- `web npm test` 29/29, 루트 `npm test` 5/5, `web npm run build` 성공 확인.
- 390px 브라우저에서 3거래처 주문 확정 → 합산표 콩나물 7박스/깐양파 3망, 거래처별 내역, 발주 문장, 복사 fallback, 콘솔 오류 0 확인.
- 합산표 카드 안에 새 `card`가 중첩되어 있던 부분은 같은 섹션의 구분 영역으로 보정(레이아웃 구조만 변경, 기능 변화 없음).

## 2026-06-30 Claude (단위 8 사전 설계 점검 — DB 연결 전 정합성)

상태:

- 완료 (문서만. web/·prototype/·Supabase·코드 미수정). 브랜치 `codex/integrate-mvp-docs-web`

작업 목표:

- Supabase/DB 저장 전환 전, 주문 저장·기간 집계·거래명세서 재출력·매입처 발주·세금계산서 근거 데이터의 설계 정합성 점검

핵심 질문 점검 결과(모두 현 문서로 답변 가능):

1. 주문 확정 저장 데이터 → orders + order_items(+order_imports.raw_text). 라인 단가 스냅샷.
2. 거래처별 일/월/년 집계 → 별도 테이블 없이 orders.order_date+customer_id 범위의 order_items.amount 합(쿼리).
3. 거래명세서 재출력 → orders+order_items+customers+companies만으로 재구성(스냅샷 단가). delivery_notes 없어도 가능.
4. 세금계산서 근거 → 거래처별 기간 금액(orders/order_items) 1차 보존. 발행/대조는 2차(tax_invoice_summaries).
5. 합산표/매입처 발주 문장 → 현재 주문 데이터만으로 충분(aggregate.ts 재사용).
6. 2차 품목별 기본 매입처 → suppliers + products.default_supplier_id(nullable) additive, 현 스키마 안 막힘.
7. 기준 매입단가 예상 마진(1차 참고값) vs 정확 회계 마진(2차) → §5.1/§5.2/db §2 일관.

문서 보정(과한 기능 추가 없음, 1차/2차 경계 명확화):

- `docs/db-schema-definition.md` §2: unit_price 스냅샷 원칙, 예상 마진 미저장(표시 참고값), 기간 집계 쿼리 기반 명시
- `docs/function-specification.md` F12: 거래처별 일/월/년 기간 합계(§5.2 근거) 명시 / F13: 재출력은 저장 주문 스냅샷 기준, delivery_notes 없이 재출력 가능 명시

신규 문서:

- `docs/task-prompt-unit-8-supabase-persistence-flow.md` (단위 8 목표·범위·금지·저장 데이터·화면별 흐름·기간 집계·재출력·합산표 관계·세금계산서 1차 보존·검증·구현 지시)

수정/신규 파일:

- (신규) `docs/task-prompt-unit-8-supabase-persistence-flow.md`
- (수정) `docs/db-schema-definition.md`, `docs/function-specification.md`, `docs/agent-worklog.md`

민감정보 스캔:

- docs 전체 실거래처명/전화/사업자번호/주소 패턴 스캔 — 신규 작성분에 없음(공급자/거래처는 가명·공란 원칙 유지)

남은 쟁점(Codex 검수 포인트):

- 단위 8에 인증(F1)·회사 부트스트랩(F2) 포함 범위 확정(앞 단위들이 로그인 보류였음) — RLS 회사격리에는 auth.uid 필요
- delivery_notes/receivables 1차 포함 여부(현 권고: 기본 제외, 미저장 재출력으로 충분)
- 주문 수정/취소(soft, status=cancelled) UX 범위
- 커밋/머지/push는 Codex 판단(이번 미커밋)

## 2026-06-30 Claude (단위 8a — Supabase 인증/회사/RLS 기반)

상태:

- 완료 (커밋 안 함). 브랜치 `codex/integrate-mvp-docs-web`

작업 목표:

- 단위 8 전체가 아니라 8a만: Supabase 클라이언트/서버 준비 + 최소 인증(F1) + 회사 생성/선택(F2) + 1차 테이블 마이그레이션/RLS/부트스트랩 RPC 파일. 데이터 저장(주문/합산/명세서 DB 연결)은 이번 제외.

구현:

- 마이그레이션 파일(적용은 별도): `web/supabase/migrations/`
  - `0001_schema.sql` — 9개 1차 테이블 + 인덱스 + 교차회사 무결성 트리거(방식 B)
  - `0002_rls.sql` — is_company_member/is_company_owner + 전 테이블 RLS + 정책(부트스트랩 예외 포함)
  - `0003_company_bootstrap.sql` — create_company_with_owner RPC(security definer, authenticated만)
- Supabase 설정: `web/src/lib/supabase/config.ts`(env 가드, 미설정 시 null), `client.ts`(브라우저 anon), `server.ts`(서버 전용 준비물, 8a 미사용), `config.test.ts`
- 인증/회사 게이트: `web/src/app/auth-gate.tsx` — `useCompanySession` 훅 + LoginView(이메일 매직링크)/CompanySetupView(회사 생성·선택)/AuthBar(로그아웃)
- `web/src/app/page.tsx` 얇게 통합: 상단에 게이트 훅, 로그인/회사 없음 시 게이트 화면, 있으면 기존 데모 진입. **Supabase 미설정이면 status="disabled" → 데모 그대로**
- `web/.env.local.example` 갱신(anon 3종 + service role 서버전용 경고)
- 순수 로직(parser/calculations/aggregate) 미변경

보류(8a 제외, 다음):

- 주문/합산표/거래명세서 DB 연결, delivery_notes/receivables, 세금계산서/VAT/이카운트/OCR/PDF, 매입처/재고/정확 마진 — 전부 미착수

검증:

- 루트 `npm test`: **5/5**
- web `npm test`: **32/32**(+supabase config 3)
- web `npm run build`: **성공**(타입체크 통과, 초기 TS 오류 1건 수정 — onAuthStateChange 파라미터 타입)
- **service role key 클라이언트 번들 미포함** 확인(`.next/static` grep 0)
- server.ts(next/headers) 클라이언트 번들 미유입 확인(미import → 번들 제외)
- `.env` 미추적(예시만), `.env.local` 없음(데모 모드)
- 브라우저(데모 모드): 랜딩→샘플 로딩→nav 정상, AuthBar 숨김(disabled), 콘솔 오류 0

RLS 검증 방법(문서 기준, 실제 Supabase 미적용이라 코드검증만):

- `supabase-rls-policy.md` §9 시나리오로 A/B회사 격리 검증 예정: U_A가 B회사 customers/orders/order_items/customer_prices select→0행, insert/update→거부. 실제 검증은 Supabase 적용 후 SQL/통합 테스트로 수행.

남은 쟁점(Codex 확인):

- 실제 Supabase 프로젝트에 마이그레이션 적용 + RLS 시나리오 실측(8a 코드는 준비 완료, 미적용).
- 인증 리다이렉트(magic link) 콜백 처리 — 현재 클라이언트 세션 감지(onAuthStateChange)로 처리, 서버 세션 쿠키/미들웨어는 다음 단위.
- Codex 검수 중 npm 저위험 취약점 1건(esbuild dev 서버, Windows, dev 전용)은 기존 보안 보정 방식과 맞춰 `overrides.esbuild=^0.28.1`로 해결. `npm audit --audit-level=low`: 0 vulnerabilities.
- 커밋/머지/push는 Codex 판단(이번 미커밋).

## 2026-07-01 Codex (단위 8a 검수 및 보안 보정)

상태:

- 완료. Claude 단위 8a 작업을 검수하고 npm audit 저위험 항목을 보정.

검수 내용:

- 변경 범위가 8a(인증/회사/RLS 기반)에 머무는지 확인. 주문 저장/합산표/거래명세서 DB 연결은 미구현 상태 유지.
- Supabase 마이그레이션 3개, 인증 게이트, env 예시, package 변경 직접 검수.
- `esbuild` Windows dev-server low 취약점은 기존 `postcss` 보안 보정과 같은 방식으로 `web/package.json` overrides에 `esbuild: ^0.28.1` 추가 후 `npm install`로 lockfile 갱신.

검증:

- 루트 `npm test`: 5/5 통과
- web `npm test`: 32/32 통과
- web `npm run build`: 성공
- web `npm audit --audit-level=low`: found 0 vulnerabilities
- `git diff --check`: 공백 오류 없음
- `.env.local` 미존재, 커밋 대상은 `.env.local.example`만 확인

남은 이슈:

- Supabase 실제 프로젝트 적용 및 RLS A/B 회사 격리 실측은 다음 단위에서 수행.
- magic link 서버 쿠키/미들웨어 정리는 다음 단위에서 처리.

## 2026-06-30 Claude (단위 8a-공유 — ordermoa_ 접두사 적용)

상태:

- 완료 (커밋 안 함). 브랜치 `codex/integrate-mvp-docs-web`

배경:

- Supabase 무료 프로젝트 한도로, 기존 `yangsan-inventory` 프로젝트를 공유해 오더모아 MVP 테스트. 충돌 방지 위해 모든 오더모아 DB 객체에 `ordermoa_` 접두사 적용.

변경(마이그레이션 SQL 재작성, 적용은 아직 안 함):

- 테이블 9개: companies→ordermoa_companies, company_members→ordermoa_company_members, customers→ordermoa_customers, products→ordermoa_products, product_aliases→ordermoa_product_aliases, customer_prices→ordermoa_customer_prices, order_imports→ordermoa_order_imports, orders→ordermoa_orders, order_items→ordermoa_order_items
- 함수/RPC: is_company_member→ordermoa_is_company_member, is_company_owner→ordermoa_is_company_owner, create_company_with_owner→ordermoa_create_company_with_owner, assert_same_company→ordermoa_assert_same_company, check_*_company→ordermoa_check_*_company
- 트리거: ordermoa_trg_*_company / 인덱스: ordermoa_idx_* / 정책: ordermoa_* (모두 접두사)
- FK/PK/unique/check 제약은 테이블명 기반 자동 명명이라 이미 ordermoa_ 포함

앱 코드:

- `web/src/app/auth-gate.tsx`: `.from("companies")`→`.from("ordermoa_companies")`, `rpc("create_company_with_owner")`→`rpc("ordermoa_create_company_with_owner")`

검증:

- 접두사 누락 grep: SQL 내 `public.<비접두사>` 0건, create policy/trigger/function/index 이름 전부 ordermoa_ 시작, 앱 내 비접두사 from/rpc 0건
- 루트 `npm test` 5/5, web `npm test` 32/32, web `npm run build` 성공, `npm audit` **0 vulnerabilities**
- 데모 모드(env 미설정) 스모크: 랜딩→샘플 로딩→nav 정상, 콘솔 오류 0 (접두사 변경은 Supabase 설정 시에만 영향)

적용 전 주의:

- yangsan-inventory 기존 테이블/데이터 미변경. 이 SQL은 오더모아 객체만 새로 생성.
- 3개 파일 순서대로 적용: 0001_schema → 0002_rls → 0003_company_bootstrap
- `auth.users`(Supabase 인증 스키마) 참조는 그대로 사용(공유 프로젝트 공통).

다음 단계:

- 사용자가 `web/.env.local`에 공유 프로젝트 NEXT_PUBLIC_SUPABASE_URL/ANON_KEY 입력 → 3개 SQL을 Supabase SQL 편집기에 적용 → 로그인/회사 생성(F2, ordermoa_create_company_with_owner RPC) 실동작 확인.
- RLS A/B 회사 격리 실측(§9 시나리오).
- 커밋/머지/push는 Codex 판단(이번 미커밋).

## 2026-07-01 Codex (단위 8a-공유 접두사 검수)

상태:

- 완료. Claude의 `ordermoa_` 접두사 변경을 검수하고 커밋 준비.

검증:

- SQL 내 `public.companies` 등 비접두사 업무 객체 참조 없음.
- 앱 코드 내 `.from("companies")`, `rpc("create_company_with_owner")` 등 옛 호출 없음.
- 루트 `npm test`: 5/5 통과
- web `npm test`: 32/32 통과
- web `npm run build`: 성공
- web `npm audit --audit-level=low`: 0 vulnerabilities
- `git diff --check`: 공백 오류 없음

남은 이슈:

- 실제 `yangsan-inventory` Supabase SQL Editor 적용은 아직 하지 않음.
- 적용 전 `web/.env.local`에 공유 프로젝트 URL/anon key 입력 필요.

## 2026-06-30 Claude (마감 검수 — 8a 공유 Supabase 상태 확인 + 인수인계)

상태:

- 완료 (검수만, 새 기능/코드 변경 없음). 브랜치 `codex/integrate-mvp-docs-web`, 작업트리 clean

확인:

- 최신 커밋 3개 존재: `926bdc6 fix: prefix ordermoa supabase objects`, `48c2755 feat: add supabase auth company foundation`, `bd5a2df docs: prepare supabase persistence flow`
- 검증 재실행 전부 통과: 루트 `npm test` 5/5, web `npm test` 32/32, web `npm run build` 성공, web `npm audit --audit-level=low` **0 vulnerabilities**(exit 0)
- 마이그레이션 SQL(0001~0003) 접두사 점검: 비접두사 `public.<업무객체>` 0건, 모든 `public.<obj>` 참조가 `ordermoa_`, 생성 객체(table/index/function/trigger/policy) 전부 `ordermoa_` 접두사
- 앱 코드 참조: `.from("ordermoa_companies")`, `rpc("ordermoa_create_company_with_owner")`만 존재

주의(적용 시 혼동 방지):

- `docs/db-schema-definition.md`·`docs/supabase-rls-policy.md`의 SQL은 **접두사 없는 설계 초안**(적용용 아님). 공유 프로젝트에 적용할 것은 오직 `web/supabase/migrations/000{1,2,3}.sql`(접두사 적용본)뿐. 설계 문서 SQL을 복사해 실행하지 말 것.

다음 작업 인수인계 (사용자 → 적용):

1. `yangsan-inventory` Supabase 프로젝트에서 **Project URL**과 **anon public key** 확보(Settings → API).
2. `web/.env.local` 생성 후 입력(커밋 금지, .gitignore 처리됨):
   - `NEXT_PUBLIC_SUPABASE_URL=<project url>`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>`
   - (service role key는 넣지 말 것 — 8a 미사용)
3. Supabase SQL Editor에서 **0001_schema → 0002_rls → 0003_company_bootstrap** 순서로 실행.
4. `cd web; npm run dev` 후: 로그인(이메일 매직링크) → 회사 생성(`ordermoa_create_company_with_owner`) → 데모 진입 확인.
5. RLS 실측(`supabase-rls-policy.md` §9): 다른 계정/회사로 교차 접근 차단(select 0행, insert/update 거부) 확인.

남은 이슈:

- env 미설정 상태에선 앱이 데모 모드로 동작(정상). 실 인증/회사/RLS는 위 적용 후 실측 필요.
- 커밋/머지/push는 Codex 판단(이번 검수는 worklog 한 줄만 추가).

## 2026-06-30 Claude (진행현황 대시보드 — HTML/XLSX/JSON)

상태:

- 완료 (커밋 안 함). 브랜치 `codex/integrate-mvp-docs-web`. 앱 기능 변경 없음(8b 미착수).

산출물:

- `docs/order-moa-progress-dashboard.html` — 비개발자용 진행판(표 중심, 상태색 5종, 현재위치 표시, 반응형+인쇄 CSS, 외부 CDN 없음)
- `docs/order-moa-progress-tracker.xlsx` — 시트 5개(전체 로드맵/현재 상태/검증 체크리스트/보류·제외 기능/다음 작업), 수식 0=수식오류 0
- `docs/order-moa-progress-data.json` — 단일 원본 데이터(HTML/XLSX 재생성용)

내용 요점:

- 완료: 단위 1~7 + 8a(Supabase 적용·로그인·회사 '히든식품' 생성 성공)
- 미완료: 주문 DB 저장/조회, 합산표·명세서 DB 연결, RLS 실측
- 현재 위치: 8a 완료 ◀ 다음은 8a-검증 → 8b → 8c
- 비개발자 설명 포함(예: 8a=문패와 출입문, 8b=실제 주문 장부 저장)

검증:

- XLSX 재로드: 시트 5개 한글명 정상, 수식 0/엑셀오류 0, 현재위치 마커 확인
- HTML: 태그 균형 전부 OK(table/tr/td/div 등), 11.5KB 단일 파일, CDN 참조 없음, 미리보기 렌더 확인
- 루트 `npm test` 통과, web `npm test` 32/32, web `npm run build` 성공
- 금지사항 준수: 8b 코드/주문 저장/SQL 적용/service key/앱 기능 변경 없음

다음 추천: **8a-검증 먼저**(30분~1시간) — Supabase Table Editor에서 ordermoa_companies/members에 히든식품 row 확인 + RLS 기본 확인(비로그인/타계정 차단) 후 8b(주문 저장/조회) 진행. 장부를 쌓기 전에 잠금 확인이 순서.

## 2026-07-02 Codex (진행현황 대시보드 검수)

상태:

- 완료. Claude 산출물 검수 후 기준일을 2026-07-02로 보정하고 커밋 준비.

검수/보정:

- `docs/order-moa-progress-dashboard.html`, `docs/order-moa-progress-data.json`, `docs/order-moa-progress-tracker.xlsx` 기준일을 오늘 날짜로 통일.
- HTML 태그 균형 검사 통과, 외부 CDN/비밀키 실제값 없음.
- XLSX 재로드 확인: 시트 5개, 수식 0개, 엑셀 오류값 0개, 옛 날짜 0건.
- 산출물 내용은 현재 위치를 8a-검증으로 표시하고, 8b/8c는 다음 단계로 유지.

검증:

- 루트 `npm test`: 5/5 통과
- web `npm test`: 32/32 통과
- web `npm run build`: 성공
- web `npm audit --audit-level=low`: 0 vulnerabilities
- `git diff --check`: 공백 오류 없음

남은 이슈:

- 다음 작업은 8a-검증: Supabase Table Editor에서 `ordermoa_companies`/`ordermoa_company_members` row 확인 및 RLS 실측.

## 2026-07-02 Claude (8a-검증 부분 결과 반영 — 대시보드 3종 업데이트)

상태:

- 완료 (커밋 안 함). 브랜치 `codex/integrate-mvp-docs-web`. 앱 코드/SQL 변경 없음(8b 미착수).

오늘 확인된 8a-검증 결과(사용자 실측):

- ✅ `ordermoa_company_members`+`ordermoa_companies` join 조회 성공 — company_name=히든식품, role=owner
- ✅ 비로그인(anon key) `ordermoa_companies` 조회 → `[]` (공개 접근 차단 확인)
- ✅ ordermoa_* 테이블별 RLS policy 존재 확인(policy count)
- ⏳ 남은 검증: **타 계정/타 회사 A/B 격리 실측** (B계정으로 히든식품 데이터 select 0행/insert 거부)

반영 내용:

- 8a-검증 상태: 다음 → **진행 중**(부분 완료), 현재위치 마커 유지
- 검증 체크리스트: RLS 1행 → 4행 분리(회사/멤버 row ✅ · anon 차단 ✅ · policy 존재 ✅ · A/B 격리 ⏳)
- 되는 것에 "8a-검증(부분 완료)" 추가, 다음 작업 1순위를 "8a-검증 마무리(A/B 실측만)"로 구체화

수정 파일:

- `docs/order-moa-progress-data.json` (원본), `docs/order-moa-progress-dashboard.html`, `docs/order-moa-progress-tracker.xlsx`(재생성), `docs/agent-worklog.md`

검증:

- XLSX 재로드: 시트 5개, 수식 0/오류 0, "8a-검증=진행 중"·A/B 격리 미실측 행 확인
- HTML 태그 균형 전부 OK, 미리보기 렌더 확인
- 루트 npm test 5/5 · web npm test 32/32 · web build 성공 · npm audit --audit-level=low 0건

다음 추천:

1. **8a-검증 마무리**(30분 내): 두 번째 계정으로 로그인 → B회사 생성 → 히든식품(A) 데이터 select 0행/insert 거부 실측 (`supabase-rls-policy.md` §9.1)
2. **8b 주문 저장/조회/기간 집계**: A/B 격리 확인 후 착수 (`task-prompt-unit-8-supabase-persistence-flow.md` §5/§6)

## 2026-07-02 Claude (대시보드 재검수 + 실제 발주품목 테스트 데이터셋)

상태:

- 완료 (커밋 안 함). 파서/앱/SQL/Supabase 미변경(8b 미착수).

1차 — 대시보드 3종 재검수:

- JSON/HTML/XLSX 일관 확인: 8a-검증=진행 중(현재 위치), 완료 4건(회사·멤버 row/anon 차단/policy 존재) 반영, 남은 1건(A/B 격리) 명확, XLSX 시트 5개 정상 — 수정 필요 없음

2차 — 실제 발주품목 테스트 데이터셋:

- 원본: 사용자 선택 실사용 이카운트 판매조회 엑셀(판매조회 191건/거래처 12/고유 품목 71종) — **읽기만, 미커밋**
- 관찰 패턴: `품목명(규격,공급사) [단위]` 지배적(세척숙주(3.5kg)[BOX], 건취나물[1kg 국산], 계란[특], 배추(5입)[망]), 단위 BOX/kg/EA/망/판/입/벌크
- 가명화: 거래처 12곳→A식당~E카페 5곳, 공급사명 제거/일반화, 브랜드명 ○○떡 처리(1건 잔존 발견→수정), 실단가/실금액 미사용(임의 테스트값)

신규 산출물:

- `docs/order-moa-real-order-test-data.json` — 품목 28종(별칭 26개, 기준 매입단가 有/無 혼합), 발주문장 18건(expectedStatus 포함), 개선 후보 5건, 테스트 코드 후보 3건
- `docs/order-moa-real-order-test-plan.md` — 비개발자용 단계별 테스트 안내(성공 기준 ≥15/18, O/X 기록법)
- `docs/order-moa-real-order-test-cases.xlsx` — 시트 5(테스트 요약/품목·별칭 후보/발주문장 테스트/파싱 실패 후보/개선 우선순위), 수식 0/오류 0

예상 분포(18건): 성공 9 · 별칭_필요 2 · 수량_확인 2 · 단위_확인 2 · 단가_미등록 1 · 오매칭_위험 2

실데이터에서 발견한 파서 함정(코드 미수정, 후보만):

1. 규격 숫자 오인 — "청양고추 1kg 2봉"의 1을 수량으로(1순위)
2. 동일 토큰 다중 품목 — '숙주'가 세척숙주/숙주(1kg) 양쪽 포함, 첫 매칭 반환(2순위)
3. 1글자 품목(무) 정확일치 한계 — 별칭으로 해결(현행 유지 권장)
4. 단위 사전 부족 — 키로/장/마리/모

검증:

- 민감 스캔: 원본명/공급사명/브랜드명·전화·사업자 패턴 — 3개 산출물+xlsx 셀 전수 clean
- JSON 파싱 OK, XLSX 수식 0/오류 0/시트 5
- 루트 npm test 5/5 · web 32/32 · build 성공 · audit 0건

다음 추천(A→B→C):

- A. **8a-검증 마무리**(A/B 격리 실측, 30분) — 잠금 검증 완결이 최우선
- B. **실제 발주 파서 fixture 테스트 추가** — 본 JSON 18건을 order-parser.test.ts에 로드(t03/t04/t11은 현재 동작 고정), 사용자 수동 테스트와 병행 가능
- C. **8b 주문 저장/조회** — A 완료 후 착수

## 2026-07-02 Claude (실제 발주 파서 fixture 테스트 추가 — characterization)

상태:

- 완료 (커밋 안 함). 파서/앱 UI/SQL/Supabase 미변경, 8b 미착수.

작업:

- (신규) `web/src/lib/real-order-fixture.test.ts` — docs JSON 18건을 파서에 연결, **현재 동작 실측값으로 고정**
  - 절차: 임시 discovery 테스트로 18건+무별칭 변형 실측 → CURRENT 표에 고정 → discovery 삭제
  - 구성: fixture 무결성 1 + 문장별 18 + 한계 고정 3(t03 다중 포함 첫 매칭 rp01 / t04 변형: 별칭 미등록 시 1글자 '무' unmatched / t11: 1kg의 1을 수량 오인·단위 kg) = **22개 테스트**
  - 단가 재현: rp07(감자) 전 거래처 미등록, (E카페, rp01) 미등록 — JSON priceGaps대로

실측 vs JSON expectedStatus 대조(파서 수정 없이 분석만):

- 그대로 일치 13건(t01·02·05·06·07·08·09·10·13·15·16·17·18)
- 어긋남 5건 — 원인은 파서 버그가 아니라 **expectedStatus가 UX 예상까지 포함**한 것:
  - t03 오매칭_위험 → 실측 rp01 '정상' 매칭(경고 없음) — 위험이 안 보이는 형태로 실재
  - t04 별칭_필요 → 별칭 등록 상태(JSON 그대로)면 rp16 성공. "초기 상태" 전제였음 → 무별칭 변형 테스트로 분리 고정
  - t11 오매칭_위험 → q=1 실측(규격 숫자 트랩 재현)
  - t12·t14 단위_확인 → 파서에 '단위 확인' 상태가 없어 baseUnit으로 조용히 폴백(t14는 우연히 정답)

제안(기대값 분리, Codex 승인 후):

- JSON `expectedStatus` → `targetStatus`(개선 후 목표)로 개명만. "현재 동작"은 본 테스트의 CURRENT 표를 단일 소스로 유지(이중 기록 방지). 파서 개선 시 CURRENT 표 diff = 개선 내역.

파서 개선 우선순위(실측 근거 확정):

1. 규격 숫자 오인(t11: 1kg→수량 1) 2. 다중 포함 첫 매칭(t03: 경고 없음) 3. 단위 사전 부족(t12 키로/t14 장 — 폴백 의존) 4. 1글자 품목은 현행 유지(별칭 해결 검증됨)

검증:

- web `npm test` **54/54**(기존 32+신규 22) · 루트 5/5 · build 성공 · audit 0건
- 민감 재스캔(테스트 파일+JSON): clean · order-parser.ts/web app/SQL diff 없음 확인

다음 추천: A. 8a-검증 마무리(A/B 격리 실측) → B. 파서 개선 1·2순위(이 테스트의 CURRENT 표를 바꾸며 TDD로) → C. 8b 주문 저장/조회

## 2026-07-02 Claude (파서 개선 1차 — 규격 숫자 오인 수정, TDD)

상태:

- 완료 (커밋 안 함). DB/SQL/Supabase/앱 UI/8b 미변경.

TDD 절차:

- RED: `real-order-fixture.test.ts` t11 기대값을 목표(수량 2, 단위 봉)로 변경 + 신규 케이스 2건 추가 → **3 failed 확인**
- GREEN: `order-parser.ts` 최소 수정 → **web 56/56 통과**(기존 샘플 11건 포함 회귀 없음)

바뀐 파서 규칙 (`pickQuantityCluster`):

- 세그먼트의 숫자(+단위) 클러스터 중 수량 채택 우선순위: **① 수량단위 결합(2봉/3박스) → ② 단독 숫자(두부판 2) → ③ 측정단위 결합(3kg)**
- `MEASURE_UNITS = kg/g/l/ml` — 숫자와 결합 시 규격일 가능성이 높아 강등. 측정단위 숫자만 있으면 그대로 수량("감자 3kg"→3)
- 단위는 채택된 클러스터의 단위 → 단독 단위 → baseUnit 폴백 순(기존 첫 클러스터 고정 방식 제거)

바뀐 테스트:

- t11 표/핀 테스트: [rp23, 1, kg] → **[rp23, 2, 봉]** ([한계 고정]→[개선 1차])
- (신규) "비닐 100L 3장" → 수량 3(100L 규격 제외, 단위는 baseUnit '장' 폴백)
- (신규 회귀) "감자 3kg" → 수량 3, 단위 kg (측정단위 단독은 수량 유지)
- 기존 유지 확인: "양파1망"→1망(t18), 샘플 예시 1~10 전부 통과

문서 동기화:

- JSON: t11 expectedStatus 오매칭_위험→성공, expectedSummary(성공 10/오매칭 1), rank1 "적용 완료" 표시
- plan MD §4 분포/§5 1번 갱신, XLSX 재생성(t11=성공 확인)

검증: web **56/56** · 루트 5/5 · build 성공 · audit 0건 · 민감 스캔 clean

남은 파서 한계:

- t03 다중 포함 첫 매칭(경고 없음) — 개선 2순위(다중 후보 선택 UI 필요, 파서+화면 함께)
- 단위 사전 부족(키로/장/마리/모) — 3순위(사전 추가만으로 가능, t12/t14 기대값 갱신 세트)
- 1글자 품목 정확일치 — 현행 유지(별칭 해결 검증됨)

다음 추천: A. 8a-검증 마무리(A/B 격리 실측) → B. 파서 개선 3순위(단위 사전 확장 — 저위험) → C. 2순위(다중 후보 UI, 화면 작업 포함) → D. 8b

## 2026-07-02 Claude (8a-검증 마무리 — A/B 회사 격리 실측 통과)

상태:

- 완료 (커밋 안 함). 앱 코드/SQL/Supabase 스키마 미변경(읽기 검증만), 8b 미착수.

실측(사용자 수행, 경로 0 = SQL Editor 임퍼서네이션, 두 번째 계정 불필요):

- select 격리: `set local role authenticated` + 가짜 B uid로 `ordermoa_companies/company_members/customers` count → **0 / 0 / 0** (히든식품 있는데도 안 보임 = 격리 성공)
- 위조 insert: A회사 company_id로 `ordermoa_customers` insert → **ERROR 42501 new row violates row-level security policy (거부)**
- 둘 다 begin…rollback → yangsan-inventory 데이터 무변경

→ **8a-검증 전 항목 통과**(회사/멤버 row·anon 차단·policy 존재 + A/B select 격리 + 위조 insert 차단). 8b 안전하게 진행 가능.

반영:

- (신규) `docs/order-moa-rls-ab-verification.md` — 비개발자용 실측 절차서(경로 0 SQL Editor 우선 + 결과 통과 기록)
- 진행현황 3종 갱신: 8a-검증 진행중→**완료**, 현재 위치 8b로 이동, 체크리스트 A/B 2행(격리 0/0/0·위조 거부 42501), 되는 것/안 되는 것/다음 작업 정리, XLSX 재생성

검증:

- HTML 태그 균형 OK · XLSX 시트 5개 수식 0/오류 0 · JSON 파싱 OK
- 루트 npm test 5/5 · web 56/56 · build 성공 · audit 0건 · 민감 스캔 clean

남은 위험:

- 앱(웹) 클라이언트 경유 RLS는 anon 차단([])으로 이미 확인. select/insert 격리는 SQL 레벨에서 실측 완료. update/delete 위조는 동일 policy 패턴이라 논리적으로 동일 보장(원하면 8b 착수 시 1건 추가 실측 가능).
- 임퍼서네이션 uid는 가짜(FK 없음) — select/insert 거부 검증엔 무해. 실제 2계정 E2E는 8b 이후 앱에서 자연 검증됨.

다음 추천: **8b 주문 저장/조회/기간 집계**(task-prompt-unit-8 §5/§6). 병행 옵션: 파서 개선 2·3순위(8b와 독립).

## 2026-07-06 Claude (UI/UX 리디자인 — 관리자형 사이드바 레이아웃)

상태:

- 완료 (커밋 안 함). 로직/파서/DB/SQL 무변경 — 표현(JSX/CSS)만. 8b 미착수.

배경:

- 사용자가 관리자형 ERP 화면 스크린샷(그룹 사이드바 + "준비 중" 배지 + 정돈된 표/필) 제시, 현 UI 개선 요청.
- 제품 원칙 준수: 메뉴는 오더모아 범위만(마감/세무/원가 등 2차 기능 메뉴 미추가). 예정 화면은 "준비 중" 배지로만 표시.

구현:

- `globals.css` 전면 교체: 셸 레이아웃(고정 사이드바 224px + 헤더 + 콘텐츠), 라이트 관리자 톤(코랄 액센트 유지), nav 그룹/active/준비중 배지, stat 카드, 표 스타일(테두리 라운드+호버), 게이트(.gate) 중앙 카드, 모바일(<900px: 사이드바→가로 스크롤 바, 준비중 숨김), 인쇄(@media print: 사이드바/헤더 숨김+명세서만 A4) 유지
- `page.tsx`: Shell 컴포넌트 + NAV_GROUPS(홈/발주/조회/기준정보·자금·설정=준비중) + VIEW_TITLES(헤더 제목 = 현재 화면), 대시보드 인사말("〈회사명〉님, 안녕하세요")+stat 카드, 사이드바 푸터에 연결 상태(Supabase 연결됨/데모 모드) 표시. 리뷰/명세서 화면은 부모 메뉴(발주/주문 목록) active 유지
- `auth-gate.tsx`: 로그인/회사 생성 화면 게이트 스타일 적용, AuthBar 제거(헤더로 통합)

검증:

- web `npm test` 56/56 · 루트 5/5 · build 성공 · audit 0건
- 브라우저 실측(데모 모드, env 임시 이동 후 **복원 확인**): 사이드바 그룹 6/준비중 5/푸터 상태 표시, 대시보드 인사말·stat, 붙여넣기→파싱(헤더 '파싱 결과 확인')→확정→주문 목록→명세서(.note-doc)→합산표 전 흐름 정상, active nav 매핑 정상
- 모바일 390px: 사이드바 가로 바 전환, 준비중 숨김, overflow 없음(scrollWidth=390), 콘솔 오류 0
- env: `.env.local` 검증용 임시 이동 → 원위치 복원 + git 미추적 재확인. (스크린샷 캡처는 preview 렌더러 타임아웃 — DOM 검증으로 대체, 기지 환경 이슈)

남은 이슈:

- 다크 모드(스크린샷 1 톤)는 후보로만 — 1차는 라이트(인쇄 친화)
- 로그인 상태 셸(Supabase 연결됨 + 회사명 헤더)은 사용자 실브라우저에서 확인 권장
- 다음: 8b 주문 저장/조회/기간 집계(현재 위치). 커밋/push는 Codex 판단

## 2026-07-06 Codex (UI 리디자인 2차 — 업무판 대시보드 보강)

상태:

- 완료 (커밋 안 함). DB/파서/저장 로직 미변경 — `page.tsx` 대시보드/사이드바 JSX와 `globals.css` 표현만 보강.

배경:

- 사용자가 참고 이미지 2장처럼 더 ERP/관리자 화면 느낌을 원한다고 피드백.
- 기존 1차 리디자인은 사이드바 껍데기는 생겼지만, 좁은 화면에서 준비 중 메뉴가 숨겨지고 오른쪽 대시보드가 단순해 이미지 방향성이 약했음.

구현:

- 좌측 메뉴에 그룹/항목 아이콘형 기호 추가, `1차`/`2차` 배지 구분, 준비 중 메뉴를 모바일에서도 숨기지 않도록 조정.
- 오른쪽 대시보드를 "오늘 업무" 업무판으로 재구성:
  - 큰 발주 붙여넣기 CTA
  - 오늘 확정 주문 / 합산 품목 종류 / 저장 상태 / 다음 단계 카드
  - 현재 가능한 업무 표
  - 준비 중인 업무 목록(1차/8c/2차 구분)
- `page.tsx` 상단 주석을 현재 상태에 맞게 수정: Supabase 설정 시 DB 저장·조회(8b), 미설정 시 데모 메모리 모드.

검증:

- 데모 전용 서버 `3003`에서 실측: 샘플 로딩 → 발주 붙여넣기 → 파싱 → 주문 확정 → 주문 목록 → 대시보드 수치(1건/3종) 반영 확인.
- 데스크톱 1500px: 좌측 그룹 메뉴/준비 중 배지/업무판 표시, 가로 overflow 없음.
- 모바일 390px: 준비 중 메뉴 유지, 가로 overflow 없음(`scrollWidth=390`).
- 루트 npm test 5/5 · web npm test 64/64 · web build 성공 · audit 0건.
- `.env.local`은 데모 확인을 위해 임시 이동 후 원위치 복원 완료.

## 2026-07-06 Codex (파서 개선 2차 — 단위 사전 확장)

상태:

- 완료 (커밋 전). DB/인증/UI 저장 로직 미변경 — 파서 단위 처리와 실제 발주 테스트/문서만 갱신.

TDD:

- RED: `두부 4모`, `팽이 2봉지`가 기존에는 수량은 잡지만 단위를 `판`/`봉` 기본단위로 폴백하는 실패 확인.
- GREEN: 단위 사전에 `키로/킬로/키로그람/킬로그람/장/마리/모/봉지` 추가, `키로/킬로` 계열은 `kg`로 표준화.

반영:

- `web/src/lib/order-parser.ts`: 긴 단위 우선 매칭(봉지 > 봉), 단위 alias 표준화(`키로`→`kg`), 신규 단위 인식.
- `web/src/lib/order-parser.test.ts`: `모`/`봉지` 인식 테스트 추가.
- `web/src/lib/real-order-fixture.test.ts`: `소불고기 2키로`→`kg`, `비닐 3장` 단위 직접 인식 테스트 추가.
- `docs/order-moa-real-order-test-data.json` / `.md` / `.xlsx`: t12/t14를 단위_확인에서 성공으로 갱신, 개선 후보 rank4 적용 완료 표시.

남은 파서 과제:

- 동일 토큰 다중 후보 경고/선택(`숙주` → 세척숙주 vs 숙주1kg)은 UI와 함께 처리 필요.

## 2026-07-06 Claude (Codex 리뷰 반영 — UI 리디자인 후속)

상태:

- 완료 (커밋 안 함). 로직 무변경.

반영:

1. `globals.css` 음수 letter-spacing 3곳(-0.01em×2, -0.02em×1) → 0. 양수(.02em 그룹라벨, .4em 명세서 제목)는 유지
2. `page.tsx` 상단 주석 현행화: "Supabase/DB/로그인 없음" 문구 제거 → 8a 게이트 동작·데모 폴백·8b에서 DB 연결 예정으로 수정

검증:

- 잔여 음수 letter-spacing grep 0건 · 루트 npm test 5/5 · web 56/56 · build 성공 · audit 0건
- 브라우저 실측: h2/.brand computed letter-spacing = normal(0 적용), 콘솔 오류 0

UX 개선 제안(분류) — Codex 승인 대기, 이번엔 미반영:

- [즉시 반영 가능(소형·로직 무변경)] ① 확정 직후 안내에 [합산표 보기] 바로가기 ② 빈 상태 CTA 통일(주문 목록 빈 화면에 [발주 붙여넣기]) ③ 대시보드 stat 카드 클릭→해당 화면 이동 ④ 파싱 확인 상단 단계 표시(붙여넣기→확인→확정) ⑤ 준비 중 메뉴 title 툴팁
- [8b 이후] 기준정보 3화면 실구현(DB CRUD와 세트) · 주문 목록 날짜/거래처 필터(DB 조회와 세트) · 다중 후보 선택 UI(파서 2순위와 세트) · 다크 모드 토글 · 모바일 하단 탭바(사용 피드백 후) · 회사 전환 드롭다운(다회사 생기면)
- [2차 분리(추가 안 함)] 마감/세무/원가/리포트 메뉴

다음: 8b 주문 저장/조회/기간 집계(Codex 승인 시 착수). 커밋/push는 Codex 판단.

## 2026-07-06 Claude (단위 8b — 주문 저장/조회 DB 연결)

상태:

- 완료 (커밋 안 함). UI 리디자인 유지, 스코프=주문 저장/조회(전체 ERP 확장 없음).

핵심 설계:

- FK/교차회사 트리거 제약상 주문 저장에는 DB의 실제 거래처/품목 row 필요 → **DB 모드 최초 진입 시 샘플 세팅 데이터(거래처5/품목30/별칭/단가)를 1회 시드**(비어 있을 때만), 이후 DB에서 로드
- `order_items.amount`는 generated 컬럼 → **insert payload에서 제외**(빌더 테스트로 고정). unit_price=확정 시점 스냅샷
- 저장 실패 보상: items 실패 시 orders를 `status='cancelled'`(delete 정책 없음) → 목록(status=confirmed 필터)에서 숨김
- 예상 마진은 저장하지 않고 표시 시점 계산(원칙 유지). 거래처별 일/월 합계는 order_date+customer_id+Σamount로 산출 가능한 형태로 저장됨
- 데모 모드(env 미설정)는 기존 메모리 흐름 그대로(분기)

변경/신규 파일:

- (신규) `web/src/lib/order-store.ts` — 타입(OrderLine/ConfirmedOrder)+순수 빌더(toOrderInsert/toItemInserts/mapDbOrder/buildSeedRows)+repo(loadCompanyData 시드 포함/loadOrders/saveOrder 보상 포함)
- (신규) `web/src/lib/order-store.test.ts` — 빌더 5건(amount 미포함/스냅샷/total·마진·폴백/시드 참조 일관성)
- (수정) `web/src/app/page.tsx` — AppData 타입, DB 로드 effect(시드→로드→주문 목록), confirmOrder DB 분기(저장 중… 상태), 단가/별칭 편집 DB upsert, DB 로딩/오류 카드
- (수정) worklog

포함/제외:

- 포함(정합성 필수): 단가 즉석 저장·별칭 등록의 DB upsert(새로고침 후 유지)
- 미룸: order_imports(raw_text) 저장(8c), 저장 RPC 원자화, 주문 취소 UI, 목록 필터, 기준정보 CRUD 화면, 월합계 화면(8c), 샘플 재시드/초기화

검증:

- 루트 npm test 5/5 · web **61/61**(+order-store 5) · build 성공(타입 오류 2건 발견→수정: AppData 타입/upsert then 타입) · audit 0건
- 데모 모드 브라우저 회귀(env 임시 이동→**복원 확인**, git 미추적 재확인): 랜딩→붙여넣기→파싱→확정("데모 모드 — 새로고침 시 초기화" 안내)→주문 목록 1행, 콘솔 오류 0
- DB 모드 실측은 프리뷰에서 불가(매직링크) → **사용자 확인 절차**: `cd web; npm run dev` → 로그인 → (최초) "샘플 데이터를 설치했습니다" → 발주 확정 → "주문이 저장되었습니다. 새로고침해도 유지됩니다." → **F5 후 주문 목록에 남아 있으면 8b 성공**. Supabase Table Editor에서 ordermoa_orders/ordermoa_order_items row 확인 가능

남은 이슈:

- DB 모드 실측(위 절차) 결과 공유 필요 — 성공 시 진행현황 3종 8b 완료 처리
- 커밋/push는 Codex 판단

## 2026-07-06 Claude (Codex 리뷰 반영 — 8b 시드 부분 실패 오판 수정)

상태:

- 완료 (커밋 안 함). DB 실측은 아직 안 함(코드 안정화 우선, Codex 지시).

문제(Codex 지적):

- loadCompanyData가 customers count만으로 시드 완료를 판정 → customers insert 후 products/prices 중간 실패 시, 다음 접속에서 "시드 완료"로 오판해 품목/단가가 빈 깨진 초기 상태 고착.

수정:

1. 판정 확대: customers/products/customer_prices **3개 테이블 count**를 모두 확인, 하나라도 0이면 보충 실행
2. 안전 재시도(삭제 없음): `ensureSeed()` 신설 — 기존 거래처/품목을 **이름 기준으로 재사용**하고 누락분만 insert, aliases/prices는 unique 키 **upsert(ignoreDuplicates)** 로 멱등(사용자 수정 단가 보존). 실패 시 [다시 시도]가 중단 지점부터 이어짐
3. 순수 함수 분리: `diffSeedRows(companyId, 기존cust, 기존prod, makeId)` — buildSeedRows는 빈 상태 특수형으로 위임(기존 테스트 호환)
4. page.tsx 문구: 설치 안내("최초 설치 또는 누락분 복구") / 오류 안내("[다시 시도]를 누르면 중단된 지점부터 안전하게 이어집니다")

테스트 추가(+3, 총 64):

- 부분 시드(customers만 존재): 재생성 0 + products/prices 전량 보충 + **기존 거래처 id 재사용**(참조 안 끊김)
- 완전 시드: insert 대상 0 + makeId 호출 시 throw로 "새 id 생성 없음" 보장
- 역방향 부분 시드(products만 존재): customers/prices 보충 + 기존 품목 id 재사용

검증:

- 루트 npm test 5/5 · web **64/64** · build 성공 · audit 0건
- 프리뷰 생략 사유: 변경이 DB 모드 전용 경로(데모 모드는 order-store 미사용)라 관찰 불가 — 순수 함수 테스트로 대체

위험/나중:

- [남은 위험] 이름 기준 재사용은 "샘플과 동일 이름" 전제 — 사용자가 시드 후 거래처명을 바꾸면 보충 시 같은 이름이 새로 생길 수 있음(1차 허용, 기준정보 CRUD에서 정리 가능). ensureSeed 자체의 동시 실행(두 탭 동시 최초 접속)은 products 중복 생성 가능성 — 낮은 확률, 후순위(유니크 제약 또는 RPC 직렬화로 2차 보강)
- [나중] order_imports(raw_text) 저장(8c) · 저장 RPC 원자화 · 샘플 초기화/재설치 버튼(설정 화면) · unique(company_id,name) 제약 검토
- [다음] 사용자 DB 실측(로그인→시드→확정→F5 유지) → 성공 시 진행현황 8b 완료 처리

## 2026-07-06 Codex (개발용 데모 진입 보강)

- 목적: Supabase 매직링크 `email rate limit exceeded` 상태에서도 프론트엔드/사이드바 업무 화면을 계속 확인할 수 있게 함.
- 변경:
  - `isDevDemoAvailable()` 추가: development/test에서만 개발용 데모 진입 허용, production에서는 비활성.
  - 로그인 화면에 `개발용 데모로 보기` 버튼 추가.
  - 개발용 데모 선택은 localStorage `order-moa.devDemo=1`로 유지, 헤더의 `로그인 모드` 버튼으로 해제 가능.
  - 데모 진입 시 Supabase 설정이 있어도 인증 게이트를 우회하고 기존 샘플/메모리 모드로 진입.
  - `.env.local.example`에 메일 제한 시 개발용 데모 버튼 안내 추가.
- 검증: root npm test 5/5, web npm test 68/68, web npm run build 성공, npm audit 0건, 로컬 dev 서버 http://localhost:3010 응답 200. 브라우저 자동화는 Codex 앱 연결 타임아웃으로 수동 확인 주소 안내.

## 2026-07-06 Codex (파서 개선 3차 — 다중 품목 후보 확인)

- 목적: `숙주`처럼 여러 품목에 동시에 걸리는 발주 토큰이 정상처럼 자동 확정되는 위험 제거.
- RED: `t03 숙주 3박스`가 `candidateProductIds=[rp01,rp02]`, `needsProductConfirmation=true`, `canConfirm=false`가 되길 기대하는 테스트 추가 후 실패 확인.
- GREEN:
  - `matchProductCandidates()` 추가: 정확 일치 후보 우선, 없으면 포함 매칭 후보를 모두 수집.
  - 다중 후보면 첫 후보를 임시 선택하되 `후보 확인`으로 표시하고 확정 차단.
  - 확인 화면에 후보 품목명 목록 표시, 사용자가 드롭다운에서 품목을 선택하면 확인 상태 해제.
- 문서 동기화: 실제 발주 테스트 JSON/MD/XLSX에서 t03을 `오매칭_위험`에서 `후보_확인`으로 전환.

## 2026-07-06 Codex (샘플 발주 확대 + 거래명세서 레이아웃 보강)

- 사용자 확인사항:
  - 샘플 발주 예시가 짧아 실제 테스트 재료가 부족함.
  - 품목 3개짜리 거래명세서가 문서처럼 꽉 차 보이지 않고 잘린 것처럼 보임.
  - 인쇄 버튼의 실제 범위 확인 필요.
- 변경:
  - 샘플 발주 예시 10건 → 16건으로 확대.
  - 6줄 이상 긴 예시 5건 이상, 10줄 장문 예시 1건 이상 포함하도록 테스트 추가.
  - 거래명세서 품목이 적어도 최소 10행까지 빈 행을 채우는 `padDeliveryNoteLines()` 추가.
  - 명세서 A4 미리보기 느낌을 위해 최소 높이/고정 표 레이아웃/빈 행 스타일/인쇄 CSS 보강.
  - 인쇄 안내 문구를 “브라우저 인쇄창에서 프린터 출력 또는 PDF 저장 선택”으로 명확화.
- 참고: 현재 인쇄 버튼은 `window.print()`로 브라우저 인쇄창을 여는 단계까지 구현. 서버에서 PDF 파일을 생성하는 기능은 2차/후순위.

## 2026-07-06 Codex (품목 검색 선택 + 매입처별 발주 문장 1차)

- 사용자 요구:
  - 품목 100개 이상이 되면 드롭다운에서 수세미/김치 같은 품목을 찾기 어렵다.
  - 합산표는 전체 합산만으로는 부족하고, 야채/두부콩나물/공산품 등 매입처별로 다시 나뉘어야 한다.
  - 합산표에서 품목 체크 여부에 따라 매입처에 보낼 발주 문장에 들어가고, 포함된 품목은 표시되어야 한다.
- 구현:
  - `Product`에 1차 표시용 기본 매입처 필드 추가(`purchaseSupplierId/name`). DB 연결/수정 화면은 다음 단계.
  - 샘플 매입처 추가: 야채매입처, 두부콩나물매입처, 뿌리채소매입처, 김치반찬매입처, 공산품매입처.
  - 샘플 품목에 기본 매입처 배정, 검색 테스트용 배추김치/총각김치/수세미 추가.
  - `searchProductsForOrder()` 추가: 품목명/별칭 검색 결과에 단위·거래처 단가·매입처 미리보기 제공.
  - 합산표에 매입처 컬럼과 품목 체크박스 추가. 체크된 품목만 매입처별 발주 문장에 포함.
  - 매입처별 섹션별 복사 버튼 + 전체 매입처별 문장 textarea 제공.
- 보류:
  - 매입처 이름 수정/품목별 매입처 변경 UI, Supabase DB 테이블 연결은 기준정보/8c 후속 작업.

## 2026-07-06 Codex (진행현황판 갱신 + 매입처 발주 선택 기본값 보정)

- 목적:
  - 비개발자용 진행현황 HTML/JSON/XLSX가 최신 작업 상태를 따라오게 갱신.
  - 합산표의 매입처 발주 체크가 처음부터 전체 선택되어 있어 사용자가 제외해야 하는 불편을 수정.
- 진행현황 갱신:
  - `docs/order-moa-progress-data.json`을 2026-07-06 기준으로 갱신.
  - 최신 상태 반영: 개발용 데모 진입, 다중 후보 확인, 긴 샘플/명세서 보정, 품목 검색, 기본 매입처별 발주 문장, 체크 기본 비움.
  - `docs/order-moa-progress-dashboard.html` 재생성.
  - `docs/order-moa-progress-tracker.xlsx` 재생성(시트 6개: 전체 로드맵/현재 상태/검증 체크리스트/보류·제외 기능/다음 작업/요약).
- 앱 동작 수정:
  - 합산표 진입 시 매입처 발주 품목은 기본 미선택.
  - 사용자가 체크한 품목만 매입처별 발주 문장에 포함.
  - 아무것도 체크하지 않으면 빈 상태 안내 표시 및 복사 버튼 비활성.
- 검증:
  - root npm test 5/5.
  - web npm test 77/77.
  - web npm run build 성공.
  - npm audit --audit-level=low 0건.
  - 진행현황 JSON/HTML 구조 확인, XLSX 재열기 및 수식 오류 0건.
  - 브라우저에서 `http://127.0.0.1:3020/order-moa-progress-dashboard.html` 표시 확인.
- 다음:
  - 파싱 결과 화면에서 `바나나`처럼 미매칭 품목을 즉석 신규 품목으로 저장하고 현재 줄에 바로 매칭하는 기능.

## 2026-07-06 Codex (미매칭 품목 즉석 신규 저장)

- 사용자 요구:
  - `바나나 20kg`처럼 품목 DB에 없는 발주가 미매칭일 때 품목 관리 화면으로 이동하지 않고, 파싱 결과 화면에서 바로 신규 품목을 저장해야 함.
  - 저장 즉시 현재 줄이 매칭되어 주문 확정 가능 상태로 바뀌고, 다음 주문부터 자동 매칭되어야 함.
- RED/GREEN:
  - `product-registration.test.ts` 추가.
  - RED: 신규 품목 저장 결과에 고객 단가와 현재 line 매칭이 없어서 실패 확인.
  - GREEN: `buildNewProductRegistration()` 구현.
- 구현:
  - `web/src/lib/product-registration.ts` 추가: 신규 품목, 거래처별 단가, 갱신된 파싱 line을 한 번에 생성.
  - 파싱 결과 화면에서 미매칭 line에 `신규 품목으로 저장` 버튼 표시.
  - 버튼 클릭 시 품목명/단위/단가/기본 매입처를 그 자리에서 입력.
  - `저장 후 매칭` 클릭 시 products/customerPrices/현재 line 상태를 즉시 갱신.
  - DB 모드에서는 `ordermoa_products`와 `ordermoa_customer_prices`에도 저장 시도.
- 참고:
  - 현재 DB 스키마에는 매입처 컬럼이 없어 기본 매입처는 데모/화면 상태에 반영됨. Supabase 영구 저장은 다음 기준정보/매입처 DB 확장 단계에서 연결 필요.
- 검증:
  - product-registration 테스트 통과.
  - web npm test 78/78.
  - web npm run build 성공.
  - npm audit --audit-level=low 0건.
  - 새 개발 서버 `http://localhost:3011` 응답 200.

## 2026-07-07 Claude (시스템 메타 프롬프트 기획 문서 4종 작성)

- 목적: 오더모아를 좁은 MVP에서 1차/2차/3차로 키워가기 위한 전체 시스템 메타 프롬프트(헌장) 작성. 앱 코드/마이그레이션 변경 없음 — 문서 작업만.
- 사전 검수: 지정 문서(progress-data.json, db-schema-definition, function-specification, supabase-rls-policy, task-prompt-unit-8)와 코드(page.tsx, sample-data, order-parser, aggregate, product-search, product-registration, order-store, 마이그레이션 0001~0003)를 실제로 읽고 현행 상태 기준으로 작성.
- 산출물(신규 4종):
  - `docs/order-moa-system-meta-prompt.md` — 전체 헌장: 제품 정체성, 핵심 흐름, 데이터 보존 불변 규칙 8개, 모듈별 차수 경계표, 화면 구조, DB/보안(매입처 테이블 검토 포함), 테스트 원칙, AI 작업 방식, 장기 아이디어 + 개선 TOP10/리스크 TOP10/하지 말 것 TOP10/다음 구현 5개/Codex 검수 체크리스트. 구버전 `meta-prompt-order-moa.md`(2026-06-06)를 대체하는 관계 명시.
  - `docs/order-moa-expanded-roadmap.md` — 1차(잔여 4작업)/1.5차/2차/3차/장기/제외, 단계별 목표·포함·제외·선행조건·위험 + 단계 이동 판정 기준.
  - `docs/order-moa-module-map.md` — M01~M16 모듈별 역할/화면/코드/DB/차수 + DB 객체 매핑 + 모듈 간 의존 규칙.
  - `docs/order-moa-ai-working-rules.md` — AI 작업 규칙(시작 전 git status·문서 읽기, 차수 딱지, 검증 한 세트, worklog/진행현황 기록, 비개발자 보고 형식, 민감정보, Codex 게이트).
- 검수 중 발견한 핵심 쟁점(문서에 반영):
  - `purchaseSupplierId/Name`은 화면 상태/샘플에만 있고 **DB에 매입처 컬럼/테이블이 없음** → 즉석 등록의 기본 매입처가 영구 저장 안 됨. `ordermoa_suppliers` + `products.purchase_supplier_id` FK를 1.5차 권장안으로 제안(마이그레이션은 Codex 승인 후).
  - function-specification §7의 `order_items.confirmed` 컬럼은 실제 스키마에 없음(문서-코드 드리프트) — Codex 검수 포인트로 표기.
- 검증: 문서 작업만이라 테스트/빌드 생략(코드 무변경). git diff --check 통과, 신규 문서 TBD/TODO 없음, 민감정보(키/실거래처명) 미포함 확인.
- 커밋하지 않음 — Codex 검수·커밋 판단 대기.
- 참고: 작업 도중 Codex가 잔여분을 `a97dca8`(inline product creation)로 커밋 완료 — 본 문서 작업과 충돌 없음(문서 신규 4종 + worklog만 변경). [나중] 진행현황 JSON의 currentFocus는 기준정보 작업 재개 시 갱신.

## 2026-07-07 Codex (시스템 메타 프롬프트 문서 검수 반영)

- 목적: Claude가 작성한 시스템 헌장/로드맵/모듈맵/AI 작업 규칙을 실제 코드 상태와 다시 대조해 커밋 가능한 문서로 정리.
- 수정:
  - `docs/NEXT-SESSION.md`를 최신 인계 문서로 재작성. 이전 문서의 stale 정보(ahead 14, 이미 커밋된 미커밋 목록, 오래된 테스트 수치)를 제거.
  - 매입처 DB화를 1.5차에서 **1차 보강(8c 전 권장)** 으로 상향. 이유: 즉석 신규 품목의 기본 매입처가 현재 DB에 저장되지 않아 합산표/매입처별 발주 흐름과 직접 충돌.
  - raw_text 저장·거래처별 월 합계는 `8c` 범위로 문서 표기를 통일.
  - `function-specification.md`의 실제 스키마에 없는 `order_items.confirmed` 컬럼을 제거하고, `amount`는 generated 컬럼이라 insert payload에 넣지 않는다는 설명으로 정정.
  - AI 작업 규칙에서 마이그레이션은 "적용/커밋은 Codex 승인 전 금지, 초안 작성은 승인된 단위에서 가능"으로 구체화.
  - 진행현황 3종의 web 테스트 수치를 최신 78/78로 동기화.
- 검증:
  - 문서 충돌 grep: stale `NEXT-SESSION` 수치, `order_items.confirmed`, 매입처 1.5차 표기, web test 77/77 현재 문서 0건.
  - `git diff --check` 통과(CRLF 경고만 표시, whitespace error 없음).
  - 민감정보 grep: API key/service role key 없음(정상 문서명·"비밀번호 저장 금지" 문구만 매칭).
  - root `npm test` 5/5.
  - web `npm test` 78/78.
  - web `npm run build` 성공.
  - web `npm audit --audit-level=low` 0건.

## 2026-07-07 Claude (헌장 고정화 — 기존 문서 정렬 + 진행현황 세분화)

- 목적: `fc59baa`로 확정된 헌장 4종을 "고정 헌장"으로 삼아 ① 기존 설계 문서들의 충돌을 문서만 수정으로 정렬, ② 진행현황 3종을 16개 작업 단위(W01~W16)로 세분화.
- 문서 정렬(충돌 수정):
  - `docs/function-specification.md` — 상단에 [2026-07-07 헌장 정렬] 노트 추가(헌장 우선 원칙 + 매입처 1차 편입/1차 보강, raw_text·재출력·월합계=8c, amount generated). F11 제품 메모에 갱신 문단(매입처별 발주 문장은 1차 구현 완료, DB화는 1차 보강). §12 후순위 목록 문구 보정(발주 "기록" 저장/전송만 2차).
  - `docs/db-schema-definition.md` — 헌장 정렬 노트 + §3 테이블 목록에 `suppliers`(1차 보강, 승인 대기) 행 추가.
  - `docs/task-prompt-unit-8-supabase-persistence-flow.md` — 헌장 정렬 노트 + §3 금지 범위에서 매입처 테이블·품목별 기본 매입처를 1차 보강 이동으로 표기(발주 기록 저장/전송은 2차 유지), §8 문구 현행화(그룹핑 UI는 1차 구현됨, 컬럼명 purchase_supplier_id로 통일).
  - `docs/screen-specification.md` — 헌장 정렬 노트(사이드바 셸·합산표 매입처 기능·즉석 등록 반영) + S15 매입처 관리 화면 행 추가.
  - `order_items.confirmed` 드리프트는 Codex가 fc59baa에서 이미 수정한 것 확인.
- 진행현황 세분화:
  - `docs/order-moa-progress-data.json`(단일 소스) 재구성 — workItems 16개(W01 헌장 고정=완료 ~ W16 2차 보류), 각 항목에 상태/차수/쉬운 설명/왜 필요한가/선행 조건/확인 방법/관련 문서. foundation(완료된 기반 7항목)·checklist·excluded(착수 금지 6항목) 분리. statusLegend를 완료/진행 중/다음/보류/제외 5종으로 정리.
  - `scripts/generate-progress.py` **신규**(앱 코드 아님·문서 생성 도구): JSON→HTML+XLSX 재생성 스크립트를 리포에 포함. 이유: 기존 생성 스크립트가 세션 스크래치패드에서 유실된 전례(헌장 §10 개선 7). 사용: `py -3 scripts/generate-progress.py` (openpyxl 필요).
  - `docs/order-moa-progress-dashboard.html` 재생성 — 진행률 바, 핵심 흐름, 완료 기반, 차수별(1차/1차 보강/1.5차/2차) 작업 카드 16장, 검증 체크리스트, 착수 금지 목록.
  - `docs/order-moa-progress-tracker.xlsx` 재생성 — 시트 5개(요약/작업보드/완료된 기반/검증 체크리스트/제외 기능), 작업보드 상태 셀 색상. 수식 없음(항상 JSON에서 재생성).
- 검증:
  - JSON 파싱+필드 검증(16항목 전 필드), HTML 구조(16카드·섹션), XLSX 열기(시트 5·작업보드 17행×9열·셀 값 스팟체크) 통과.
  - HTML 생성기 잠재 버그 수정: 상태 "진행 중"의 공백이 CSS 클래스를 가르던 문제 → 슬러그 매핑(s-done/doing/next/hold/cut).
  - `git diff --check` 통과(CRLF 경고만), 민감정보 grep 미검출(초회 매치는 "task-prompt" 문자열의 `sk-p` 오탐 확인).
  - root `npm test` 통과 · web `npm test` 78/78 · `npm run build` 성공 · `npm audit --audit-level=low` 0건.
- 커밋하지 않음 — Codex 검수·커밋 판단 대기.
- [위험] progress JSON 스키마 변경으로 이전 형식을 기억하는 세션은 혼동 가능(단일 소스 원칙은 유지, 생성 스크립트가 새 스키마의 기준). [나중] suppliers 마이그레이션 초안은 Codex 승인 후 별도 단위(W05).

## 2026-07-07 Codex (W02 거래처 CRUD + W05/W06 매입처 DB화 초안)

- 선행:
  - Claude의 헌장 고정화/진행현황 세분화 문서를 검수 후 `34d30df docs: refine ordermoa roadmap progress board`로 커밋.
  - 진행현황 HTML은 `http://127.0.0.1:3025/order-moa-progress-dashboard.html`로 열어 확인.
- W02 구현:
  - `web/src/lib/customer-store.ts` 신규 — 거래처 입력 정규화/검증, insert/update payload, Supabase create/update/archive 저장소.
  - `web/src/lib/customer-store.test.ts` 신규 — 거래처명 필수, nullable 필드, insert/update payload 테스트.
  - `web/src/app/customer-management-view.tsx` 신규 — 거래처 검색, 새 거래처 추가, 수정, 보관 UI.
  - `web/src/app/page.tsx` — 사이드바 `거래처 관리`를 준비 중에서 실제 화면으로 전환. 데모 모드는 메모리 반영, DB 모드는 `ordermoa_customers`에 저장/보관.
- W05/W06 구현:
  - `web/supabase/migrations/0004_suppliers.sql` 신규 — `ordermoa_suppliers` 테이블, `ordermoa_products.purchase_supplier_id`, RLS 정책, 교차회사 트리거.
  - `web/src/lib/domain/types.ts` — `Supplier` 타입 추가, Product 매입처 주석 현행화.
  - `web/src/lib/sample-data.ts` — 샘플 매입처를 `Supplier[]`로 타입 지정하고 `loadSampleData()`에 포함.
  - `web/src/lib/order-store.ts` — DB 로드/시드에 suppliers 포함. 부분 시드 상태에서 매입처 누락분을 보충하고 기존 품목의 기본 매입처 연결을 업데이트.
  - 미매칭 신규 품목 즉석 등록 시 기본 매입처를 DB 모드에서는 `ordermoa_suppliers`에 먼저 저장한 뒤 `ordermoa_products.purchase_supplier_id`로 연결. 데모 모드도 즉시 매입처 목록에 반영.
- 진행현황:
  - `docs/order-moa-progress-data.json` — W02 완료, W05/W06 진행 중(마이그레이션 적용 실측 대기)으로 갱신.
  - `scripts/generate-progress.py` 실행으로 HTML/XLSX 재생성.
- 검증(중간):
  - web `npm test` 83/83 통과.
  - web `npm run build` 성공.
- 남은 확인:
  - root `npm test`, web audit, 브라우저 스모크, 최종 커밋.
  - Supabase 실제 적용은 아직 안 함. 적용 순서: 기존 0001~0003 이후 `0004_suppliers.sql`.

## 2026-07-07 Claude (Codex 매입처/거래처 변경분 리뷰 + 보관 가드 패치)

- 목적: 7d3de93(거래처 관리 + 매입처 영속화)·34d30df(진행판) 리뷰. 특히 0004_suppliers.sql의 RLS/트리거/공유 프로젝트 안전성, 시드 보정, 즉석 등록 매입처 저장 흐름.
- 리뷰 결과(통과):
  - 0004_suppliers.sql — ordermoa_ 접두사 전 객체 준수, RLS 4정책(기존 is_company_member 헬퍼 재사용), 교차회사 트리거(null 허용 FK 가드 포함), unique(company_id,name), 인덱스 2종. anon은 정책 부재로 기본 차단. FK는 NO ACTION이라 참조 중 매입처 하드삭제는 시끄럽게 실패(의도적 soft delete 우선과 부합).
  - diffSeedRows/ensureSeed — suppliers 이름 기준 누락 보충 + productSupplierUpdates(샘플명 품목의 매입처 백필, 기존 매입처 지정 시 미변경) 멱등 설계 적절. unique 제약 덕에 동시 실행 중복도 이제 DB가 차단.
  - 즉석 등록 매입처 저장 — 기존 매입처 재사용/신규 insert/실패 시 "매입처 미지정으로 저장" 강등 처리 적절.
- 발견·패치(1건): `customer-management-view.tsx` 보관 가드가 `선택 중 && 마지막`일 때만 차단 → 마지막 거래처가 "선택 중"이 아니면 0개까지 보관 가능(발주 붙여넣기 불능 상태). `customers.length <= 1` 단독 조건으로 수정.
- 브라우저 실측(데모 모드, dev 3021): 샘플 로드 → 거래처 5개 → 4개 보관 → 마지막 1개 보관 시 "마지막 거래처는 보관할 수 없습니다" 차단 확인, 신규 "테스트마트" 추가 정상, 콘솔 오류 0.
- 신규 문서: `docs/guide-apply-0004-suppliers.md` — 비개발자용 Supabase SQL Editor 적용 안내(적용 전 DB 모드 오류가 정상임을 명시, 재실행 시 already exists 안내 포함).
- 검증: root npm test 5/5 · web npm test 83/83(12파일) · build 성공 · audit 0건 · git diff --check 통과 · 민감정보 grep 미검출.
- 커밋하지 않음 — Codex 판단 대기.
- [위험] 0004 적용 전까지 DB 모드는 로드 오류(코드가 suppliers를 조회) — 가이드에 명시. 기존 회사에 최초 로드 시 샘플 매입처 5개가 자동 설치됨(시드 정책상 의도된 동작이나 실데이터 회사에선 어색할 수 있음). [나중] 보관된 매입처와 동일 이름 재등록은 unique 충돌로 실패 → W07 매입처 관리 화면에서 보관 해제로 해결.

## 2026-07-07 Codex (0004 재실행 안전성 보강)

- 목적: 비개발자가 Supabase SQL Editor에 직접 적용할 `0004_suppliers.sql`을 중간 실패/재실행에도 더 안전하게 보강.
- 수정:
  - `create table/index`에 `if not exists` 적용.
  - `purchase_supplier_id` 컬럼을 `add column if not exists`로 변경하고 FK 제약은 별도 `do $$` 블록으로 중복 확인 후 추가.
  - unique(company_id, name) 제약도 중복 확인 후 추가.
  - trigger/policy는 `drop ... if exists` 후 재생성해 재실행 가능하게 변경.
  - `docs/guide-apply-0004-suppliers.md`의 오류 안내를 "재실행 시 Success가 정상" 기준으로 갱신.
- 판단:
  - Claude의 마지막 거래처 보관 가드 패치는 타당해 유지.
  - Supabase 적용 전 DB 모드 오류 가능성은 여전히 정상 상태이며, 0004 적용 후 해결되는 구조.

## 2026-07-07 Codex (비밀번호 로그인 검수)

- 목적: Supabase 무료 메일 `email rate limit exceeded`로 W08 실측이 막히는 문제를 우회하기 위해 Claude가 추가한 비밀번호 로그인 경로 검수.
- 판단:
  - `supabase.auth.signInWithPassword()`를 사용하는 표준 브라우저 로그인으로, service role key나 서버 비밀키 노출 없음.
  - 매직링크 로그인은 fallback으로 유지되어 기존 흐름을 제거하지 않음.
  - 화면 문구의 "테스트 계정" 표현은 향후 실제 사용자에게 어색할 수 있어 "관리자가 등록한 이메일과 비밀번호"로 수정.
  - 이메일/비밀번호 input에 `autoComplete` 속성 추가, Enter 로그인은 busy 중 중복 호출하지 않도록 보강.
- 검증:
  - web `npm test` 83/83.
  - web `npm run build` 성공.
  - git diff --check 통과.
  - 민감정보 grep은 `password === ""` 코드 조건만 오탐으로 확인.

## 2026-07-07 Claude (W05/W06/W08 실측 완료 + 실사용 피드백 설계)

- 실측 결과(사용자 직접 수행):
  - 0004_suppliers.sql Supabase 적용 성공(Table Editor에서 ordermoa_suppliers 확인) → W05 완료.
  - 매직링크가 email rate limit으로 반복 차단 → auth-gate에 비밀번호 로그인 추가(Codex가 a696a36으로 커밋), Supabase Auth에 password 계정(Auto Confirm) 생성.
  - 비밀번호 로그인 → 발주 여러 건 확정 → F5 후 주문 목록 유지 → **W08(8b 실측) 성공**. 시드에 매입처 포함 → W06 완료.
  - 참고: 매직링크 근본 원인은 Auth URL Configuration에 localhost:3021 미등록(기본 3000). 비밀번호 로그인으로 우회, 정식화는 [나중].
- 실사용 피드백 8건 설계: `docs/order-moa-feedback-design-2026-07-07.md` 신규.
  - 용어 정리(주문 확정=판매 저장 / 매입처 발주=구매 문장 / 매입처 명세서는 매입처가 발행).
  - F1 문구 통일, F2 발주 문장 템플릿("OO입니다/발주 품목입니다/번호 목록"), F3 매입처 파스텔 색 구분, F4 누락 검수(카운터·복사 전 경고·미지정 뱃지) = **1차 즉시, DB 변경 0건**.
  - F5 보냄 체크(1차 보강 화면만→2차 DB), F6 W07 매입처 관리(품목별 매입처 지정은 W03으로 분담), F7 명세서 하단 1차 보정, F8 발주 이력/입고/매입 기록=2차 유지.
  - Codex 즉시 구현용 프롬프트 포함(§6 — 합산표 개선 팩).
- 진행판 갱신: W05/W06/W08 → 완료, **W17(합산표 개선 팩) 신규 추가**, currentFocus/최근 커밋 갱신 → HTML/XLSX 재생성(17항목 검증 통과).
- 검증: 문서/진행판 작업만(앱 코드 무변경 — auth-gate는 a696a36으로 이미 커밋됨). JSON 파싱·HTML 17카드·XLSX 18행 확인. 커밋하지 않음 — Codex 판단.
- [다음] W17 구현(설계 §6 프롬프트) → W07 → W03. [위험] 공유 Supabase 무료 쿼터 경고(Grace period is over) — 전용 프로젝트 분리 논의 필요.

## 2026-07-07 Claude (W17 합산표 개선 팩 F1~F4 구현 완료)

- 범위: 1차 즉시 / DB 변경 0건 / 마이그레이션 없음 (설계 §6 프롬프트 그대로).
- 순수 함수(TDD, `web/src/lib/aggregate.ts` + `aggregate.test.ts`):
  - `formatSupplierPurchaseText(sections, { companyName?, withSupplierHeader? })` 재작성 — "회사명입니다 / 발주 품목입니다 / 1. 품목 수량단위" 번호 목록. 회사명 없으면 인사말 줄 생략. 전체 복사=`[매입처명]` 헤더 O, 개별 복사=헤더 X.
  - `buildPurchaseChecklistSummary(rows, selectedSet, products)` 신규 → { total, included, excluded, unassigned }.
  - `supplierColorIndex(name): 0..7` 신규(문자 해시, 같은 이름=같은 색).
- 화면(`web/src/app/page.tsx`):
  - F2 회사명 주입(DB=session.companyName, 데모=data.company.name) → 전체 textarea + 매입처 카드 pre 모두 새 형식.
  - F4 카운터 줄("발주 대상 N · 담음 · 안 담음 · 미지정"), 복사 시 excluded>0이면 window.confirm 경고, 미지정 품목은 노란 "미지정" 뱃지.
  - F3 매입처 셀 파스텔 색 태그(.sup-tag.sup-cN) + 매입처 카드 왼쪽 3px 보더. 카드 제목에 (품목 N개).
  - F1 문구 3곳: 주문 확정 버튼 아래 안내, 합산표 상단 설명, 주문 목록 제목 옆.
- CSS(`globals.css`): `.sup-c0~7` 파스텔 8색(custom prop --sup-bg/--sup-fg), `.sup-tag`, `.purchase-counter`/`.count-warn`, `@media print`에서 `.sup-tag` 배경 제거(텍스트 유지).
- 검증: root `npm test` 5/5 · web `npm test` 87/87 · web `npm run build` 성공 · `npm audit --audit-level=low` 0건.
  - 브라우저 실측(데모 모드, 발주 ⑪·⑫ 2건 확정): 카운터/색 태그/미지정 뱃지 표시, 체크 시 카운터 갱신, 개별/전체 발주문장 새 형식(회사명 "오더모아 샘플상사" 인사말), 안 담음 9개 상태 복사 시 confirm 경고, 모바일 375px 가로 넘침 없음, 콘솔 오류 0.
- 미커밋(협업 규칙 — Codex 판단). 진행판 W17 → 완료, currentFocus 갱신 후 HTML/XLSX 재생성.
- [알려진 한계] supplierColorIndex는 8색 해시라 매입처가 많으면 색 충돌 가능(실측 샘플에서 야채매입처·뿌리채소매입처가 같은 sup-c7). 색은 보조이고 이름 텍스트 항상 표시라 허용(설계대로). 필요 시 2차에서 충돌 회피 배정으로 승격.
- [다음] W07 매입처 관리(supplier-store + supplier-management-view, customer 패턴 복제) → W03 품목·별칭(품목 폼에 매입처 드롭다운).

## 2026-07-07 Claude (W07 매입처 관리 화면 구현 완료)

- 범위: 1차 보강 / 새 마이그레이션 없음(0004 ordermoa_suppliers 이미 적용). customer 패턴 최대 재사용.
- 신규 파일:
  - `web/src/lib/supplier-store.ts` — customer-store 패턴 복제(normalize/validate/toInsert/toUpdate + create/update/archive/**unarchive**/listArchivedSuppliers). `friendlySupplierError`: unique(company_id,name) 충돌(23505)을 "보관된 매입처라면 복원" 안내로 변환.
  - `web/src/lib/supplier-store.test.ts` — 순수 함수 4테스트(TDD).
  - `web/src/app/supplier-management-view.tsx` — customer-management-view 복제·치환(폼은 이름/메모만). 좌측 목록(검색)+보관 목록(복원 버튼)+우측 폼.
- page.tsx 배선: View에 "suppliers" 추가, 기준정보 메뉴 "매입처 관리" 실화면 연결, saveSupplier/archiveSupplier/unarchiveSupplier(데모/DB 분기), DB 모드는 화면 진입 시 listArchivedSuppliers 로드. 이름 변경 시 products의 purchaseSupplierName 스냅샷 동기화(설계 F6 주의 지점 — 데모/DB 모두 화면 상태 기준).
- 정책 결정(범위 6번): **마지막 매입처 보관 허용, 가드 없음** — 설계 F6대로 매입처 0개여도 품목이 "매입처 미지정"으로 흘러가 앱 동작. 거래처(마지막 1개 차단)와 다른 점을 화면 안내문으로 보완.
- 데모 모드 중복 이름은 코드에서 차단(DB unique와 동일 동작).
- CSS: `.archived-row`(점선 테두리+저채도)만 추가.
- 검증: root 5/5 · web `npm test` 91/91 · build 성공 · audit 0건.
  - 브라우저 실측(데모 모드): 메뉴 연결, 목록 5건 표시, 추가(테스트정육점), 중복 이름 오류 표시, 수정(정육매입처), 보관→보관 목록 표시→복원, 이름 변경(야채매입처→싱싱야채상회)이 합산표 매입처 태그에 즉시 반영, 콘솔 오류 0.
  - DB 모드는 로그인 계정 필요해 실측 못 함 — customer와 동일 패턴 + RLS 정책 기적용이라 코드 검증까지. [다음 실측 때 확인 권장]
- 미커밋(협업 규칙 — Codex 판단). 진행판 W07 → 완료, HTML/XLSX 재생성.
- [다음] W03 품목·별칭 관리 CRUD(품목 폼에 매입처 드롭다운 — F6 분담분 포함).

## 2026-07-07 Claude (W03 품목·별칭 관리 CRUD 구현 완료)

- 범위: 1차 / 새 마이그레이션 없음 — 기존 ordermoa_products·ordermoa_product_aliases·ordermoa_suppliers 사용.
- 신규 파일:
  - `web/src/lib/product-store.ts` — normalize/validate(이름·단위 필수, 매입단가 0 이상 정수)/toInsert/toUpdate + create/update/archive/unarchive/listArchivedProducts(별칭 포함) + addAliasInDb/removeAliasInDb. `validateNewAlias`: DB unique(company_id,alias) 규칙을 화면에서 선검증(품목명 충돌·자기 별칭·타 품목 별칭 구분 메시지). `friendlyAliasError`(23505 → 중복 안내).
  - `web/src/lib/product-store.test.ts` — 순수 함수 5테스트(TDD).
  - `web/src/app/product-management-view.tsx` — supplier 뷰 패턴 + 폼 4필드(품목명/기본 단위/기준 매입단가(선택)/기본 매입처 드롭다운·미지정 옵션) + 별칭 칩(× 삭제)·별칭 추가 input(Enter 지원). 별칭은 수정 모드에서만 관리(신규 폼 단순화). 검색은 품목명·별칭·단위·매입처 통합.
- page.tsx 배선: View "products" 추가, "품목·별칭 관리" soon 해제·실화면 연결, saveProduct/archiveProduct/unarchiveProduct/addProductAlias/removeProductAlias(데모/DB 분기), DB 모드 화면 진입 시 listArchivedProducts 로드. products 상태가 파싱·합산표의 단일 소스라 상태 갱신만으로 즉시 반영(별도 동기화 코드 불필요).
- CSS: `.alias-box`/`.alias-chips`/`.alias-chip`만 추가.
- 검증: root 5/5 · web `npm test` 96/96 · build 성공 · audit 0건.
  - 브라우저 실측(데모): 메뉴 연결, 품목 추가(삼겹살/근/12000원/두부콩나물매입처 드롭다운), 별칭 추가('숙주박스'→숙주)·중복 경고 2종('이미 이 품목의 별칭'/'이미 품목명')·삭제, **발주 붙여넣기에서 '숙주박스 2봉' → 숙주 즉시 매칭 확인**, 보관→복원, 별칭으로 검색('숙주나물'→숙주), 콘솔 오류 0.
  - DB 모드는 로그인 계정 필요해 실측 못 함 — 기존 즉석 등록과 같은 테이블/패턴 + RLS 기적용이라 코드 검증까지. [다음 실측 때 품목 추가·별칭 추가 F5 유지 확인 권장]
- 주의 발견: dev 서버 실행 중 `npm run build`를 돌리면 .next가 덮여 dev가 500/404로 깨짐 → 서버 재시작으로 해결. 다음부터 빌드는 dev 중지 후 또는 검증 마지막에.
- 미커밋(협업 규칙 — Codex 판단). 진행판 W03 → 완료, HTML/XLSX 재생성.
- [다음] W04 단가 관리 또는 W09~W11(8c — 원문 저장/저장 주문 합산표/명세서 재출력). [위험 유지] 공유 Supabase 무료 쿼터 경고 — 전용 프로젝트 분리 논의.

## 2026-07-07 Claude (W04 단가 관리 + W07 확장(매입처 연락처/주소) 구현 완료)

### W04 단가 관리 화면 (마이그레이션 없음 — 기존 ordermoa_customer_prices)
- 신규: `web/src/lib/price-store.ts` — `buildPriceRows`(거래처별 품목 단가표, 품목명+별칭 검색, 미등록만 필터), `validatePriceValue`(0 이상 정수), `upsertCustomerPriceInDb`(기존 '이 단가 저장'과 동일 onConflict 규칙). `web/src/lib/price-store.test.ts` 4테스트(TDD).
- 신규: `web/src/app/price-management-view.tsx` — 거래처 select + 품목/별칭 검색 + "미등록만 보기" 토글 + 요약 카운터(품목 N·등록 M·미등록 K) + 행별 인라인 단가 입력(Enter 저장). 미등록은 노란 뱃지.
- page.tsx: View "prices" + "단가 관리" 메뉴 실화면 연결 + `saveCustomerPrice`(데모/DB 분기). customerPrices 상태가 파싱의 단일 소스라 저장 즉시 다음 파싱에 반영.
- 과거 주문 unit_price 스냅샷은 안 건드림(현재 단가표만 수정) — 화면 안내문에도 명시.

### W07 확장 — 매입처 기본정보(연락처/주소)
- **마이그레이션 신규: `web/supabase/migrations/0005_supplier_contact.sql`** — `add column if not exists phone/address text`. 데이터 삭제 없음, RLS 기존 정책 그대로(테이블 단위). contact_name은 보류(쓸 곳 없음 — 필요 시 text 컬럼 1개).
  - **[적용 필요]** 비개발자용 가이드: `docs/guide-apply-0005-supplier-contact.md`. **DB 모드는 0005 적용 전까지 로딩 오류가 정상**(select에 phone/address 포함됨). 데모 모드 무관.
- Supplier 타입 + supplier-store(normalize/validate/insert/update/select SUPPLIER_COLS) + order-store 로드에 phone/address 추가. supplier-store.test.ts 확장(TDD).
- supplier-management-view: 거래처와 같은 배치(매입처명/연락처/주소(span-2)/메모), 검색도 4필드.
- 발주 문장은 이름만 사용(연락처/주소 미포함 — 요청대로 관리 화면 전용). 품목별 매입처 지정 로직 무변경.
- 버그 픽스: page.tsx 데모 모드 saveSupplier가 phone/address를 버리던 것 수정(실측에서 발견).

### 검증
- root 5/5 · web `npm test` **100/100** · build 성공 · audit 0건.
- 브라우저 실측(데모): 단가 관리 — 거래처 선택/검색/미등록 필터(28건)/단가 저장(콩나물 8,000→9,999) → **발주 붙여넣기 '콩나물 2박스' = 19,998원 즉시 반영**. 매입처 — 연락처/주소 추가·수정·검색(전화번호/주소로 검색 OK), 합산표 발주 문장에 연락처 미포함 확인. 콘솔 오류 0.
- DB 모드 실측 못 함(로그인 필요). **0005 적용 후** 매입처 연락처 저장→F5 유지, 단가 저장→F5 유지 확인 권장.

### Codex 검수용 변경 파일 목록
- 신규: `web/src/lib/price-store.ts`, `web/src/lib/price-store.test.ts`, `web/src/app/price-management-view.tsx`, `web/supabase/migrations/0005_supplier_contact.sql`, `docs/guide-apply-0005-supplier-contact.md`
- 수정: `web/src/lib/domain/types.ts`(Supplier phone/address), `web/src/lib/supplier-store.ts`(+테스트), `web/src/lib/order-store.ts`(suppliers select), `web/src/app/supplier-management-view.tsx`, `web/src/app/page.tsx`(View prices·핸들러·데모 saveSupplier 픽스), `docs/order-moa-progress-data.json`(W04 완료·W07 확장 반영) + HTML/XLSX 재생성
- 미커밋 — Codex 검수·커밋. 0005는 Supabase 적용도 필요(가이드 참조).
- [다음] W09~W11(8c). [위험 유지] 공유 Supabase 무료 쿼터.

## 2026-07-08 Claude (W09 발주 원문 raw_text 저장/삭제 구현 완료)

### 스키마 발견 + 최소 마이그레이션 제안 (사용자 승인 "0006 제안 + 전체 구현")
- `ordermoa_order_imports`는 raw_text(nullable, "삭제 시 null")·RLS 4정책까지 완비돼 있으나 **order_id 링크 컬럼이 없음** → "이 주문의 원문"을 특정 불가. 근사 매칭(거래처+시각)은 오삭제 위험이라 배제.
- **마이그레이션 제안(적용/커밋 안 함): `web/supabase/migrations/0006_order_import_link.sql`** — `add column if not exists order_id uuid references ordermoa_orders(id) on delete cascade` + 인덱스 + order_id 회사 일치 검사. 삭제 없음, RLS 테이블 단위라 무영향, idempotent, ordermoa_ 접두사.
- **[적용 필요]** 비개발자 가이드: `docs/guide-apply-0006-order-import-link.md`.

### 구현
- `web/src/lib/order-store.ts`:
  - `ConfirmedOrder`에 `rawText?: string|null`(undefined=미조회/null=없음·삭제/string=원문).
  - `saveOrder(...rawText)` — order/items 저장 성공 뒤 **best-effort**로 order_imports insert(created_by=`db.auth.getUser()`). 실패/0006 미적용이면 조용히 건너뜀 → **주문 확정은 절대 안 막힘**(회귀 0). 성공 시에만 order.rawText 세팅.
  - `loadOrders` — 주문 로드 후 order_imports를 best-effort 조회해 병합(0006 없으면 catch로 스킵, 목록 유지).
  - `deleteOrderRawText` — order_imports.raw_text만 null update(orders/items 절대 안 건드림).
  - 순수 함수 `attachRawText`/`withRawTextCleared`(+order-store.test.ts 2테스트: 병합·삭제가 lines/total 불변 검증).
- `web/src/app/page.tsx`: confirmOrder(DB=rawText 전달, 데모=order.rawText 메모리 저장), `deleteRawText`(confirm 후 raw_text만 제거), 명세서 상세에 `no-print` 원문 패널(`<details>` 보기 + 삭제 + "삭제해도 주문 유지" 안내).
- `web/src/app/globals.css`: `.raw-text-panel`/`.raw-text` 스타일만.

### 자체 리뷰 (불변 규칙 재확인)
- unit_price 스냅샷 유지: saveOrder/toItemInserts 무변경, mapDbOrder는 저장값(unit_price/amount) 그대로 읽음. ✅
- 과거 주문 customer_prices 재조회 없음. ✅ 예상 마진 비저장(표시 계산만). ✅
- raw_text 삭제 가능·주문 유지. ✅ order_imports는 별도 테이블이라 원문 삭제가 items에 영향 0(테스트로 고정). ✅
- 회귀 방지: saveOrder rawText는 마지막 선택 파라미터(default null), 유일 호출부 confirmOrder만 영향. import/merge 전부 best-effort try/catch → 0006 미적용 상태에서도 앱 정상.

### 검증
- root 5/5 · web `npm test` **102/102**(order-store +2) · build 성공 · audit 0건 · git diff --check clean.
- 데모 smoke(콘솔 0): ⑪ 확정→주문 상세 원문 표시→삭제(confirm)→명세서 76,000원·10행 유지·패널 "원문 없음", ⑫ 주문은 자기 원문 그대로(주문별 독립). 원문 패널은 no-print(인쇄본 미노출).
- 데모 F5 유지는 N/A(메모리). **DB F5 유지 실측은 0006 적용+로그인 후 필요.**

### 개선 아이디어 (승인 없이 구현 안 함)
- 즉시 후보(작음): 주문 목록 행에 "원문 있음" 작은 표시, saveOrder의 getUser()→getSession()으로 네트워크 1회 절감.
- 나중: 원문 저장 실패 시 소프트 안내(현재는 조용히 degrade), 원문 검색.
- 제외/후순위(범위 밖): OCR·카톡 자동읽기·세금계산서·재고·이카운트 연동.

- Codex 검수 대상. **0006 Supabase 적용 필요**(가이드).
- [다음] W10(저장 주문 기반 합산표 재조회) → W11(명세서 재출력). [위험 유지] 공유 Supabase 무료 쿼터.

## 2026-07-08 Codex (0006 Supabase 적용 + W09 DB 실측 완료)

- 사용자가 `docs/guide-apply-0006-order-import-link.md` 안내대로 Supabase SQL Editor에서 `0006_order_import_link.sql` 적용 완료(`Success. No rows returned`).
- DB 모드 로그인 상태(`http://localhost:3027`)에서 W09 실측:
  - 발주 원문 `콩나물 1박스 / 두부 1판 / 미나리 1단` 입력 → 파싱 정상(가람식당, 14,000원) → 주문 확정.
  - 주문 목록 최상단에 2026-07-08 가람식당 주문(콩나물, 두부 외 1건 / 14,000원) 확인.
  - 거래명세서 상세에서 발주 원문이 주문별로 표시됨(`order_imports.order_id` 링크 동작).
  - 원문 삭제 후 "저장된 발주 원문이 없습니다." 표시, 주문 품목·금액·명세서 유지.
  - F5 새로고침 후에도 삭제 상태 유지, 주문/금액/명세서 유지. 앱 콘솔 오류 0(브라우저 검사 도구 clipboard bridge 메시지는 앱 오류 아님).
- 진행판 갱신: W09의 "0006 적용 필요/DB 실측 필요" 문구를 "적용 완료/DB 실측 완료"로 변경. HTML/XLSX 재생성 완료.
- [다음] W10 저장 주문 기반 합산표 재조회 → W11 저장 주문 기반 명세서 재출력.

## 2026-07-08 Claude (대시보드 문구 정합성 + W10 저장 주문 기반 합산표)

### 핵심 판단: W10은 신규 로직·마이그레이션 불필요
- DB 모드 `orders` 상태는 이미 `loadOrders(db, companyId, ...)` 결과(전체 확정 주문)이고, 합산표는 그 `orders`를 날짜·거래처로 필터해 `buildAggregateRows`로 집계 → **저장 주문 기반 재조회가 이미 동작**. F5 시 로드 이펙트가 다시 불러와 동일 표 재현(loadOrders 경로는 W08/W09에서 F5 유지 실측됨). → 문구/상태/UX 보강만 수행.

### 변경 (web/src/app/page.tsx, 문구·소규모 리팩터만)
- **대시보드 정합성(작업1)**: 옛 "다음 단계=8b 실측/로그인 제한 해제" 제거 → "저장 주문 활용 / 날짜별 합산표 재조회·명세서 재출력 준비". "오늘 확정 주문"→모드별 "저장된 주문"(DB)·"확정한 주문"(데모, F5 초기화라 과장 방지). "준비 중인 업무"→"진행 상태"로 바꾸고 실제 상태 5항목(기준정보 4종·발주 원문·저장 주문 합산표=완료 / 명세서 재출력=다음 / 월합계·미수금·세금=2차).
- **합산표(작업2)**: aggregate useMemo를 `filteredOrders`(필터) + `aggregate`(집계) 2개로 분리(재사용). 헤더에 모드별 안내("저장된 주문을 다시 불러와 합산…새로고침해도 같은 표, 금액은 확정 당시 단가 그대로" / 데모는 "세션 기준·초기화"). 필터 상태줄에 "주문 N건 · M품목" 추가. 빈 결과 시 저장 주문이 있으면 "이 조건에 맞는 주문 없음 + 저장 N건 + 필터 초기화" 버튼으로 구분.

### 자체 리뷰 (제품 원칙)
- unit_price 스냅샷 유지(saveOrder/mapDbOrder 무변경). 과거 주문 customer_prices 재조회 없음(합산은 저장된 order_items 값만). 예상 마진 비저장. raw_text(W09) 무변경. filteredOrders 분리는 동일 술어라 회귀 없음(테스트/빌드 통과). 마이그레이션 0건.

### 검증
- root 5/5 · web 102/102 · build 성공 · audit 0건 · git diff --check clean.
- 데모 smoke(콘솔 0): 대시보드 문구 전부 실제 상태 반영 확인. 발주 2건→합산표 "주문 2건·11품목", 가람식당 필터"주문 1건·6품목", 없는 날짜→"이 조건에 맞는 주문 없음/저장 2건"+필터 초기화로 복원.
- DB smoke는 별도 실행 안 함(로그인 필요) — 합산 소스(loadOrders)·저장 로직 무변경이라 F5 재현은 기존 검증분으로 커버.

### 개선 아이디어 (승인 없이 구현 안 함)
- 즉시(작음): 합산표에 "최근 7일" 빠른 필터/날짜 프리셋(어제·이번주).
- 나중: 기간(범위) 필터, 저장 주문 많아지면 loadOrders 페이지네이션/기간 상한.
- 제외(범위 밖): 회계/세금/재고/OCR/카톡 자동읽기/이카운트 연동.

- Codex 검수 대상.
- [다음] W11(저장 주문 기반 거래명세서 재출력 — 이미 주문 목록→보기로 열림. "확정 당시 단가 재출력" 문구/F5 검증 보강 위주로 추정). [위험 유지] 공유 Supabase 무료 쿼터.

## 2026-07-08 Claude (W11 거래명세서 재출력 + 인쇄 양식 하단 마감 보정)

### 판단: 재출력 로직은 이미 있음 — 스냅샷 검수 + 인쇄 양식 마감이 핵심 (마이그레이션 0건)
- 주문 목록→보기는 `currentOrder`(loadOrders/데모 저장 주문)의 lines/unitPrice/amount·order.total만 사용. customer_prices 재조회 없음, 예상 마진 비저장. 단가표 바꿔도 과거 명세서 불변(스냅샷). raw_text 삭제와 명세서 재출력 상호 무관(별 경로). → 재출력은 이미 정상, 검수만.

### 변경 (문구·CSS·행수 — web/src/app/page.tsx, globals.css, lib/delivery-note.ts + 테스트, docs/delivery-note-print-spec.md)
- **작업1 재출력 명확화**: 명세서 상단 no-print 안내 추가 — "저장된 주문을 다시 연 것. 금액은 확정 당시 단가 기준, 단가표 바꿔도 안 변함". no-print라 인쇄본엔 안 나옴.
- **작업2 하단 마감(피드백 3건 해결)**:
  1) 표 선 끊김 → `.note-table{border-collapse:collapse}` (셀 경계 이어붙임).
  2) 합계 떠 보임 → 표 밖 `.note-total` div 제거하고 표 `<tfoot>`에 "공급가 합계 (부가세 없음)"을 공급가액 열에 정렬한 합계 행으로 이동(표에 붙음).
  3) 하단 마감 → tfoot에 "비고 / 인수확인(서명)" 최소 마감행 추가(태스크 허용 범위의 최소 비고/확인), 고정 행수 10→15(`DELIVERY_NOTE_MIN_ROWS` 상수화)로 A4 1장 균일·품목 적어도 표가 안 끊김. 인쇄 시 비고행 높이 44px 유지.
- delivery-note.ts: `DELIVERY_NOTE_MIN_ROWS=15` export, 기본값으로 사용. page.tsx는 `padDeliveryNoteLines(order.lines)`(기본값).
- delivery-note.test.ts: 1품목→15행 채움 락 테스트 추가.

### 자체 리뷰
- 제품 원칙: unit_price 스냅샷·customer_prices 재조회 없음·마진 비저장·raw_text 무관 전부 유지. 세금계산서/전자발행 표현 없음, VAT "부가세 없음(1차)" 유지.
- CSS 영향 범위: 변경은 전부 `.note-*` 스코프 → 합산표/주문목록/단가 등 다른 표 무영향. 제거한 `.note-total`은 미사용. `.note-doc .table-wrap{overflow:visible}`는 note 한정.

### 검증
- root 5/5 · web 103/103(delivery-note +1) · build 성공 · audit 0건 · git diff --check clean.
- 데모 smoke(콘솔 0): 6품목 명세서 — border-collapse 적용, 15행(6품목+9빈행) 채움, 표선 연결, tfoot 합계 76,000 공급가액 열 정렬, 비고/인수확인 마감행, 떠있던 total 제거, "확정 당시 단가" no-print 안내 확인. 화면 미리보기 육안 확인(스크린샷). 인쇄 미리보기는 @media print에서 no-print 숨김+tfoot 유지 구조 확인(브라우저 실제 인쇄창은 사용자 확인 권장).

### 개선 아이디어 (승인 없이 구현 안 함)
- 즉시(작음): 없음(현 마감으로 충분).
- 나중: 명세서 번호 자동 채번(현재 "-"), 규격 별도 열, 보관용/거래처용 2부 출력(스펙 §4.1), 품목 15개↑ 다중 페이지 정돈.
- 제외(범위 밖): 세금계산서 발행·전자문서·회계/재고/OCR/카톡 자동읽기/이카운트.

- Codex 검수 대상.
- [다음] W12(거래처별 월 합계) 또는 잔여 보강. [위험 유지] 공유 Supabase 무료 쿼터. 인쇄 실제 출력 육안 확인은 사용자 권장.

## 2026-07-08 Claude (W12 거래처별 월 합계)

### 구현 (마이그레이션 없음 — order.total 스냅샷만)
- 신규 `web/src/lib/monthly-summary.ts`: 순수 함수 `buildMonthlySummary(orders, "YYYY-MM")` → 거래처별 { orderCount, totalAmount, lastOrderDate } (금액 내림차순·동률 이름순) + 전체 합계·건수. `availableMonths(orders)`(존재 달 최신순). 입력은 최소 타입 `MonthlyOrderInput`(date/customerId/customerName/total) — ConfirmedOrder가 구조적으로 만족. **customer_prices 입력 자체가 없음 → 스냅샷 불변이 구조로 보장.**
- 신규 `web/src/app/monthly-summary-view.tsx`: 조회 화면. `<input type="month">`(기본=최신 달), 표(거래처/주문 건수/공급가 합계/마지막 주문일) + tfoot 전체 합계. "세금계산서 발행 기능이 아니며 월말 확인용" 안내. 빈 월 안내. 공용 formatKRW 사용.
- page.tsx: View "monthly" + 조회 그룹에 '거래처별 월 합계' 메뉴(2차 메뉴 아님, 1차 조회) + 렌더. 대시보드 '진행 상태'에서 월 합계를 완료로 이동(미수금·세금만 2차).
- CSS: `.month-total-row`만.
- 테스트 `monthly-summary.test.ts` 4건(월 그룹핑·타월 제외·빈 월·availableMonths, 정렬/합계 검증).

### 자체 리뷰 (제품 원칙)
- 월 합계 = order.total(=Σ order_items.amount 스냅샷)만 사용, 현재 단가표 재조회 없음. 예상 마진 비저장. raw_text와 무관(monthly-summary는 raw_text를 안 봄). 세금계산서/입금/미수금/회계 확장 없음 — 조회 숫자까지만. 사이드바 2차 메뉴 안 늘림(기존 미수금 2차 그대로).
- function-spec F12(거래처별 주문표: order_items.amount 합, 읽기 전용, 별도 테이블 없음)와 일치 → spec 수정 불필요. CSV·일/년 기간은 F12의 넓은 범위지만 W12(월 합계 조회) 밖으로 미구현(과확장 금지).

### 검증
- root 5/5 · web 107/107(monthly +4) · build 성공 · audit 0건 · git diff --check clean.
- 데모 smoke(콘솔 0): 2026-07 발주 2건 → 가람식당 76,000·한빛카페 49,400·전체 125,400(금액 내림차순), 마지막 주문일 표시, 세금 아님 안내. **단가표 콩나물 99,999원 변경 후 월 합계 불변(스냅샷 검증)**. 빈 월(2026-01) 안내. month 기본값=최신 달.
- DB smoke는 로그인 필요라 미실행 — orders는 loadOrders(스냅샷)라 동작 동일, 회귀 위험 낮음.

### 개선 아이디어 (승인 없이 구현 안 함)
- 즉시(작음): 월 합계 CSV 내보내기(합산표에 이미 exportCsv 패턴 있음), 거래처 클릭→해당 월 주문 목록 필터.
- 나중: 일/분기/년 기간 집계(F12 확장), 전월 대비 증감.
- 제외(범위 밖): 세금계산서 발행·입금/미수금 자동·회계 장부.

- Codex 검수 대상.
- [다음] 잔여 보강(인쇄 육안·다중 페이지·명세서 채번·월 합계 CSV) 또는 전용 Supabase 분리. [위험 유지] 공유 쿼터.

### 2차 검수/디버깅 (2026-07-08, Codex 토큰 소진으로 Claude가 재검수)
- **버그 발견·수정**: 월 선택 `<input type="month">`를 `.checkline` 라벨로 감싸 `.checkline input{width:18px}`가 상속 → 입력칸이 18px로 찌그러짐(기능은 되나 육안 사용 불가). preview_inspect로 renderedWidth=18px 확인. `.checkline` 제거하고 일반 라벨(inline flex)+`width:170`으로 교체 → 155px 정상 렌더 재확인.
- 재검증: root 5/5 · web 107/107 · build 성공 · audit 0 · diff clean · 데모 재실측(가람식당 76,000·한빛카페 49,400·전체 125,400, 콘솔 0).
- page.tsx/globals.css diff 재확인: W12 배선(View·nav·title·import·render·대시보드 진행상태·month tfoot CSS)만, 의도 외 변경 없음.
- 통합 핸드오프 문서 작성: `docs/codex-review-W12.md`(미커밋 W12 배치 한 장 요약 — Codex가 토큰 복구 후 한 번에 검수·커밋용).

## 2026-07-08 Claude (W15 데이터 내보내기 CSV — 절반: export만)

### 배경/판단
- 공유 Supabase 무료 쿼터 경고("Grace period is over")가 서 있는 리스크 → **데이터를 파일로 꺼내는 안전망**이 전용 프로젝트 분리의 첫 단계이자 즉시 가치(회계사 전달·본인 정리). export만, 마이그레이션 없음. 사용자 승인("지금 이대로 진행") 후 진행. 프롬프트: `docs/task-prompt-W15-export.md`.

### 구현
- 신규 `web/src/lib/csv-export.ts`: `toCsv(rows)`(콤마·따옴표·개행 escape + `=,+,-,@` 시작 셀 CSV 인젝션 방어) + `downloadCsv(name, rows)`(UTF-8 BOM). `csv-export.test.ts` 4테스트.
- page.tsx: 기존 허술한 인라인 exportCsv(합산표)를 `downloadCsv`로 교체(중복 제거·escape 개선). 주문 목록 CSV(`exportOrdersCsv`) + 기준정보 4종 백업(거래처/매입처/품목별칭/단가). '데이터 내보내기' view 추가 + 사이드바 기존 soon '데이터 관리'를 실화면(view:"data")으로 승격(2차 미수금 메뉴 미변경).
- monthly-summary-view: 월 합계 CSV 버튼(선택 월, 전체합계 행 포함).
- globals.css: `.export-grid`/`.export-item`만.

### 내보내는 파일
거래처.csv · 매입처.csv · 품목별칭.csv(별칭 `;`) · 단가.csv(이름 lookup) · 주문목록.csv · 거래처별월합계_YYYY-MM.csv. 금액은 전부 저장 스냅샷(order.total/저장 단가), customer_prices 재조회 없음.

### 자체 리뷰/디버깅
- **버그 발견·수정**: 주문 목록 CSV 버튼 넣을 때 JSX fragment(`<>`) 미종결 → 닫아서 빌드 통과.
- escape 개선 실증: 데모에서 콤마 든 메모 `"점심 백반, 채소 위주"`·품목요약 `"콩나물, 두부 외 4건"`가 열 안 깨지고 quoting됨.
- 제품 원칙: 스냅샷 금액만·마진 미포함·raw_text 미포함(개인정보 제외)·ordermoa_ 접두사·마이그레이션 0. 세금/회계 확장 없음.
- [알려진 범위] 백업은 **활성 데이터만**(archived 거래처/매입처/품목은 state에 없어 제외) — 후순위 개선.

### 검증
- root 5/5 · web 111/111(csv-export +4) · build 성공 · audit 0 · diff clean.
- 데모 smoke(콘솔 0): 6종 CSV 다운로드 가로채 내용 확인 — 헤더·행·escape·BOM·스냅샷 금액(월합계 125,400·주문 76000/49400) 정확. 빈 데이터 버튼 disabled. 나브 '데이터 내보내기' 활성·미수금 2차 그대로.
- DB smoke 미실행(로그인) — 내보내는 state는 loadOrders/loadCompanyData 저장본이라 동작 동일.

### 개선 아이디어
- 즉시(작음): 없음.
- 나중: 엑셀 가져오기(import·W15 나머지 절반), 백업에 archived 포함, 전체 zip/JSON 한 번에, 라인 단위 주문 CSV.
- 제외: 세금계산서·회계·재고.

- Codex 검수 대상. W12와 page.tsx/globals.css 공유 → 함께 커밋 권장(codex-review-W12.md §9~10).
- [다음] 엑셀 가져오기 또는 전용 Supabase 분리(백업 수단 생겨 적기). [위험 유지] 공유 쿼터.

## 2026-07-08 Claude (W18 Phase 1 UX 개선 — 주문일·단가 일괄저장·주문목록 날짜조회)

참고 설계: `C:\Users\RYZEN\.claude\plans\1-shiny-kahn.md`(테스트 카운트 77은 옛값 — 현재 web 117). Phase 2(카테고리 6종)·Phase 3(product_units 다단위/기본단가 예외)는 스키마 필요라 이번에 하지 않음(분리). 마이그레이션 0.

### 작업1 — 주문일 표시/수정 (KST)
- 신규 `web/src/lib/date-utils.ts`: `todayKst(now?)` — UTC+9 벽시계 날짜. `page.tsx today()`가 이걸 쓰도록 교체 → 한국 새벽(UTC 15~24시)에 전날로 저장되던 버그 해결. 테스트 3(UTC 낮/새벽/자정경계).
- page.tsx: `confirmDate` 상태(기본 todayKst). ReviewView에 `<input type=date>` 주문일 + 안내문구. confirmOrder(DB=saveOrder(...confirmDate...), 데모=order.date=confirmDate). 확정 후 confirmDate→todayKst 리셋, orderListDate→방금 주문 날짜로 맞춰 바로 보이게.

### 작업2 — 파싱 화면 단가 일괄 저장
- price-store.ts: `collectPriceChanges(lines, prices, customerId)` → {changes, conflicts}. productId 있고 unitPrice>0, 기존과 다른 값만. 같은 품목 여러 줄=마지막 값+conflict 보고. `upsertCustomerPricesInDb`(한 번의 배열 upsert). 테스트 3.
- page.tsx `saveAllPrices()`: 변경분 customerPrices state 갱신 + DB 배치 upsert(실패해도 주문 확정 안 막음). ReviewView: 단가 input Enter→다음 단가 칸 포커스(`focusNextPrice`, 저장 아님), '변경 단가 전체 저장 (N)' 버튼(N=대기 변경 수). 기존 '이 단가 저장'도 유지.

### 작업3 — 주문 목록 날짜 조회
- page.tsx: `orderListDate` 상태(기본 todayKst, ""=전체). 주문 목록만 `ordersForList = orderListDate ? orders.filter(o=>o.date===orderListDate) : orders`로 필터. 날짜 input·[오늘]·[전체 보기]·건수 표시·빈 상태("이 날짜의 주문이 없습니다"). **전역 orders는 안 건드림 → 합산표(W10)·월합계(W12) 무영향.**

### 자체 리뷰 (제품 원칙)
- 스냅샷 유지: saveAllPrices는 customer_prices만(과거 order_items 무관), confirmDate는 새 주문 date만(금액 무관). 예상 마진 비저장. raw_text 무관. ordermoa_ 접두사·마이그레이션 0.
- orders 결합 회귀 확인: 주문 목록 필터는 렌더 파생(ordersForList)만, aggregate/monthly는 전역 orders 그대로 — 데모로 검증(주문 1건이 합산표·월합계에 계속 보임).

### 검증
- root 5/5 · web 117/117(date-utils +3, price-store +3) · build 성공 · audit 0 · diff-check clean.
- 데모 smoke(콘솔 0): 주문일 KST 2026-07-08 기본→2026-07-07로 확정→목록 자동 07-07·1건. 단가 2개 변경→'전체 저장 (2)'·Enter 다음칸 이동→저장→재파싱 12345/6789 자동적용. 목록 [오늘]=빈상태·[전체 보기]=1건. 합산표 "주문 1건·6품목"·월합계 106,191 그대로.
- DB smoke 미실행(로그인) — saveOrder orderDate·upsertCustomerPricesInDb 배치는 기존 패턴, 회귀 위험 낮음.

### 개선 아이디어 (승인 없이 구현 안 함)
- 즉시(작음): 없음.
- 나중: 주문 목록 기간(범위) 조회·서버 날짜 조회(orders 커지면 orderListOrders 별도 상태로), 파싱 화면 '전체 단가 저장'에 신규 품목 단가도 포함.
- Phase 2(카테고리 6종·마이그레이션)·Phase 3(product_units 다단위/기본단가 예외) — 스키마 필요, 별도 Phase. product_units 마이그레이션 시 RLS·교차회사 검사·idempotent backfill 필수.
- 제외: 세금/회계/재고/OCR/카톡 자동읽기/이카운트.

- 미커밋 — Codex 검수·커밋(마이그레이션 없음).
- [다음] Phase 2(카테고리) 또는 엑셀 가져오기/전용 Supabase 분리. [위험 유지] 공유 쿼터.

## 2026-07-08 Codex Review (W18 검수·디버깅)

- Claude 산출물 검수 중 `saveAllPrices()`가 DB 저장 전에 화면 `customerPrices`를 먼저 갱신하는 점을 확인. DB upsert 실패 시 화면은 저장된 것처럼 보이지만 F5 후 사라지는 혼선이 생길 수 있어, DB 모드에서는 `upsertCustomerPricesInDb` 성공 후 상태를 갱신하도록 최소 수정. 저장 중 중복 클릭 방지를 위해 `priceSaving` 상태와 버튼 비활성/문구를 추가.
- `price-store` import 중복을 정리. W18 진행판/NEXT-SESSION의 web test 수치를 현재 117/117로 보정하고 진행판 HTML/XLSX 재생성.
- 검증 중 `next build`가 `Cannot find module for page: /_not-found`로 1회 실패. 코드 컴파일 이후 page data 단계 오류였고, dev 서버가 3027에서 살아 있는 상태로 `.next`를 공유한 산출물 충돌로 판단. dev 서버 중지 + `web/.next` 삭제 후 build 단독 재실행 → 성공.
- 제품 원칙 재확인: 단가 일괄 저장은 `ordermoa_customer_prices`만 갱신, 과거 `order_items.unit_price/amount` 불변. 주문일은 신규 주문의 `order_date`만 바꾸며 금액 스냅샷과 무관. 주문 목록 필터는 `ordersForList` 파생값만 사용해 합산표/W10·월합계/W12 전역 `orders` 흐름 유지.

## 사용자 실사용 피드백 백로그 (2026-07-08 정리)
> 사장님 실사용 피드백 모음. **아래 "추후" 항목은 기록만 — 해당 Phase 전까지 구현하지 않는다.** 상세·우선순위는 `docs/NEXT-SESSION.md`의 동명 섹션이 단일 소스.

### Phase 1에서 구현 완료 (W18)
- 주문일 표시/수정 (KST 기준, 어제 발주도 날짜 바꿔 확정)
- 파싱 확인 화면 단가 일괄 저장 (단가 칸 Enter→다음 칸, "변경 단가 전체 저장" 한 번) — 불편했던 곳은 단가 관리 화면이 아니라 파싱 확인 화면이었음
- 주문 목록 날짜 조회 (기본 오늘/전체 보기, 클라 필터라 합산표·월합계 무영향)

### 추후로 미룸 (구현 금지 — 기록만)
- 품목 카테고리 6종(농산물/공산품/냉식/육류/수산/기타) — Phase 2, 스키마 필요
- 품목 다단위 구조(한 품목 여러 단위, 환산은 일단 안 함) — Phase 3, product_units 스키마
- 기본 판매단가 + 거래처별 예외 단가 구조 — Phase 3, 스키마
- 단가 관리 화면 재설계 (위 구조 반영)
- 품목 검색/별칭 관리 UX 개선
- 주문 목록 서버 날짜/기간 조회 (지금은 클라 필터; 데이터 커지면 별도 상태로 서버 조회)
- 엑셀 가져오기/import (W15 나머지 절반)
- 스키마 필요 항목은 별도 마이그레이션 세션에서 RLS·교차회사 검사·idempotent backfill 필수.

## 2026-07-08 Claude (W13 실제 발주 테스트 1차 라운드 — 파서 현장 보강)

실제 수령 발주 원문은 미제공 → 기존 fixture(rp01~rp28) 기반으로 현장식 변형 문장(줄임말·붙여쓰기·단위생략·규격숫자·오타·조사·종결어미·한 줄 다품목)을 만들어 파서를 검증. 스키마·마이그레이션 0, 스냅샷 원칙 유지.

### 관찰(스크래치)로 드러난 문제 → 테스트로 고정 후 최소 수정
- **[치명] 한 줄 공백/붙여쓰기 다품목이 뒤 품목을 조용히 유실**: `"세척숙주 3박스 청경채 2박스"` → 세척숙주만 잡히고 **경고 없이 확정 가능**(청경채 유실). `"두부3판 콩나물2박스"`·`"락스2개비닐3장"`·`"계란 10판 배추 2망"`(품목·수량 교차 오염)도 동일. 카톡에서 흔한 패턴이라 현장 최우선.
- **종결어미/조사 미제거로 미매칭**: `"대파 2단이요"`(종결어미 `이요`)·`"숙주는 3박스"`(조사 `는`) → 원래 매칭돼야 할(또는 후보확인돼야 할) 문장이 미매칭.

### 수정(order-parser.ts, 순수 파싱-시점 함수만)
1. **`splitByCountClusters`**: 한 세그먼트에 **수량단위(측정단위 kg/g/L/ml 제외) 결합 클러스터가 2개 이상**이면 마지막 클러스터를 제외한 각 클러스터 끝에서 라인 분리. `splitSegments`에 `.flatMap` 한 단계 추가.
   - 규격+수량은 분리 안 함: `"청양고추 1kg 2봉"`(1kg=측정단위→수량단위는 2봉 하나)·`"소불고기 2키로 반"`·`"비닐 100L 3장"` 모두 1라인 유지(회귀 테스트로 고정). 기존 콤마/연결어 분리 뒤 각 조각에 count 클러스터가 2개인 케이스는 기존 테스트에 없음(안전 확인).
   - `pickQuantityCluster`의 인라인 `isMeasure` 중복을 공용 `isMeasureUnit`로 통합(리팩터, 동작 불변).
2. **종결어미/조사 사전**: `POLITE`에 `이요` 추가(`요`보다 먼저 제거해 `이` 잔여 방지). `TRAILING_PARTICLES`에 `는`·`은` 추가(`이/가/을/를`은 `오이` 등 어미 충돌 위험이라 제외). 샘플·fixture에 는/은으로 끝나는 품목·별칭 없음 확인.

### 테스트 (real-order-fixture.test.ts에 "W13 현장 발주 라운드" 섹션 11건 추가)
- W13-A: 공백/붙여쓰기 다품목 분리 5건(세척숙주+청경채, 두부+콩나물(뒤 미등록은 미매칭 노출), 취나물+단무지, 계란+배추, 락스+비닐) + 회귀 2건(청양고추 1kg 2봉 / 소불고기 2키로 반 미분리).
- W13-B: 종결어미 이요 / 조사 는 2건.
- W13 고정: 애매수량 안전차단 2건(`감자 반박스`·`팽이버섯다섯봉` → qty_uncertain, 개선 아님·현재 동작 고정).
- RED(7건 실패) 확인 후 GREEN. web **117→128** 통과.

### 브라우저 데모 smoke (localhost:3200, .env.local을 셸 env로 비켜 데모 모드 — 공유 .env.local·다른 챗 :3000 서버 무영향, 확인 후 원복)
- **Case 1** 가람식당 `"콩나물 3박스 두부 2판\n대파 2단이요"` → 파싱 화면 **3행**(콩나물 3박스 8000·두부 2판 2500·대파 2단 4000, 전부 정상). 주문일 W18 07-08→**07-07 수정**→확정→주문 목록이 07-07로 자동 조회(W18)·"콩나물, 두부 외 1건"(3품목 유실 없음)→명세서 3행+스냅샷 문구+원문보기(W09)→합산표 "주문 1건·3품목"·매입처 발주 문장 생성.
- **Case 2** 행복마트 `"위생장갑2박스키친타월3박스"`(공백 0) → **2행 분리**(위생장갑 2박스 4500·키친타월 3박스 8500)→확정→합산표 전체 날짜 **"주문 2건·5품목"**·매입처 분류 정확.
- 콘솔: 앱 에러 0(확장프로그램 `message channel closed` 노이즈만, `:0:0`·앱 스택 없음). W18 단가 칸/변경단가 전체저장 버튼·주문일 입력 렌더 정상.

### 자체 리뷰 (제품 원칙)
- 파싱-시점 세그먼트 분리만 바꿈 → `unit_price`(확정 스냅샷)·`amount`(generated)·예상마진(비저장)·raw_text 전부 무관. 과거 주문/명세서/월합계 재조회 없음. 스키마/마이그레이션 0. `matchAll`은 global 정규식 lastIndex 미변형(기존 pickQuantityCluster와 동일 패턴).

### 결과 분류
- **바로 고침**: 공백/붙여쓰기 다품목 분리, 종결어미 이요·조사 는/은.
- **테스트로 고정만(미룸)**: 없음(발견 문제는 이번에 해결).
- **별칭 등록으로 해결**: 브랜드 호칭·미등록 품목(콩나물 등)은 미매칭으로 노출 → 사용자가 품목 지정+별칭 등록(기존 흐름).
- **Phase 2/3로 이관(구현 안 함)**: `"소불고기 2키로 반"`의 `반`(0.5) 수량, `"청경채 2박수"`류 **단위 오타 교정**(퍼지 매칭), 규격이 이름에 든 fixture의 `[BOX]`/`[국산]` 표기가 포함매칭을 깨는 경우 — 오타 교정/다단위·표기 표준은 후순위.

### 검증
- root `npm test` 5/5 · web `npm test` **128/128** · web `npm run build` 성공 · `npm audit --audit-level=low` 0건 · `git diff --check` 통과(LF/CRLF 경고만).
- 변경 파일: `web/src/lib/order-parser.ts`, `web/src/lib/real-order-fixture.test.ts`, 진행판 3종(data.json+HTML/XLSX 재생성), 본 worklog, NEXT-SESSION.

### Codex 검수 포인트
- `splitByCountClusters` 분리 기준(수량단위 2개↑)이 실데이터에서 단일 품목을 잘못 쪼갤 여지 — 한 품목에 두 단위 동시표기(`두부 2모 3판`류)는 분리되어 앞부분만 매칭+뒤는 미매칭으로 노출(조용한 유실보단 안전). 필요시 규칙 조정.
- `TRAILING_PARTICLES` 는/은 추가가 사장님 실제 품목명과 충돌하는지(등록 품목이 는/은으로 끝나면) 검토.
- [다음] Phase 2(카테고리)·엑셀 가져오기·전용 Supabase 분리. [위험 유지] 공유 쿼터.

## 2026-07-09 Claude (Phase 2 W19 — 품목 카테고리 6종 + 0007 마이그레이션)

품목 카테고리 6종(농산물/공산품/냉식/육류/수산/기타) 도입. **컬럼 1개(별도 테이블 없음)** — 6종 고정·사용자 정의 없어 `ordermoa_products.category text NOT NULL DEFAULT '기타' CHECK(6종)`. 마이그레이션 **0007 작성만**(적용은 Codex 승인 후 사용자가 SQL Editor). Phase 3(다단위·기본/예외 단가)는 백로그 유지·미구현.

### 설계 결정 (컬럼 vs 테이블)
- **컬럼 채택**: db-schema-definition에 카테고리 테이블 명시 없음 + 6종 고정 → 별도 테이블/FK는 과설계. `products.tax_type text default CHECK(...)` 선례 그대로 재사용. 컬럼이면 RLS(0002 테이블 단위)·교차회사 트리거 **상속**이라 정책 추가 0, backfill은 DEFAULT로 끝. FK 없어 교차회사 트리거도 불필요.
- **스냅샷 불변**: 카테고리는 품목 마스터 속성 → `order_items`에 저장 안 함. 과거 주문/명세서/월합계/합산표/파서 **전부 무변경**(코드도 안 건드림).

### 마이그레이션 0007 (idempotent)
`add column if not exists category text` → `set default '기타'` → `update ... where category is null`(backfill) → `set not null` → CHECK 제약은 `do $$ ... pg_constraint 가드 ... $$`(PostgreSQL은 ADD CONSTRAINT IF NOT EXISTS 미지원). 제약명 `ordermoa_products_category_check`. 두 번 실행해도 안전.

### 0007 미적용 DB 방어 (코드+마이그레이션 세트, 0005 패턴)
- **읽기**(fetchCompanyData/listArchivedProducts): category 포함 select 실패 시 `isMissingCategoryColumn`(42703/PGRST204 + 메시지에 category) 감지 → category 없는 select로 재시도 → 앱 모델은 `기타` 폴백. **적용 전에도 DB 모드가 안 깨짐.**
- **쓰기**(createProduct/updateProduct): category 포함 insert/update 실패 시 category 키만 빼고 재시도(품목 자체는 저장, 카테고리는 기타). 시드(ensureSeed)도 동일.
- **즉석 등록**: DB insert에 category를 **아예 안 넣음** → 미적용 DB는 컬럼 없어 통과, 적용 후엔 DB DEFAULT '기타'가 채움(폴백 로직 불필요). 인메모리 product만 '기타'.
- 단, 가이드(`docs/guide-apply-0007-product-category.md`)에 "0007 적용 후 DB 실측 필수" 명시 — 방어가 적용 필요성을 숨기지 않게.

### 파일
- 신규: `web/src/lib/product-category.ts`(PRODUCT_CATEGORIES·DEFAULT·isProductCategory·normalizeProductCategory — 단일 소스), `+.test.ts`, `web/supabase/migrations/0007_product_category.sql`, `docs/guide-apply-0007-product-category.md`.
- 코드: domain/types(Product.category), product-store(normalize/insert/update + isMissingCategoryColumn + PRODUCT_COLS 두 벌 + 폴백), order-store(select/map/seed 폴백), product-registration(즉석 기본 기타), sample-data(33종 카테고리 배정), product-management-view(폼 카테고리 select + 목록 표시 + 카테고리 필터), page.tsx(saveProduct 데모 category·품목 CSV 카테고리 열·내보내기 설명).
- 문서: db-schema-definition(4.4 category 행), 본 worklog, NEXT-SESSION, progress-data(W19).

### 테스트 (TDD)
- product-category.test(3): 6종 고정·isProductCategory·normalize 폴백.
- product-store.test: normalize/insert/update에 category(기존 toEqual 갱신) + isMissingCategoryColumn(42703/PGRST204/메시지/CHECK위반 제외/무관오류).
- sample-data.test(+1): **모든 sampleProducts.category가 6종 중 하나**(개수 하드코딩 금지) + 농산물·공산품 존재.
- product-registration.test: 즉석 product category '기타'.
- RED→GREEN 확인. web **128→133**, root 5/5 불변.

### 브라우저 데모 smoke (localhost:3200, 셸 env 데모모드 — 공유 .env.local 무변경·원복)
- 품목·별칭 관리: 목록에 카테고리 접두(콩나물 농산물·두부 냉식) · 필터 '냉식'→5종(두부/계란/떡국떡/배추김치/총각김치) · 신규 '삼겹살/kg/육류' 추가→'육류' 필터에 표시·폼 리셋.
- 회귀: `콩나물 2박스 두부 3판\n미나리 5단`→3행(W13 공백분리 유지)→확정 41,000원→주문목록 오늘(W18)·"콩나물,두부 외 1건". 콘솔 앱오류 0(확장 노이즈만).

### 자체 리뷰 (제품 원칙)
- ERP 확장 아님(카테고리 6종만·2차 메뉴 추가 없음). 세금/회계마진/재고/OCR/카톡/이카운트 미구현. unit_price 스냅샷·과거 재조회 금지·마진 비저장·raw_text 삭제 원칙 전부 유지. ordermoa_ 접두사. 0007 외 마이그레이션 없음. Phase 3 미구현(백로그).

### 검증
- root 5/5 · web **133/133** · `npm run build` 성공 · `npm audit --audit-level=low` 0 · `git diff --check` clean. 민감정보 없음.

### Codex 검수 포인트
- **0007 적용 승인 요청** — 승인 시 사용자가 `docs/guide-apply-0007-product-category.md` 순서로 SQL Editor 적용 후 DB 실측 체크리스트 수행. 적용 전엔 코드가 폴백으로 안 깨지지만 카테고리 저장은 안 됨.
- `isMissingCategoryColumn` 오검출 방지 확인(CHECK 위반 23514는 false — normalize로 실제 발생 안 함).
- 샘플에 육류/기타 미사용(현장 데이터가 채움) — 의도된 것.
- [다음] Phase 3(product_units) 또는 엑셀 가져오기·전용 Supabase 분리. [위험 유지] 공유 쿼터.

## 2026-07-09 Claude (W20 — 실제 엑셀 기반 품목 기준정보 초안 추출/정제)

**사용자 결정(그대로 기록):** "상호명은 제외하되, 품목·단위·단가 기준정보는 실제 엑셀 패턴을 우선한다." 현재 샘플 33종은 가명/더미라 실 베타(식자재 납품, 품목 수 많음)엔 부족 → 친구 실운영 이카운트 엑셀의 품목·단위·단가 패턴을 기준으로 삼는다. **import(DB 반영)는 이번에 안 함 — 검수 가능한 초안까지만(W21로 분리).**

### 안전장치
- `.gitignore`에 원시데이터 유출 방지 규칙 추가: `*.xlsx/xls/csv/tsv`, `/private/`, `/_private/`, `/raw-data/` 차단 + 추적 산출물(progress-tracker·real-order-test-cases xlsx)만 예외. (검증: 원시파일 ignore·산출물 유지 확인.)
- 원본 엑셀은 **저장소 밖**(`D:\Documents\_private\order-moa-source\`, 미커밋)에서 **읽기만**. 화이트리스트 컬럼만 접근.

### 원본(식별정보 값 미기재)
- 처음 받은 `이카운터 품목정보.xlsx`는 시트가 `판매조회`(판매 요약, 단가 없음·품목 요약뿐)라 **W20 부적합 → 제외**(사용자 확인). = 이전 real-order-fixture "판매조회 191건"의 원본.
- 채택: `품목마스터.xlsx`(시트 품목등록, 1592행) + `단가마스터.xlsx`(시트 품목별단가, 1592행). **품목코드로 1:1 조인.**
- 사용 컬럼(화이트리스트): 품목코드·품목명·품목구분·규격(정보)·단위·출고단가·입고단가.
- **제외 컬럼(식별정보/무의미)**: r1 제목의 회사명(상호), 검색창내용, 품목그룹1명(전부 비어있음), 단가A~J(전부 0), 사용. 거래처/공급처/전화/주소/사업자번호 컬럼은 **원본에 없음**.

### 산출물 & 스크립트
- `scripts/extract-real-catalog.py`(커밋 대상, 데이터 미포함, 경로 인자, `--selftest` assert 6종) — 두 엑셀 조인→정제→`docs/order-moa-catalog-real-draft.json`(588KB, 1590품목).
- 정제 규칙: (1) **괄호 화이트리스트** — 괄호 안을 [,/]로 쪼개 규격/원산지/형태 토큰만 유지, 브랜드/공급사(별식품·합천수산·으뜸농산·페르디가오·프렌치카페 등)는 제거+needsReview. (2) 단위: 단위 컬럼 우선, 없으면 규격에서 파생, 그래도 없으면 needsReview. (3) 대표단가: 출고·입고단가 **100원 반올림**(exact/min/max 미저장), 0/없음은 needsReview. (4) 카테고리 6종 키워드 초안, 미매칭은 기타+needsReview.

### 추출 결과
- **1590품목**(고유명 1251) · 카테고리 분포: 농산물 363·수산 210·냉식 165·육류 126·공산품 103·**기타 623**(자동분류 60.8%).
- 기타 다수는 **조미료·장류·양념·가공식품**(천일염·고춧가루·간장·밀가루·마요네즈 등) — 6종에 안 맞아 기타가 정답. → **6종이 조미료/가공을 못 담는다는 관찰**(카테고리 확장 논의거리, 이번엔 미변경).
- needsReview 1089: 카테고리미분류(기타) 623·단위없음 576·괄호정보정리 409·출고단가없음 30.
- 단위 분포: kg 430·봉 139·BOX 115·g 107·EA 60… + 단위없음 576.
- **별칭 후보** 334(괄호 앞 짧은 핵심어, 예: `돈(찌개)`→`돈`).

### 식별정보 자체 스캔
- 1차엔 12건 감지(진짜 공급사/브랜드 5건 + 정육·반찬 오탐 7건) → 괄호 화이트리스트로 규칙 보강, IDENTITY_RE에서 오탐어 제외 → **재스캔 0건**. 산출물 name/spec에 상호·전화·사업자번호 패턴 없음.

### Phase 3 참고 관찰 (설계용 기록만, 미구현)
- **다단위/다규격이 실제로 흔함**: 같은 품목명이 규격·단위·단가만 다른 **중복명 그룹 210개(549품목)**. 예) 콩나물 = 1Kg 1000원 / 시루 13000원 / 4KG봉 6000원 / kg 1500원. → **product_units(다단위) + 규격·단위별 단가**가 Phase 3에서 필요함을 실데이터가 뒷받침.
- 출고단가/입고단가 이원화(판매/매입) 존재. 단가A~J(거래처 등급단가) 컬럼은 있으나 전부 0(미사용) — 거래처별 예외단가는 아직 데이터 없음.

### 검증
- root `npm test` 5/5 · web `npm test` **133/133**(앱 코드 무변경) · `npm run build` 성공 · `npm audit` 0 · `git diff --check` clean. `git status`에 원본 엑셀/CSV 미노출(gitignore) 확인.

### Codex 검수 포인트
- **산출물 커밋 가부**: `docs/order-moa-catalog-real-draft.json`(588KB, 식별정보 0건). 크기가 커 커밋 대신 로컬 유지도 선택지 — Codex 판단. import(DB 반영) 아님, W21 미리보기/검수 UI의 입력.
- 단가는 100원 반올림이나 원본이 이미 라운드값이라 실질 변화 적음 — 더 거친 반올림/단가 제외 원하면 지시.
- **W21 제안 범위**: 초안 JSON을 입력으로 (a) 미리보기·검수 UI(카테고리/단위/needsReview 편집) → (b) 승인분만 DB 반영(품목·단위·단가). 기존 sampleProducts는 데모/테스트 백업으로 유지(실데이터 우선). DB 반영은 Codex 승인 게이트. 6종→조미료/가공 포함 확장은 별도 논의.

## 2026-07-09 Claude (W21-A — 카탈로그 import 미리보기/검수 UI + 데모 반영)

W20 초안(`docs/order-moa-catalog-real-draft.json`, 1590품목)을 앱에서 업로드·검수하고 선택분만 기준정보로 반영하는 흐름 구현. **범위가 커 A/B 분리**. 이번(A)은 **UI+데모(메모리) 반영까지 완료·검증**, **DB 영구 반영(배치+폴백)은 W21-B**(0007·0008 적용 후 로그인 모드 검증). 0007 미적용 가정(사용자 지시).

### W21-A/B 분리 근거 (프롬프트의 "위험하면 분리 보고" 지시 적용)
- DB 대량 반영(배치 insert/update + category·source_code 이중컬럼 폴백 + 별칭 링크 + 결과요약)은 이번 세션 **검증 불가**: 0007 미적용 + 데모 smoke는 로그인 없음 + 공유 쿼터 위험. 미검증 복잡 DB 코드를 밀어붙이지 않고 분리.
- A = 데모로 end-to-end 검증되는 전부. B = 마이그레이션 적용돼야 검증 가능한 DB 영구 반영.

### 스크린샷(사용자 override)
- `docs/references/ecount-screenshots/`는 사용자가 민감정보 가림 확인 → **삭제 안 함·유지**. 품목코드는 민감정보 아님. `ecount-benchmark-notes.md`에 "구현 참고는 품목등록/품목별단가 화면 중심" 보강만.
- (검수 관찰 기록: 이미지1에 모바일번호·사업자번호형 거래처코드, 이미지3에 거래처명 1건 — 사용자가 참고용 유지로 판단.)

### 0008 마이그레이션 (작성만, 적용 대기)
- `web/supabase/migrations/0008_product_source_code.sql`: `ordermoa_products.source_code text null` + 부분 유니크 `(company_id, source_code) where source_code is not null`. idempotent, RLS 상속, order_items 무관. 재import 멱등 매칭용(품목명 중복 흔해 코드가 안정 키). PK는 계속 uuid. 가이드 `docs/guide-apply-0008-product-source-code.md`.

### 구현 (앱 코드)
- 신규 순수 로직 `web/src/lib/catalog-import.ts`(+test 8): `validateCatalogDraft`(형식·meta.categories 6종) · `buildImportRows`(중복명·기존일치·카테고리 정규화) · `summarizeImport` · `toCatalogInsert`(입고단가→basePurchasePrice, **출고단가 미저장**, source_code=code) · `toCatalogUpdatePatch`(이름 불변) · `chunk`.
- 신규 UI `web/src/app/catalog-import-view.tsx`: JSON 업로드(브라우저 파싱, 번들 미포함) → 요약(전체/선택/검토필요/신규/기존일치) · 필터(카테고리·상태·검토필요만·검색) · 50/페이지 · 행별 편집(이름/단위/카테고리/매입단가) · **중복명 동시선택 경고+반영 차단** · 신규 전체 선택 · "선택 N건 반영".
- product-store: `isMissingCategoryColumn`을 `isMissingColumnError(err,col)`로 일반화(source_code 커버, 동작 불변). domain/types: `Product.sourceCode`.
- page.tsx: 데이터 뷰에 CatalogImportView 렌더, 메뉴/제목 "데이터 내보내기/가져오기"로 확장(새 메뉴 추가 안 함). `applyCatalogImport` — 선택분을 products 상태에 반영(신규 push + 기존 category/매입단가/source_code update). **order_items·customer_prices·orders·aggregate·parser 무변경.**

### 매핑 규칙 (스냅샷 원칙)
- 입고단가 → `products.base_purchase_price`(참고값). **출고단가는 참고 표시만 — 어디에도 저장 안 함**(기본 판매단가는 Phase 3, customer_prices에도 안 넣음). category → products.category(0007 전제). code → source_code(0008). aliasCandidates → 데모는 product.aliases.

### 브라우저 데모 smoke (:3200, 앱오류 0)
- 대표 draft 8건 업로드(File 주입) → 기존일치(콩나물·두부) · 중복명(세척숙주×2) · 검토(미역줄기·도라지) 뱃지 정확. 요약 전체8·신규6·기존일치2·검토2.
- 중복명 동시선택 → 경고+반영 비활성. 해제 후 신규 전체선택(4: 삼겹살·미역줄기·락스·도라지) → 반영 → flash "신규 4·수정 0". 품목 관리에 4품목 등장. 발주 "삼겹살 2kg/미역줄기 3봉" → 파서 매칭(정상, 출고단가 미저장이라 0원). 콘솔 앱오류 0. 임시 서버·복사본 정리, .env.local 원복.

### 검증
- root 5/5 · web **141/141**(133+8) · build 성공 · audit 0 · diff-check clean.

### Codex 검수 포인트
- **0008 적용 승인 요청**(+0007 함께). 적용 후 W21-B에서 DB 반영 구현·실측.
- 출고단가 미저장 경계 준수(catalog-import.ts·applyCatalogImport에 sale price 저장 없음).
- 588KB 초안은 번들 미포함(런타임 파일 업로드) — 커밋 여부는 Codex.
- [W21-B] DB 배치 반영(insert/update 200단위 + category/source_code 폴백 루프 + 별칭 링크 + 성공/실패 요약), product-store 단일 create/update의 source_code 읽기, DB smoke. [다음] 전용 Supabase 분리 vs Phase 3.

## 2026-07-09 Claude/Codex (W21-B — 카탈로그 import DB 영구 반영)

사용자가 Supabase SQL Editor에서 0007(category)와 0008(source_code)을 적용 완료(`Success. No rows returned`)한 뒤, W21 import의 DB 영구 반영 경로를 추가했다. Claude 구현 후 Codex가 문서 정합성을 보정했다.

### 구현
- `web/src/lib/catalog-import.ts`: `CatalogApplyResult` 타입을 순수 로직으로 이동하고, `planCatalogDbWrite`(source_code가 이미 있으면 insert가 아니라 update로 재분류)와 `dedupeAliasRows`(별칭 in-batch 중복 제거)를 추가.
- `web/src/lib/product-store.ts`: `applyCatalogImportToDb` 추가. 선택분만 200건 단위로 insert/update하고, `ordermoa_products.source_code`로 재import 멱등 매칭, `ordermoa_product_aliases`는 `onConflict: company_id,alias`로 충돌 무시 upsert.
- `web/src/app/page.tsx`: DB 모드에서는 DB 반영 후 `loadCompanyData`로 products 재조회 → 품목·별칭 관리와 파싱에 즉시 반영. 데모 모드는 기존처럼 메모리 반영.
- `catalog-import-view.tsx`: 로그인 상태에서는 버튼/안내가 DB 반영임을 명시. 공유 DB 쿼터 부담 때문에 소량 반영 안내.

### 원칙 확인
- 출고단가(`repSalePrice`)는 화면 참고만 — `customer_prices`나 products에 저장하지 않음. 입고단가(`repPurchasePrice`)만 `base_purchase_price`로 저장.
- `order_items`·합산표·명세서·월합계·파서 로직 무변경. 과거 주문 스냅샷 원칙 영향 없음.
- 0008은 컬럼+부분 유니크 인덱스만 추가(additive/idempotent), RLS는 기존 `ordermoa_products` 정책 상속.

### 남은 실측
- 코드/테스트/빌드는 통과 대상. 다만 공유 Supabase 대량 insert는 쿼터 부담이 있어, 로그인 모드에서 **10~20건 소량 DB smoke** 후 전체 반영 여부를 결정한다.
- 확인 포인트: 신규 N건 저장/F5 유지, 같은 JSON 재반영 시 신규 중복 없이 update 처리, 별칭 반영, `customer_prices` 무변화.

## 2026-07-09 Claude (W21-C — 카탈로그 DB 소량 smoke 준비 + 반영 전략 점검)

상태:

- **보류(사용자 실행 대기)** — 실 DB smoke는 로그인(인증)이 필요하나 Claude는 헤드리스라 Supabase 로그인이 불가. RLS가 anon 키만으로는 insert를 막으므로 스크립트 우회도 부적절(비인증 = 실제 경로 검증도 아님). `.env.local`·타 세션 :3000 서버 불가침. → **자동 검증·코드 정적 검증·smoke 준비/절차·전략 판단까지 Claude가 수행하고, 실제 10~20건 반영은 사용자가 로그인 세션에서 실행**한다.

작업 목표:

- W21 import가 로그인 DB 모드에서 안전 동작하는지 소량 검증 준비 + 전체 반영 전략(공유 vs 전용 Supabase) 판단.

수행(Claude):

- `git pull --ff-only`(Already up to date) · 워킹트리 clean · W21-A/B는 커밋 `66d1af2 feat: add catalog import workflow`로 반영됨(`applyCatalogImportToDb`/`planCatalogDbWrite`/`dedupeAliasRows` HEAD에 존재 확인).
- **자동 검증 전부 통과**: root `npm test` 5/5 · web `npm test` **145/145** · web `npm run build` 성공 · `npm audit --audit-level=low` **0건** · `git diff --check` clean · `git status` clean(origin 동기).
- **코드 정적 검증(중요 확인 항목 = 코드 레벨 보장)**: import 쓰기 경로(`product-store.ts`/`catalog-import.ts`)에 `customer_prices`·`sale_price`·`repSalePrice` 쓰기 **0건**(등장은 화면표시용 타입/주석뿐). `basePurchasePrice`는 `purchasePrice ?? repPurchasePrice`(입고단가)만 매핑. import는 `ordermoa_products`+`ordermoa_product_aliases`만 건드림 → `order_items.unit_price` 스냅샷 무관. 멱등(`planCatalogDbWrite`)·별칭충돌무시(`dedupeAliasRows`+`upsert ignoreDuplicates`)는 유닛테스트로 보장.
- **smoke 입력 준비**: `docs/order-moa-catalog-real-draft.json`(1590) 분석 → 시드 44개 이름과 충돌 없고 초안 내 동명 없는 **깨끗한 신규 15건** 선정(비검토 13 + needsReview 2). 코드: `10006,10013,10014,10017,10020,10021,10024,10026,10028,10036,10037,10038,10057,10063,10068`. needsReview 2건=`홍땡초(10063)`,`깨순(10068)`(카테고리/단위 편집 테스트용). 소량 파일은 스크래치패드에 생성(`order-moa-catalog-smoke-15.json`, 미커밋·저장소 밖).

사용자 실행 절차(로그인 세션):

1. `cd web; npm run dev`(포트 3000 타 세션 사용 중이면 `npx next dev -p 3200`; `.env.local` 유지=DB 모드). 비밀번호 로그인.
2. 데이터 내보내기/가져오기 → 카탈로그 가져오기 → `order-moa-catalog-real-draft.json`(또는 준비된 15건 파일) 업로드.
3. 위 15코드만 선택(소량 파일이면 "필터 결과 신규 전체 선택"). needsReview 2건은 카테고리/단위 편집해보고 선택.
4. "선택 N건 DB에 반영" → 요약(신규/수정/별칭/실패 배치) 기록.
5. 품목·별칭 관리에서 15건 표시 확인 → **F5 후 유지** 확인.
6. **같은 파일 재업로드→같은 코드 재반영 → 신규 0·수정 15(멱등)** 확인.
7. 발주 붙여넣기에서 반영 품목명 매칭 확인. 파싱→확정→합산표→명세서 회귀 확인. 콘솔 앱에러 0 확인.
8. Supabase에서 `base_purchase_price`=입고단가 저장·`source_code`/`category` 저장·`customer_prices` **새 row 없음** 확인.

전략 판단(공유 vs 전용):

- **권장: 15건 smoke로 경로만 검증 → 전체 1590건은 전용 Supabase 분리 후 반영.** 근거: 공유 `yangsan-inventory`에 "Grace period is over"(무료 쿼터) 경고 활성. 1590 insert 자체는 소량(~8배치)이나, 쿼터 소진 시 오더모아+양산재고 양쪽 로그인/저장이 막힐 리스크가 이득보다 큼. CSV 백업 존재로 전용 이전 리스크 낮음(NEXT-SESSION 참고). 로드맵 항목 3과 일치.

진행판:

- `order-moa-progress-data.json` **미변경**(실측 미실행 = 기록할 실측 결과 없음). smoke 실행·결과 확정 후 갱신 판단. → 진행판 재생성 불필요.

남은 이슈:

- 실제 DB smoke 수치(반영 건수/F5/멱등/customer_prices 무변화/회귀/콘솔)는 사용자 실행 후 이 로그에 보완 기록 필요.
- Codex 검수: (a) 정적 검증 결론 동의 여부, (b) 전용 Supabase 분리 시점 승인, (c) 사용자 smoke 결과 수치 반영 후 진행판 갱신.

### Codex/사용자 후속 확인(2026-07-09)
- 사용자가 로그인 세션에서 소량 카탈로그 반영 후 **품목·별칭 관리에 표시**, **F5 유지**, **같은 품목 재반영 시 중복 생성 없음**, **발주 붙여넣기 파싱 매칭**을 확인했다.
- Supabase Usage를 All projects로 확인: Database 0.028/0.5GB(6%), Egress 0.001/5GB(<1%), Storage 0/1GB, MAU 4/50,000. 따라서 유료/전용 Supabase 분리는 **당장 급하지 않음**. 전체 반영의 주 리스크는 쿼터가 아니라 **중복명·검토필요 품목의 데이터 품질**.

## 2026-07-09 Claude (W22 — 품목 기본 출고단가 base_sale_price + 카탈로그 출고단가 반영)

상태:

- **완료(코드·검증)** / 0009 마이그레이션 = 작성 완료·**적용 대기**(Codex 승인 후 사용자 SQL Editor). Claude 커밋/푸시 안 함 — 보고만.

작업 목표:

- 베타 검증(금액/명세서/합산표)을 위해 거래처별 단가가 없을 때 쓸 **품목 기본 출고단가** 최소 구조 도입. 카탈로그 import가 출고단가를 이 값으로 저장.

설계 결정:

- **base_sale_price는 products에** 둔다(customer_prices 아님). 엑셀 출고단가는 품목 표준가지 거래처 계약가가 아니고, 전 거래처에 customer_prices를 자동 생성하면 조합 폭증 + "예외 단가" 신호 소실. 우선순위는 **코드에서 판정**: 거래처별 > 품목 기본가 > 미등록.
- 단가 우선순위 단일 소스 `resolveSalePrice(prices, customerId, product)`(`domain/index.ts`) → 파서(`parseOrderText`)와 화면 배정(`assignProduct`)이 같은 규칙 공유. `ParsedLine.priceSource`("customer"|"base"|undefined) 추가, `priceRegistered`는 "customer"만(하위호환).
- `order_items.unit_price`는 확정 시점 스냅샷 유지 — base_sale_price는 마스터 속성이라 과거 주문/명세서/월합계 무영향. 과거 주문 재계산 없음.

수정 파일:

- **마이그레이션**: `web/supabase/migrations/0009_product_base_sale_price.sql`(base_sale_price integer null + CHECK(null or >=0), add column if not exists + drop/add constraint = idempotent, RLS 무변경). 가이드 `docs/guide-apply-0009-product-base-sale-price.md`.
- **타입/도메인**: `domain/types.ts`(Product.baseSalePrice), `domain/index.ts`(resolveSalePrice).
- **파서**: `order-parser.ts`(resolveSalePrice로 fallback + priceSource).
- **스토어**: `product-store.ts`(ProductFormInput/normalize/validate/toProductInsert·Update에 baseSalePrice, ProductRow·mapProduct, **3단 컬럼 폴백** PRODUCT_COLS/CAT/BASE + `selectProductsWithFallback`, create/update body strip 폴백, `applyCatalogImportToDb` insert·update에 base_sale_price=재import 시 기존 품목도 갱신). `order-store.ts`(selectActiveProducts→공유 폴백, product 매핑에 baseSalePrice).
- **import 로직**: `catalog-import.ts`(CatalogInsert/Update.baseSalePrice, planCatalogDbWrite 재분류 시 carry, toCatalogInsert/UpdatePatch에 base_sale_price=repSalePrice).
- **화면**: `catalog-import-view.tsx`("출고단가(참고)"→"기본 출고단가", repSalePrice→baseSalePrice 매핑, 안내문 갱신). `product-management-view.tsx`(기준 매입단가 옆 **기본 출고단가 입력칸**). `page.tsx`(resolveSalePrice로 assignProduct·setPrice·savePrice·saveAllPrices priceSource, **"기본 단가 적용"** 뱃지, "이 단가 저장" title로 거래처 전용 단가임을 명시, 데모 import·saveProduct에 baseSalePrice).
- **테스트**: domain(resolveSalePrice 3케이스), order-parser(base fallback+priceSource), catalog-import(repSalePrice→base_sale_price, sale_price로 안 감), product-store(normalize/insert/update 매핑). 진행판 3종(W22 카드 추가).

원칙 확인(코드 정적):

- import 경로에 `customer_prices`/`sale_price` **쓰기 0건**(출고단가는 products.base_sale_price로만). 재import(source_code 멱등) 시 기존 품목 base_sale_price update됨.
- customer_prices 자동 대량 생성 안 함. product_units/다단위 미구현. order_items·합산표·명세서 과거 금액 재계산 없음.

검증:

- root `npm test` 5/5 · web `npm test` **149/149**(신규 4) · `npm run build` 성공(타입체크 포함) · `npm audit --audit-level=low` 0건 · `git diff --check` clean(CRLF 경고만).

남은 이슈:

- 0009 Supabase 적용(사용자, Codex 승인 후) → **기존 W21 import분은 출고단가 비어 있으므로 같은 카탈로그 재import 필요**(guide-apply-0009). 로그인 모드 소량 smoke는 W21-C 절차와 함께.
- Codex 검수: (a) base_sale_price를 products에 둔 설계 동의, (b) 0009 CHECK/폴백 승인, (c) 3단 컬럼 폴백(현재 0009 미적용 창구간) 수용 여부.

### 2026-07-09 후속 — Codex 검수 리뷰 + 디버깅검사(Claude, 미커밋)
- **Codex 검수 리뷰**: 커밋 `222920a`에 Codex가 `docs/db-schema-definition.md`를 보정(products에 `base_sale_price`·`source_code`·`category` 행/DDL 추가, Phase 2(0007~0009) 문구, 단가 우선순위 명시)한 것 확인 — 스키마 문서와 실제 마이그레이션 정합, 정확. NEXT-SESSION/worklog 문구 정리도 사실과 일치.
- **디버깅검사에서 버그 1건 발견·수정(미커밋)**: 파싱 화면 **"변경 단가 전체 저장"**이 품목 기본 출고단가(priceSource "base")로만 뜬(사용자 미수정) 라인까지 `customer_prices`에 저장하던 문제. W22 전엔 그 라인이 0원이라 `unitPrice>0` 필터에서 빠졌는데, base_sale_price fallback으로 값이 채워지자 "변경 단가"가 아님에도 일괄 저장에 휩쓸림 → base_sale_price 취지(customer_prices 남발 방지)·버튼 라벨과 충돌.
  - 수정: `price-store.ts` `collectPriceChanges`에서 `priceSource === "base"` 라인 제외(+`PriceChangeLine.priceSource` 필드). 사용자가 그 값을 **직접 고치면** priceSource가 지워져 저장 대상이 되고, **개별 '이 단가 저장'**(savePrice)은 별도 경로라 그대로 동작. 테스트 1건 추가.
- 검증(수정 후): root `npm test` 5/5 · web `npm test` **150/150** · `npm run build` 성공 · `npm audit --audit-level=low` 0 · `git diff --check` clean. 진행판 3종 재생성(W22 verify에 디버깅검사 메모).
- 변경 파일(미커밋): `web/src/lib/price-store.ts`, `web/src/lib/price-store.test.ts`, `docs/agent-worklog.md`, 진행판 3종(json/html/xlsx). **Claude 커밋/푸시 안 함 — Codex 검수 후 반영.**

## 2026-07-11 Codex (W23 전체 시스템 재설계 준비 — 문서/프롬프트만)

- 실사용 인터뷰에서 확인된 두 설계 공백을 정리했다: (1) 단위가 생략된 카톡 발주는 거래처별 관습과 사람 판단이 필요함, (2) 판매단가는 매입처 거래명세서를 받은 뒤 품목별로 그때그때 정할 수 있음.
- 한 사용자 방식에 과적합하지 않도록 기존 `가격 포함 바로 최종 확정`을 유지하면서 `수량 확인→합산·매입처 발주→가격 입력→최종 확정` 경로를 선택형으로 추가하는 방향을 사용자와 합의했다.
- 플랫폼은 기존 Next.js 반응형 웹을 유지한다. 네이티브 앱/PWA/플레이스토어는 현재 범위에서 제외한다.
- UI 방향은 기존 사이드바·화면을 유지하고 대시보드만 `오늘 업무/새 발주/매입처 발주/가격 대기/명세서 준비` 업무 큐로 바꾸는 안을 사용자 선택으로 확정했다. 기존 화면은 인라인 수정·검색·일괄변경·모바일 넘침 개선 등 사용성 보강만 설계한다.
- 기준 설계 문서: `docs/superpowers/specs/2026-07-11-order-moa-dual-confirmation-workflow-design.md`.
- Claude 기획·설계 전수 개편 프롬프트: `docs/task-prompt-W23-system-redesign-planning.md`.
- 이번 준비 단계에서는 앱 코드·테스트·SQL·마이그레이션을 수정하지 않았다. W23 Claude 세션도 문서 전수 감사와 설계까지만 수행하고 커밋/푸시하지 않도록 제한했다.

## 2026-07-11 Claude (W23 — 전체 시스템 재기획·설계 및 문서 전수 개편)

상태:

- **문서 완료 · 코드 미착수**. 앱 코드·테스트·SQL·마이그레이션 무변경, 커밋/푸시 안 함(보고 후 중단).

작업 목표:

- 기준서(사용자 승인)를 근거로 기존 문서 전체를 "과거 가정 / 현재 구현 / 새 목표"가 구분되게 전수 개편.

수행 순서와 산출물:

1. **감사(0단계)**: `docs/order-moa-document-audit-2026-07-11.md` — 문서 17종 × 코드(page.tsx·파서·스토어·aggregate·delivery-note·domain·마이그레이션 0001~0009) 대조. 구현 현실 스냅샷(0001~0009 전부 적용, 12뷰, 카탈로그 735건 반영) 명시. 프롬프트 지목 충돌 7류 전부 사실 확인 → 처리 방침 포함.
2. **새 기준 설계**: `docs/order-moa-system-redesign-2026-07-11.md` — 15개 절: 증거 강도 / 일반화 vs 개인 습관 / 새 한 문장 정의(4단계) / 두 경로 흐름 / 상태 전이표(입력 중→수량 확인(가격 대기)→최종 확정→취소, 매입처 발주는 화면 파생값으로 최소화) / 가격 마감 UX(매입가 1회 입력→N거래처 제안, 자동 확정 금지, 매입가 저장 3안 비교→base_purchase_price 갱신 권장 — ※ Codex 검수 보정으로 '명시 선택 시에만 갱신'으로 확정됨) / 해석 기억(후속) / 입력 채널·OCR 경계(파일 우선) / 모바일·PC 역할 / 승인 대시보드 / **데이터 모델 대안 비교(orders 상태 확장 vs 별도 초안 객체, 9개 기준 — 권장: 상태 확장, 단 unit_price nullable×generated amount 상호작용은 R1 검증 필수)** / 보안·원본 이미지 정책 / 단계 R0~R8 / 단계별 성공·중단 기준 / 승인 게이트 8건.
3. **기존 문서 전수 정렬(표적 수정, 전면 재작성 없음)**:
   - 헌장: W23 배너, 두 경로·파서=초벌 원칙, **스냅샷 재정의("판매단가가 최종 확정되는 시점" — 기존 주문 의미 불변)**, 화면 상태표 현행화, §6.4 해소 처리, OCR 재분류(§9/§12), §13 추천 순서를 R1~R8로 교체.
   - 제품 정의: §2-1 새 한 문장 정의(현재 기준), §7-1 범위 보정(OCR은 MVP 아님), 역사 안내 배너.
   - 요구사항: §7.5 신규 F14~F19(기존 ID 불변), §6-1 성공 기준 보정("단가 자동 적용"→제안값 관점, "단가표 없이 수량 업무" 추가).
   - 기능정의: W23 배너, §6.2 단가 3순위 현행화(W22), F10 처리 규칙 현행화, §5.3 F14~F19 기능 계약, §7 products 표에 0004/0007/0008/0009 컬럼 반영.
   - 화면설계: §2-1 실구현 현행표(S번호 대사 — S4 흡수·S13 미구현·monthly/카탈로그 import 추가분 명시), §12-1 모바일 결함 3종 기록+수정 UX 규칙, §16 신규 화면(오늘 업무 대시보드·가격 대기 큐·가격 마감), §17 벤치마크 원칙(기능 복제 금지, 외부 열람 없이 원칙만).
   - DB 정의: 적용 현황 배너(0001~0009·무접두사 초안 주의), order_imports에 0006 order_id(FK imports→orders — 원문 삭제가 주문에 영향 없음 원칙 유지 확인), §4.13 suppliers(적용됨), §3 표 현행화. W23 상태 모델은 재설계 문서로 위임(중복 금지).
   - 모듈맵: M01/M03/M04/M05/M06/M09/M11/M16 상태 현행화, 신규 M17~M20(설계) + 대시보드=집계 전용, DB 매핑표 현행화, 흐름도에 두 경로.
   - 로드맵: 단계 개요·1차 잔여표 완료 처리, **W23 단계표(R0~R8: 가치·정량 성공·중단 신호)**, 제외/보류 표(OCR 보류 실험 재분류, PWA/스토어 범위 밖).
   - 검수 체크리스트: §9 OCR 각주, **§12 W23 두 경로 검수 12항목(설계)**.
   - 검증 전략: **§12 W23 검증 질문 4건+정량 지표 4종(입력 단계·중복 입력·수정 횟수·경과 시간)+중단 기준**.
   - 피드백 설계(2026-07-07): 역사 배너(매입 명세서가 가격 마감의 입력으로 승격됨 명시).
   - NEXT-SESSION: W22 실측 완료 반영(0009 적용+735건), W23 기록, 다음 할 일을 R1~ 중심으로 재편(완료된 W18/W22 항목 제거).
4. **진행판**: W23 workItem 1건 표적 추가(문서 완료·코드 미착수) → `py -3 scripts/generate-progress.py` 재생성. 후속 구현은 카드를 미리 만들지 않고 NEXT-SESSION 후보로 유지.

용어 통일(QA 근거):

- 정의 단일 소스 = 재설계 문서 §2. 수량 확인 / 가격 대기 / 가격 마감 / 최종 확정 / 정정 / 매입처 발주 / 거래명세서(최종 확정만) / 기본 출고단가=제안값 / 예상 마진=표시 전용 / OCR=보류 어댑터 실험.

검증(코드 무변경 기준선 확인):

- root `npm test` 5/5 · web `npm test` 150/150 · `npm run build` 성공 · `npm audit --audit-level=low` 0 · `git diff --check` clean — 결과는 최종 보고 참조.

남은 이슈 / Codex 검수 포인트:

- (a) 스냅샷 원칙 재정의 문구(헌장 §3.2) 승인 여부 — 기존 주문 의미 불변 확인.
- (b) 재설계 §11 권장안(orders 상태 확장) 방향 동의 여부 — 단, R1에서 unit_price nullable×generated amount 실측 검증 전 확정 금지.
- (c) OCR 재분류(제외→보류 실험) 문구가 헌장·로드맵·체크리스트 3곳에서 일관한지.
- (d) 기존 발견 앱 버그(코드 미수정, 위치만 기록): 모바일 결함 3종(상단 메뉴 넘침·대시보드 제목 줄바꿈·계정/로그아웃 충돌 — `globals.css`/`page.tsx` Shell 헤더 영역, W23 R5 대상). `docs/screen-specification.md` §12-1에 기록.
- (e) 진행판 W23 카드 문구·상태(문서 완료) 확인.

## 2026-07-11 Codex (W23 문서 전수 개편 최종 검수·정합성 보정)

- Claude 보고와 실제 18개 문서 diff를 코드·0001~0009 마이그레이션·사용자 승인 기준서에 다시 대조했다. 앱 코드·SQL 변경은 없었다.
- 수정 1: 헌장/DB 문서의 `order_imports`와 `orders`가 FK로 연결되지 않는다는 오래된 설명을 실제 0006(`order_imports.order_id → orders.id`)에 맞게 고쳤다. raw_text 삭제는 행 삭제가 아니라 null 처리라 주문이 유지되는 원칙은 동일하다.
- 수정 2: 가격 마감의 오늘 매입가가 `products.base_purchase_price`에 자동 덮어써지는 설계를 제거했다. 기본은 이번 마감에만 사용하며, `품목 기본 매입가에도 저장`을 사용자가 별도 선택한 경우에만 갱신한다.
- 수정 3: 기능/DB 문서의 `order_items는 확정 라인만 저장` 문구를 **현재 0001~0009 구현**으로 명확히 표시하고, W23 가격 대기 저장 모델은 R1 승인 게이트에서 별도 결정하도록 경계를 표시했다. 기능정의서의 order_imports에 0006 order_id도 반영했다.
- 수정 4: 진행판의 currentFocus·최근 커밋·W19~W23 상태·0009 적용·W21 실측 완료 정보를 현행화했다. W23 문서 개편은 완료, 다음 초점은 W23-R1이다.
- 수정 5: 헌장의 과거 TOP 10 목록을 역사 스냅샷으로 표시하고 OCR 분류를 전 문서에서 `검증 전 보류 실험`으로 맞췄다.

### 2026-07-11 후속 — Claude (Codex 검수 중단분 이어받아 마무리)

- Codex 검수(수정 1~5)가 토큰 소진으로 중단된 지점을 이어받았다. 남은 작업 3건 + 예고된 기계적 재검사를 완료.
- **잔여 수정 1건**: `db-schema-definition.md` §5 관계 요약 다이어그램의 `order_imports —(FK 없음)→ orders`가 수정 1에서 누락돼 있었음 → 0006 실제 FK(imports→orders, on delete cascade)로 정정 + raw_text=null 원칙 주석.
- **worklog 정정 마커**: 본 로그의 W23 항목 요약(매입가 `갱신 권장`)에 "Codex 검수 보정으로 명시 선택 시에만 갱신으로 확정" 표기 추가(로그 원문 보존, 오독 방지).
- **진행판 재생성**: Codex가 JSON을 현행화(수정 4)한 뒤 재생성을 못 한 상태 → `py -3 scripts/generate-progress.py` 실행, HTML에 W23 카드·새 currentFocus(W23-R1 준비) 반영 확인. (meta.feedbackBacklog는 생성기 렌더 범위 밖 — 설계상 정상)
- **기계적 재검사 3종(Codex 예고분) 전부 통과**: ① 잘못된 FK 문장 잔존 0(무관한 RLS 실측 기록 1건만) ② 매입가 자동 덮어쓰기 문구 0 ③ 완료 작업의 진행 중/적용 대기 표기 0.
- 검증: root 5/5 · web 150/150 · build 성공 · audit 0 · `git diff --check` clean. 앱 코드·SQL 무변경 유지. **커밋/푸시 안 함 — 보고 후 중단.**
- **(사용자 지시 추가분)** 이번 회차는 사용자 지시로 **Claude가 직접 커밋**한다(코덱스에게는 보고로 갈음, 푸시는 보류). 다음 세션용 **W23-R1 작업 프롬프트** `docs/task-prompt-W23-R1-state-model-design.md` 작성 — 핵심 검증 쟁점(status CHECK에 draft 이미 존재, unit_price NOT NULL×generated amount 충돌, loadOrders의 confirmed 필터)을 옵션 1a/1b/1b-i/1b-ii/2로 구조화, NEXT-SESSION 0번에 링크.
- 수정 6: 현재 CHECK에 이미 존재하는 `draft`를 R1 비교 대상에 추가했다. 권장 방향은 orders 단일 소스 유지까지만 확정하고, `draft 재사용 vs 신규 상태`와 `unit_price nullable vs 별도 가격 상태/시각`은 구현 전 비교하도록 보정했다.
