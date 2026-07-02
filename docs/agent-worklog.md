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
