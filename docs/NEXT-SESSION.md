# 세션 인계 — 오더모아 (Order-Moa) MVP

작성일: 2026-07-07 (저녁 세션 종료 시점)
작업 폴더: `D:\Documents\ERP-1` ← **Claude Code를 반드시 이 폴더에서 열 것** (자동낙찰기 `D:\Projects\new app`에서 열면 문서 클릭·경로가 어긋남)
브랜치: `codex/integrate-mvp-docs-web`

> 새 세션은 이 문서 + `docs/order-moa-system-meta-prompt.md`(헌장) + `docs/order-moa-progress-data.json`(진행 단일 소스)를 먼저 읽고 시작한다.

## 환경
- 스택: Next.js 15 + TS + Vitest, Supabase(Auth+Postgres+RLS). 배포 없음 — 로컬(`cd web; npm run dev`).
- Supabase: 기존 `yangsan-inventory` 프로젝트 **공유** → 오더모아 객체는 전부 `ordermoa_` 접두사. `web/.env.local`(미추적) 있으면 DB 모드, 없으면 데모 모드.
- **로그인**: 매직링크는 무료 메일 rate limit으로 자주 막힘 → **비밀번호 로그인 추가됨**(`a696a36`). 실측 계정은 Supabase Auth에 password+Auto Confirm으로 사용자가 생성(예: `admin@ordermoa.app`).
- 협업: **Claude는 커밋/머지/push 안 함 — 보고만.** 커밋은 Codex 판단. 마이그레이션·스키마는 Codex 승인 게이트.
- ⚠️ cwd가 매 명령 후 리셋될 수 있음 → git/npm 전 항상 `cd "D:/Documents/ERP-1"`.

## 이번 세션(2026-07-07)에 한 일 — 커밋
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
- **✅ 완료**: W01(헌장) · **W02 거래처 · W03 품목·별칭 · W04 단가 · W07 매입처(연락처/주소 포함) = 기준정보 4종 전부** · W05·W06(매입처 DB화) · W08(주문 저장 실측) · W17(합산표 개선 팩).
  - 0004_suppliers.sql **Supabase 적용 완료**. 비밀번호 로그인 → 발주 확정 → **F5 후 주문 유지 실측 성공**.
  - 기준정보 4종은 **데모 모드 브라우저 실측 완료**(추가/수정/보관/복원/별칭/단가→파싱 반영). **DB 모드는 0005 적용 후 실측 대기** — 로그인 상태에서 확인 필요.
  - 0005_supplier_contact.sql **Supabase 적용 완료**(SQL Editor `Success. No rows returned`). 이제 DB(로그인) 모드에서 매입처 phone/address select가 막히지 않아야 함.
- 검증 최신값(2026-07-07 마무리 리뷰): root `npm test` 5/5 · web `npm test` **100/100** · `npm run build` 성공 · `npm audit` 0건 · 데모 smoke test 콘솔 오류 0.

## 다음에 이어서 할 일 (우선순위)
1. **[A] DB 모드 실측** — 로그인 상태에서 매입처 연락처·단가 저장 → F5 유지 확인. 기준정보 4종 DB 실측 마무리.
2. **[B/C/D] W09~W11 = 8c** — raw_text 저장/삭제(W09) → 저장 주문 기반 합산표 재조회(W10) → 저장 주문 기반 명세서 재출력(W11). 합산 계산 함수는 이미 완성, DB 조회 결과만 연결.
3. **[E] F7 거래명세서 하단 보정** — 인수자 서명란/빈행/합계 문구. 짧은 보정, 중간에 끼워도 됨. (현재 명세서에 인수자란 없음 — 이번 세션에서 미구현 확인됨)

## 꼭 알아야 할 맥락·주의
- **좁은 MVP**: 세금계산서 발행·회계 마진·재고평가·매입처 원가이력·OCR·카톡 자동·이카운트 연동 = 후순위/제외. 사이드바에 2차 메뉴 추가 금지.
- **용어(피드백 정리)**: 주문 확정=거래처 발주를 우리 판매 장부에 저장 / 매입처 발주=우리가 매입처에 보낼 구매 문장. **매입처 쪽 거래명세서는 매입처가 발행 — 우리가 안 만듦.** (상세 `docs/order-moa-feedback-design-2026-07-07.md` §0)
- **DB 불변 규칙(헌장 §3)**: `order_items.amount`는 generated → insert 제외. `unit_price`=확정 시점 스냅샷, 과거 명세서는 customer_prices 재조회 금지. 예상 마진 저장 안 함. raw_text 삭제 가능(확정 주문 유지). soft delete.
- **검증 한 세트**: root `npm test` · web `npm test` · web `npm run build` · web `npm audit --audit-level=low`. UI 변경은 브라우저 확인까지. 진행판 고치면 `py -3 scripts/generate-progress.py`로 HTML/XLSX 재생성(JSON이 단일 소스).
- **[위험] 공유 Supabase 무료 쿼터 경고**("Grace period is over")가 대시보드에 떠 있음 → 한도 소진 시 로그인·저장 막힐 수 있음. 오더모아 전용 프로젝트 분리 시점 논의 필요.
- **[나중]** 매직링크 정식화(Supabase Auth URL Configuration에 개발 URL 등록 — 기본 localhost:3000만 허용됨), 발주 문장 템플릿 설정 화면(2차).
- 관련 문서: `order-moa-system-meta-prompt.md`(헌장) · `order-moa-expanded-roadmap.md` · `order-moa-module-map.md` · `order-moa-ai-working-rules.md` · `order-moa-feedback-design-2026-07-07.md` · `order-moa-progress-{data.json,dashboard.html,tracker.xlsx}`.
