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

## 2026-06-29 20:36 Claude (오늘 마무리 — HTML 데모 1차 완료)

상태:

- 완료 (커밋/푸시 진행)

오늘 한 일:

- **단위 4**: HTML 프로토타입 생성 (`prototype/order-moa-demo.html`, `prototype/README.md`)
- **단위 4-1**: `D:\Downloads\DESIGN-claude.md` 기반 리디자인 (warm cream 캔버스 / coral 포인트 / ink 텍스트 / serif 헤드라인 / 상태 배지)
- **모바일 안정성 보강**: 가로 넘침 격리(`overflow-x:hidden` + 표 `min-width`+스크롤), 입력 16px(iOS 줌 방지)/터치 44px, 전역 JS 오류 비노출(`window.onerror`)
- 사용자가 **모바일에서 확인 후 "꽤 괜찮게 나온다" 피드백**

현재 산출물 성격:

- **정적 HTML 데모.** DB/Supabase/API 연결 없음, 브라우저 메모리에서만 동작.
- 실제 앱 구현은 다음 단계.

확인된 사용 흐름:

- 모바일: 카톡 복사 → 오더모아 붙여넣기 → 파싱 확인/수정 → 확정 → 합산표
- PC: 합산표 확인 → 거래명세서 미리보기 → 인쇄

변경/추가 파일:

- (신규) `prototype/order-moa-demo.html`
- (신규) `prototype/README.md`
- (수정) `docs/agent-worklog.md` (본 기록)

검증:

- 기능 마커 확인: 샘플 시작 / 파싱 / 정상·주의·미매칭·단가없음 배지 / 미매칭·수량불확실 시 확정 차단 / 합산표 / 거래명세서 미리보기 / 인쇄 / 모바일 CSS / 전역 오류 가드
- git status: `prototype/` 외 변경 없음(의도치 않은 변경 없음)

---

### Claude 공유용 인수인계 요약

- 오더모아는 완성형 ERP가 아니라, **도소매/식당납품 사장님을 위한 발주 취합 MVP**에서 출발.
- 현재 HTML은 **영업/검증용 데모(정적)**.
- 아직 빠진 실제 구현 기능:
  - 로그인 / 회사·사용자 관리 / 실제 DB 저장 / Supabase 연결
  - 거래처·품목·단가 CRUD / 품목·수량·단가 수정 UX 고도화
  - 미수금 / 세금계산서 / PDF 생성 / 실제 운영용 인쇄 양식
- 다음 추천 작업:
  1. HTML 프로토타입 리뷰
  2. 실제 Next.js 구현 TASK 작성
  3. 샘플 데이터 기반 앱 화면부터 구현
  4. 이후 Supabase 연결

## 2026-06-30 Claude (단위 5 — 이카운트 벤치마크 반영, 구현 TASK 전 문서 보정)

상태:

- 완료 (문서만 수정, 코드/SQL/Supabase 적용 없음)

작업 목표:

- `docs/ecount-benchmark-2026-06-30.md`(Codex 작성) 핵심 판단을 제품 문서에 반영
- 오더모아를 "이카운트 전체 대체"가 아니라 **"카톡/문자 발주 정제 → 거래처별 단가 → 예상 마진 → 합산표/거래명세서"의 좁은 MVP**로 정리
- 실제 Next.js 구현 TASK로 넘어가기 전 문서 정합성 보정

반영한 핵심 판단:

- 거래처별 **판매단가 + 기준 매입단가 + 예상 마진(참고값)** 관점 추가
- 파싱 결과 화면 **단가 직접 수정 + 단가 미등록 시 그 자리 입력·저장(customer_prices)** 흐름
- 거래명세서를 **업무 문서 수준으로 더 촘촘하게** (공급자/거래처 블록 + 라인 표)
- 주문 목록을 **이카운트 판매조회형**(날짜/거래처/품목요약/금액/명세서)으로
- **예상 마진 = 참고값(1차 표시 후보), 정확한 회계 마진 = 2차** 경계 명시

수정 파일:

- `docs/function-specification.md` (F4 기준 매입단가, F6 마진 표시, F9 단가 수정/저장, F13 명세서 양식, §2/§5.1/§7/§12 정합)
- `docs/screen-specification.md` (S7 단가/마진, S9 단가 수정·저장 UX, S10 판매조회형 목록, S12 촘촘한 명세서, §7/§8/§9 정합)
- `docs/sample-data-definition.md` (§4 기준 매입단가 필드, §6.1 매입단가/예상 마진 샘플, §9 체크 항목)
- `docs/db-schema-definition.md` (products.base_purchase_price nullable, 질문4 확정, SQL 초안, 2차 원가 테이블 분리)
- `docs/mvp-acceptance-checklist.md` (단가 수정/즉석 입력/예상 마진/명세서 가독성/모바일 단가·수량 수정 항목)
- `docs/mvp-validation-strategy.md` (§3 단가 관리·예상 마진·전체 흐름 검증 질문)
- `docs/agent-worklog.md` (본 기록)

1차 MVP로 새로 격상된 항목:

- 품목 **기준 매입단가**(`products.base_purchase_price`, nullable, 선택) — 표시 후보
- **예상 마진 표시**(매입단가 있을 때, 참고값)
- 파싱 화면 **단가 직접 수정 + 즉석 단가 저장**
- 거래명세서 **업무 문서 수준 양식**, 주문 **판매조회형 목록**

여전히 후순위(2차)인 항목:

- **정확한 회계 마진**(매입처별 원가·매입이력·재고평가·세무 반영)
- 단가 변경 이력, 미수금/입금 본격 관리, 세금계산서 발행, PDF, OCR, 외부 연동
- `delivery_notes` 저장/`note_number` 채번

접근금지(준수함):

- `web/`, `src/`, `tests/`, `data/`, `.agents/`, `.codex/`, `.planr/`, `prototype/order-moa-demo.html`, 코드/SQL/Supabase 미수정

검증:

- 변경은 7개 문서(md)에만. 코드/SQL/마이그레이션/실거래처 정보 복사 없음
- 마진은 전 문서에서 "예상 참고값"으로만 정의(정확 회계 마진은 2차)로 통일

남은 이슈:

- Codex 검수: base_purchase_price 단일 컬럼 안 vs 2차 원가 테이블 분리 경계 확인
- 다음: 실제 Next.js 구현 TASK 작성(단위 분할·검증 명령)

