# 단위 6 TASK — Next.js 샘플 데이터 기반 핵심 흐름 구현

작성일: 2026-06-30
작성 주체: Claude (단위 5 — 단위 6 TASK 준비)
대상: 다음 세션 Claude(구현 담당)
상위 근거: `docs/screen-specification.md`(S1~S14), `docs/function-specification.md`(F1~F13), `docs/sample-data-definition.md`, `docs/delivery-note-print-spec.md`, `docs/db-schema-definition.md`

> **이 TASK의 성격**: 전체 ERP 구현이 아니다. **샘플 데이터 기반으로 "붙여넣으면 합산표·거래명세서가 나온다"는 핵심 흐름**을 실제 Next.js 화면으로 만든다. **Supabase 연결·실제 영구 저장·로그인은 하지 않는다.**

---

## 0. 시작 전 확인 (필수)

1. **작업 위치/브랜치 확인**
   - 문서/프로토타입 메인: `D:\Documents\ERP-1` (브랜치 `codex/order-moa-mvp`)
   - **web/ 스캐폴드는 `claude/web-mvp-scaffold` 브랜치**에 있다(아직 codex 브랜치에 미머지).
   - PowerShell cwd가 `D:\Projects\ERP-1`(빈 폴더)로 리셋되므로 **모든 git/npm 전에 `Set-Location` 필수**.
2. **머지 여부 결정 먼저** (Codex 승인 사항): web 구현을 어디서 이어갈지 택1
   - (A) `claude/web-mvp-scaffold`에서 계속 작업(권장 — 스캐폴드가 거기 있음)
   - (B) 스캐폴드를 codex 브랜치로 머지 후 작업
   - **임의로 머지하지 말고 사용자/Codex 확인 후 진행.**
3. **기존 web/ 구조 확인** (스캐폴드 브랜치 기준)
   ```
   web/package.json (Next.js 15 + TS + Vitest)
   web/src/app/layout.tsx, web/src/app/page.tsx
   web/src/lib/domain/{index.ts, types.ts, domain.test.ts}
   web/vitest.config.ts, web/tsconfig.json, web/.env.local.example
   ```
   - 기존 도메인 로직(`web/src/lib/domain`)과 테스트를 **재사용**한다(중복 구현 금지).

---

## 1. 구현 범위 (1차 데모 흐름)

샘플 데이터 → 대시보드 → 붙여넣기 → 파싱 확인/수정 → 합산표 → 주문목록 → 거래명세서 인쇄. **클라이언트 상태(메모리/localStorage)만 사용.**

