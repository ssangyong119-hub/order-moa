# Claude 작업 지시 — W15(1차 조각) 저장 데이터 내보내기 / 백업

작업 위치: D:\Documents\ERP-1
브랜치: codex/integrate-mvp-docs-web

## 목표
저장된 데이터(주문·월 합계·기준정보)를 **파일(CSV)로 내보내는** 기능을 추가한다.
- 1차 목적 ①: 공유 Supabase 무료 쿼터 위험에 대비한 **데이터 안전망**(막히기 전에 손에 파일로 확보) + 전용 프로젝트 분리의 첫 단계.
- 1차 목적 ②: 회계사 전달·본인 월말 정리용 파일.
- **내보내기(export)만**. 이번 라운드에 **가져오기/복원(import)은 하지 않는다.**

## 중요 전제
- 이 작업은 회계/세금계산서 기능이 아니다. 저장된 숫자를 **파일로 꺼내기만** 한다.
- 시작 전 `git status`로 확인: **W12(거래처별 월 합계)가 미커밋 상태일 수 있음**. 그 경우 Codex가 `docs/codex-review-W12.md`로 W12를 먼저 커밋한 뒤 시작하는 것을 권장(W12와 W15를 별개 커밋으로). 미커밋 위에 쌓아도 되지만 검수 분리를 위해 분리 권장.

## 시작 절차
1. `git status --short --branch`
2. `git pull --ff-only origin codex/integrate-mvp-docs-web`
3. 아래 문서 읽기:
   - docs/NEXT-SESSION.md
   - docs/order-moa-system-meta-prompt.md
   - docs/order-moa-progress-data.json
   - docs/order-moa-ai-working-rules.md
   - docs/function-specification.md (F12·F13·백업 관련)
4. 코드 확인:
   - web/src/app/page.tsx (기존 `exportCsv` 인라인 함수 — 합산표 CSV. 이 패턴 재사용/추출)
   - web/src/lib/order-store.ts (loadOrders / ConfirmedOrder)
   - web/src/lib/monthly-summary.ts (buildMonthlySummary)
   - web/src/app/monthly-summary-view.tsx / price-management-view 등 뷰 패턴

## 제품 원칙 (반드시 준수)
- 전체 ERP화 금지. 세금계산서 발행·회계 마진·재고평가·OCR·카톡 자동읽기·이카운트 연동 금지/후순위.
- 내보내는 금액은 **저장된 값(order_items.amount / unit_price 스냅샷, order.total)** 그대로. **customer_prices(현재 단가표) 재조회 금지.**
- 예상 마진은 파일에 넣지 않는다(참고값이라 저장/배포 대상 아님). 넣더라도 "예상(참고)" 라벨 필수 — 기본은 제외 권장.
- raw_text 내보내기는 **이번 범위에서 제외**(개인정보 가능성 — 별도 판단). 월 합계/주문/기준정보만.
- Supabase 객체는 ordermoa_ 접두사 유지. **새 마이그레이션 금지**(기존 데이터 읽기만).
- 파일 인코딩은 UTF-8 BOM(엑셀 한글 깨짐 방지) — 기존 exportCsv가 이미 `"﻿"` 사용.

## 작업 범위 (작게, 딱 이만큼)
1. **CSV 유틸 추출(순수 함수) + 테스트**
   - 예: web/src/lib/csv-export.ts — `toCsv(rows: (string|number)[][]): string`(셀 escape: 큰따옴표·콤마·개행 처리, BOM은 다운로드 시 부착).
   - page.tsx의 기존 인라인 exportCsv(합산표)도 이 유틸로 교체(중복 제거). 다운로드 트리거 헬퍼는 공용화(`downloadCsv(filename, csv)`), page.tsx에 둬도 됨.
   - 테스트: 콤마/따옴표/개행 escape, 숫자 처리, 빈 배열.
2. **월 합계 CSV 내보내기** (monthly-summary-view)
   - 버튼: "CSV 내보내기". 컬럼: 거래처, 주문 건수, 공급가 합계, 마지막 주문일 + 마지막에 전체 합계 행.
   - 파일명: `거래처별월합계_YYYY-MM.csv`. 선택 월 기준. rows 0건이면 버튼 disabled.
3. **주문 목록 CSV 내보내기** (주문 목록 화면)
   - 컬럼(주문 1건=1행): 날짜, 거래처, 품목 요약, 공급가 합계. (라인 단위 상세는 후순위 — 이번엔 주문 단위 요약.)
   - 파일명: `주문목록.csv`. orders 0건이면 disabled.
