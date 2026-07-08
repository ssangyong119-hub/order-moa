# Codex 검수 기록 — W12 월 합계 + W15 데이터 내보내기

작성: 2026-07-08 (Claude) · 브랜치 `codex/integrate-mvp-docs-web` · 기준 HEAD `2ae5f25`
상태: Claude 구현 후 Codex 검수용으로 정리한 기록. Claude는 커밋/푸시 안 함.

> W12(§1~7)와 W15(§9)가 **page.tsx·globals.css를 공유**해 함께 검수했다. Claude가 두 작업 모두 2차 검수·디버깅 마침(각각 버그 1건 발견·수정).

---

## 1. 무엇을 했나 (한 줄)
저장된 확정 주문의 **금액 스냅샷(order.total)만으로** 월(YYYY-MM)·거래처별 매출 합계를 보여주는 **조회 화면**을 추가했다. 세금계산서 발행이 아니라 월말 확인용 숫자까지만. **새 마이그레이션 없음.**

## 2. 변경 파일 (HEAD 2ae5f25 대비)

| 파일 | 종류 | 내용 |
|---|---|---|
| `web/src/lib/monthly-summary.ts` | 신규 | 순수 함수 `buildMonthlySummary(orders, "YYYY-MM")`, `availableMonths(orders)` |
| `web/src/lib/monthly-summary.test.ts` | 신규 | 4테스트(월 그룹핑·타월 제외·빈 월·availableMonths) |
| `web/src/app/monthly-summary-view.tsx` | 신규 | 조회 화면(월 선택 input + 표 + tfoot 전체합계 + 세금계산서 아님 안내) |
| `web/src/app/page.tsx` | 수정(+14줄) | View `"monthly"` · 조회 메뉴 항목 · 타이틀 · import · 렌더 · 대시보드 진행상태 문구 |
| `web/src/app/globals.css` | 수정(+3줄) | `.month-total-row`(tfoot) 스타일만 |
| `docs/order-moa-progress-data.json` | 수정 | W12 완료, W15 진행 중, currentFocus 갱신 |
| `docs/order-moa-progress-{dashboard.html,tracker.xlsx}` | 재생성 | JSON에서 자동 생성 |
| `docs/NEXT-SESSION.md` | 수정 | 완료 목록·다음 할 일 갱신 |
| `docs/agent-worklog.md` | 수정 | W12 기록 + 2차 검수 기록 |

## 3. 계산 기준 (제품 원칙 준수 확인)
- 월 합계 = `order.total`(= Σ `order_items.amount`, **확정 시점 스냅샷**)만 합산.
- `customer_prices`(현재 단가표)를 **입력으로 받지도 않음** → 단가 바꿔도 과거 월 합계 불변(구조로 보장).
- 예상 마진 비저장. `raw_text`와 무관(monthly-summary는 raw_text를 안 봄).
- 세금계산서/입금/미수금/회계 확장 **없음** — 읽기 전용 조회.
- 사이드바 2차 메뉴(미수금 등) 안 건드림. '거래처별 월 합계'는 **조회 그룹의 1차 메뉴**.
- `function-specification.md` F12(order_items.amount 합·읽기전용·별도 테이블 없음)와 일치 → 스펙 수정 불필요.

## 4. 검증 결과 (2차 검수 후 재실행, 전부 통과)
```
root npm test        : 5/5
web  npm test        : 107/107  (monthly-summary +4)
web  npm run build   : 성공 (타입/lint 포함)
web  npm audit        : 0 vulnerabilities
git diff --check     : clean
```
데모 브라우저 smoke(콘솔 0): 2026-07 발주 2건 → 가람식당 76,000 · 한빛카페 49,400 · **전체 125,400**(금액 내림차순, 마지막 주문일 표시). **단가표 콩나물 99,999원 변경 후 월 합계 불변**(스냅샷 검증). 빈 월(2026-01) 안내. 월 기본값=최신 달.
(DB 모드 smoke는 로그인 필요라 미실행 — orders는 loadOrders 스냅샷이라 동작 동일, 회귀 위험 낮음.)

## 5. Claude 2차 검수에서 발견·수정한 것
- **[버그·수정완료]** 월 선택 `<input type="month">`를 `.checkline` 라벨로 감싸 `.checkline input{width:18px}`가 상속되어 입력칸이 **18px로 찌그러짐**(기능은 되나 육안으로 못 씀). → `.checkline` 제거, 일반 라벨(inline flex)+`width:170`으로 교체. 재확인 155px 정상.
- page.tsx/globals.css diff에 의도 외 변경 없음 확인.
- 순수 함수 로직(정렬·동률·lastOrderDate·빈 월) 재검토 — 이상 없음.