| # | 화면(스펙) | 핵심 동작 | 근거 |
|---|---|---|---|
| 1 | 샘플 데이터 로딩 (S4) | 가명 거래처/품목/별칭/단가/**기준 매입단가**/발주 예시 적재 | sample-data-definition |
| 2 | 대시보드 (S3) | [발주 붙여넣기]·[샘플 시작] 큰 버튼, 오늘 주문 수, 합산표 바로가기, 빈 상태 안내 | S3 |
| 3 | 발주 붙여넣기 (S8) | 거래처 선택 + 원문 textarea + 예시 선택 + [파싱], raw_text 저장/삭제 안내 | F7/S8 |
| 4 | 파싱 결과 확인/수정 (S9) | 라인별 품목/수량/단위/**단가 직접 수정**, 금액 자동 재계산, 미매칭(빨강)/수량불확실(노랑)/단가미등록(앰버), 별칭 즉석 등록, **단가 미등록 시 [이 단가 저장]**, 미매칭·불확실 잔존 시 [주문 확정] 차단 | F8/F9/S9 |
| 5 | 예상 마진 표시 | 품목 `base_purchase_price` 있으면 라인/주문 예상 마진(참고값) 표시, 없으면 `-` | F6 §5.1 |
| 6 | 품목별 합산표 (S11) | 날짜/거래처 필터, 품목·단위·총수량·관련 거래처 수, CSV 내보내기 | F11/S11 |
| 7 | 주문 목록(판매조회형) (S10) | 날짜/거래처/품목요약/금액/상태/[명세서] 버튼, 행→주문 상세 | F10/F12/S10 |
| 8 | 거래명세서 미리보기/인쇄 (S12) | 공급자/거래처 블록 + 라인 표 + 공급가 합계(VAT 없음), 브라우저 인쇄(@media print, A4) | F13/S12/delivery-note-print-spec |
| 9 | 모바일 반응형 | 표→카드형/가로 스크롤, 단가/수량 모바일 수정, 입력 16px·터치 44px | screen-spec §12 |
| 10 | 오류 비노출 | 전역 오류 가드, 사용자 친화 메시지(빈 상태/실패 재시도) | acceptance §5 |

### 데이터/계산 규칙 (반드시 준수)
- 금액 KRW `integer`. 라인 `amount = round(quantity × unit_price)`. **합계 = Σ amount**(합산 후 반올림 없음).
- 예상 마진 = `(판매단가 − 기준 매입단가) × 수량`, 매입단가 없으면 미표시(`-`). **참고값**(정확 회계 마진 아님).
- 미매칭/수량 불확실 라인 잔존 시 **확정 차단**.
- 단가 미등록 = 0원 + 경고, 그 자리에서 입력·저장 가능(데모는 클라이언트 상태에 저장).

---

## 2. 제외 (이번 TASK 금지)

- Supabase 연결 / 인증(로그인) 실제 구현 / DB 마이그레이션
- 실제 서버 영구 저장(이번엔 메모리/localStorage만)
- PDF 파일 생성 / 세금계산서 발행 / 이카운트 연동 / 카톡 자동 읽기 / OCR
- 새 기능 추가(스펙 F1~F13 밖). 미수금(S13)·설정 내보내기(S14)는 이번 범위 밖(후순위)
- 로그인/회사 생성 화면은 데모에선 "데모 회사" 고정 표시로 갈음(프로토타입 README와 동일 방침)

---

## 3. 구현 가이드 (권장, 강제 아님)

- 기존 `web/` Next.js 15 App Router + TS 위에 구현. 도메인 로직은 `web/src/lib/domain` 재사용/확장.
- 상태: React 상태 + (선택) localStorage. 외부 상태 라이브러리 도입은 YAGNI — 필요해지면 그때.
- 파싱: 규칙 기반(줄 분리 → 쉼표 분리 → 수량/단위 후보 → 별칭 매칭 → 단가 적용). function-spec §6 그대로.
- 샘플 데이터: `web/src/lib/sample-data.ts`(가명) 한 파일에 모아 적재. **개인정보/실상호 금지.**
- 스타일: 프로토타입(`prototype/order-moa-demo.html`)의 톤(warm cream/coral/ink, 상태 배지) 참고 가능. 단, **prototype/ 파일은 수정하지 말 것**(참고만).
- 컴포넌트/파일은 화면 단위로 최소 분할. 과한 추상화·미사용 설정 금지.

---

## 4. 검증 명령 (완료 전 실행·결과 보고)

```powershell
Set-Location 'D:\Documents\ERP-1\web'   # 또는 스캐폴드 브랜치의 web 경로
npm install            # 최초 1회
npm test               # Vitest (기존 도메인 테스트 유지 + 신규 파싱/금액/마진 테스트 통과)
npm run build          # 빌드 통과 확인
npm run dev            # 수동 흐름 확인용
```
- 루트(`D:\Documents\ERP-1`)에 정적 MVP 테스트가 남아 있으면 그것도 실행해 회귀 확인.
- **테스트 최소 추가**: 금액 계산(`round`), 합계(Σ), 예상 마진(매입단가 유무), 파싱 상태(미매칭/수량불확실 차단). 프레임워크 추가 없이 Vitest로.
- **모바일 폭 검증**: 360 / 390 / 430px에서 주요 화면(붙여넣기·파싱·합산표·명세서) 확인. 수동 또는 Playwright(있으면).

---

## 5. 완료 보고 형식 (구현 세션이 남길 것)

- 작업 브랜치/머지 결정
- 구현한 화면/흐름
- 추가/수정 파일(web/ 중심)
- 테스트 결과(`npm test`/`npm run build` 출력)
- 모바일 확인 결과(폭별)
- 미구현/다음 단계(Supabase 연결 등)
- git status --short

---

## 6. 주의

- 실제 코드 외 문서(docs/)는 이 TASK에서 건드릴 필요 없음(필요 시 worklog만).
- `prototype/order-moa-demo.html`·`.codex/`·`.planr/`·`data/` 수정 금지.
- 실거래처명/전화/사업자번호/주소를 코드·샘플에 넣지 말 것.
- Supabase 연결은 **다음 단위**(스키마 `db-schema-definition.md`·RLS `supabase-rls-policy.md` 적용)로 분리.