4. **기준정보 백업 CSV** (데이터 관리 화면 — 현재 사이드바 "데이터 관리"가 준비중(soon)으로 있음 → 최소 실제 화면으로 연결)
   - 4개 버튼(각각 별도 CSV): 거래처(이름·연락처·주소·메모), 매입처(이름·연락처·주소·메모), 품목·별칭(품목명·단위·기본매입처·기준매입단가·별칭들), 단가(거래처·품목·단가).
   - 화면 상단 안내: "저장된 데이터를 파일로 내려받아 보관합니다. 공유 서버 문제나 기기 변경에 대비한 백업입니다. (가져오기/복원은 추후)"
   - 데모 모드는 현재 화면 상태를, DB 모드도 현재 로드된 상태(state)를 그대로 내보낸다(별도 재조회 없이 화면 데이터 = 이미 로드된 저장 데이터).
   - **주의**: 사이드바 "데이터 관리"가 2차용이면 건드리지 말고 새 최소 view("데이터 내보내기")를 판단해서 추가. 2차 메뉴를 새로 늘리지는 말 것 — 기존 soon 항목을 1차로 승격하거나 설정 하위에 최소 추가.

## 스냅샷/원칙 확인 (구현 중 체크)
- 주문/월 합계 CSV 금액이 order.total·order_items 스냅샷과 일치(현재 단가표와 무관).
- 단가 변경 후 과거 주문/월 CSV 값이 안 바뀌는지(가능하면 데모로 확인).
- 기준정보 백업은 현재 저장 상태를 그대로 — 계산/가공 최소화.

## 테스트
- csv-export 순수 함수 테스트(escape·BOM 여부·빈 값).
- 월 합계/주문 CSV의 행 구성 로직을 순수 함수로 뽑았다면 그 함수도 테스트(예: buildMonthlyCsvRows(summary)).
- 기존 테스트 깨지지 않게.

## 검증
- npm test
- cd web; npm test
- cd web; npm run build   (dev 켜져 있으면 먼저 중지 — .next 덮임 주의)
- cd web; npm audit --audit-level=low
- git diff --check
- 브라우저 smoke(데모 우선, 가능하면 DB):
  1. 월 합계 화면 → CSV 내보내기 → 파일 다운로드/컬럼·합계행 확인.
  2. 주문 목록 → CSV 내보내기 → 주문 건수·금액 확인.
  3. 데이터 내보내기 화면 → 거래처/매입처/품목·별칭/단가 각 CSV 확인.
  4. (가능하면) 단가 변경 후 주문/월 CSV 금액 불변 확인.
  5. 콘솔 오류 0.
  - 다운로드 자동화가 어려우면, CSV 문자열을 만드는 순수 함수 결과를 eval로 검사 + 실제 버튼 클릭 시 다운로드 트리거만 확인.

## 작업 후 필수 (자체 리뷰/디버깅/아이디어/문서)
1. 자체 코드 리뷰: 변경 파일 재독, 제품 원칙 위반 여부, 스냅샷/마진 비저장/ordermoa_ 접두사 재확인, CSV escape 취약(콤마·따옴표·개행·수식 인젝션 `=`,`+`,`-`,`@` 시작 셀) 점검.
   - **CSV injection 주의**: 셀이 `=`,`+`,`-`,`@`로 시작하면 엑셀 수식으로 해석될 수 있음 — 필요 시 앞에 `'` 또는 공백 escape. 최소 방어만(과하지 않게).
2. 디버깅: 테스트/빌드/콘솔/다운로드 확인. 문제 발견 시 새 기능 추가 없이 최소 수정.
3. 개선 아이디어: 즉시/나중 분리. 가져오기(import)·전체 zip·JSON 백업·라인 단위 CSV·자동 백업은 **나중**. 세금/회계/재고 연동은 **제외**.
4. 문서/진행판: W15(또는 "데이터 내보내기") 상태 갱신. `py -3 scripts/generate-progress.py` 재생성. NEXT-SESSION·agent-worklog 최소 갱신. function-specification.md 백업 항목과 어긋나면 최소 수정.

## 최종 보고
- 구현 내용 / 내보내는 파일·컬럼 정의 / 자체 리뷰·디버깅 결과 / 발견 문제와 처리 / 개선 아이디어(즉시·나중) / 테스트·빌드·audit / 브라우저 smoke / Codex 검수 포인트.

## 주의
- Claude는 커밋/푸시하지 말 것 — 결과만 보고. Codex가 최종 검수·커밋.
- **내보내기만. 가져오기/복원 금지(이번 범위).**
- 새 기능 임의 확장 금지. 세금계산서·입금/미수금·회계 장부·재고로 키우지 말 것.
- 범위를 넘는 개선은 보고만 하고 구현하지 말 것.