## 6. Codex가 확인해줄 포인트
1. `order.total` 스냅샷만 쓰는 계산이 세금/회계로 새지 않았는지(구조상 customer_prices 미입력).
2. 조회 그룹 1차 메뉴 배치가 적절한지(2차 미수금 메뉴 미변경).
3. 월 기본값=최신 달, 거래처명은 최신 주문명 사용(이름 변경 대비) 로직.
4. CSV 내보내기·일/년 기간 집계를 W12 범위 밖으로 남긴 판단(F12 스펙엔 있음 → 후속 후보).
5. 커밋 메시지 예: `feat: add monthly summary and CSV exports`.

## 7. 커밋 제안
코드(3 신규 + page.tsx + globals.css) + 문서(진행판/NEXT-SESSION/worklog)를 한 커밋으로. 마이그레이션 없음.

---

## 9. W15 데이터 내보내기(CSV) — 같은 배치에 포함

### 한 줄
저장된 데이터(기준정보·주문·월 합계)를 **CSV 파일로 내보내기**. 공유 Supabase 쿼터 위험 대비 백업 + 회계사 전달용. **내보내기만**(가져오기/복원은 후순위). 마이그레이션 없음.

### 변경 파일 (W15 몫)
| 파일 | 종류 | 내용 |
|---|---|---|
| `web/src/lib/csv-export.ts` | 신규 | `toCsv(rows)`(escape·CSV 인젝션 방어) + `downloadCsv(name, rows)`(BOM) |
| `web/src/lib/csv-export.test.ts` | 신규 | 4테스트(escape·따옴표·인젝션·숫자/빈값) |
| `web/src/app/page.tsx` | 수정 | 기존 exportCsv를 downloadCsv로 교체 + 주문 CSV + 기준정보 4종 백업 함수 + '데이터 내보내기' view + nav(기존 soon '데이터 관리'→실화면) |
| `web/src/app/monthly-summary-view.tsx` | 수정 | 월 합계 CSV 내보내기 버튼 |
| `web/src/app/globals.css` | 수정 | `.export-grid`/`.export-item` |
| `docs/task-prompt-W15-export.md` | 신규 | 이 작업 지시 프롬프트 |

### 내보내는 파일·컬럼
- 거래처.csv (거래처명·연락처·주소·메모) / 매입처.csv (동일) / 품목별칭.csv (품목명·기본단위·기본매입처·기준매입단가·별칭;세미콜론) / 단가.csv (거래처·품목·판매단가) / 주문목록.csv (날짜·거래처·품목요약·공급가합계) / 거래처별월합계_YYYY-MM.csv (거래처·건수·합계·마지막주문일 + 전체합계행).
- 금액은 전부 **저장 스냅샷(order.total / order_items.amount·단가 저장본)**. customer_prices 재조회 없음.

### W15 자체 검수·발견
- **[버그·수정완료]** 주문 목록 CSV 버튼 추가 시 JSX fragment(`<>…</>`) 미종결 → 빌드 실패날 뻔 → 닫음(빌드 통과 확인).
- 기존 exportCsv의 허술한 `"${cell}"` escape를 제대로 된 `toCsv`로 교체(콤마 든 메모/품목요약이 열 깨짐 없이 quoting되는 것 데모로 확인: `"점심 백반, 채소 위주"`, `"콩나물, 두부 외 4건"`).
- CSV 인젝션(`=,+,-,@` 시작 셀 앞 `'`) 최소 방어 적용·테스트.
- 데모 실측: 6종 CSV 다운로드 가로채 내용·escape·BOM·스냅샷 금액 확인, 콘솔 0.

### W15 검수 포인트 (Codex)
1. CSV escape/인젝션 방어가 과하지 않고 충분한지(`toCsv`).
2. '데이터 내보내기'가 기존 soon '데이터 관리' 메뉴를 실화면으로 승격한 것(2차 미수금 메뉴 미변경) 적절한지.
3. 백업이 **활성 데이터만** 내보냄(archived 거래처/매입처/품목 제외 — state에 없음). 후순위 개선으로 남길지.
4. 내보내기만/가져오기 미구현 범위 판단.

## 10. 다음 후보 (배치 이후)
- **엑셀 가져오기(import)** — 초기 세팅용(W15 나머지 절반, 후순위).
- 백업에 archived 포함 / 전체 zip·JSON 한 번에.
- 잔여 보강: 인쇄 실물 육안 확인, 품목 15개↑ 다중 페이지, 명세서 번호 자동 채번.
- **전용 Supabase 분리 논의** — 공유 프로젝트 무료 쿼터 경고 상태. 이제 데이터 백업 수단이 생겨 분리 실행 리스크 낮아짐(적기).
