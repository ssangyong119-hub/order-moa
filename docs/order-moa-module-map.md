# 오더모아 모듈 맵 (화면·기능·DB·업무 흐름)

작성일: 2026-07-07 (2026-07-11 W23 현행화)
작성 주체: Claude 초안, Codex 검수 반영
상위 문서: `docs/order-moa-system-meta-prompt.md`(헌장), `docs/order-moa-expanded-roadmap.md`(차수별 시기), `docs/order-moa-system-redesign-2026-07-11.md`(W23 재설계 기준)
코드 기준: `web/src/` (2026-07-11, 브랜치 `codex/integrate-mvp-docs-web` `f563f50`)

> 읽는 법: 모듈마다 **무엇을 하는가 / 화면 / 핵심 코드 / DB / 차수**를 적었다. "코드 없음·테이블 없음"이 명시된 모듈은 아직 설계만 있는 것이다. M17~M20은 W23 신규 개념(설계 승인·미구현).

---

## 전체 업무 흐름 한 장 (W23 두 경로 반영)

```
[발주 수집] → [파싱/정제] ─┬→ (경로 A) [최종 확정] ────────┬→ [합산표] → [매입처 발주]
     ↑              ↑      └→ (경로 B, 설계) [수량 확인·    ├→ [주문 목록/조회]
[거래처 관리]  [품목/별칭/단가]        가격 대기] ──────────┤   (가격 대기도 합산 포함)
[매입처 관리]                              ↓                ├→ [거래명세서(최종 확정만)]
                     (설계) [매입가 입력→가격 마감=최종 확정]└→ [리포트/집계]
                                              └→ (2차) [미수금/입금] [세금계산서 근거]
[권한/회사/사용자] · [설정/데이터 관리(내보내기·카탈로그 import)] = 전체를 받치는 밑판
[대시보드(설계: 오늘 업무 큐 — 상태 집계 전용)]
```

---

## 모듈 목록

### M01 발주 수집
- **역할**: 카톡/문자 발주 원문을 시스템에 넣는 입구. 거래처 선택 + 붙여넣기.
- **화면**: 발주 붙여넣기(view=paste)
- **코드**: `page.tsx`(paste 뷰), 샘플 예시 `sample-data.ts`
- **DB**: `ordermoa_order_imports` — **사용 중(W09)**: raw_text 저장·보기·삭제 + `order_id` 링크(0006)
- **차수**: 1차 구현됨(raw_text 포함) / 주문 링크 장기 / 카톡 자동 읽기 제외 / **표·CSV/엑셀·사진 OCR은 W23 입력 어댑터(M20 — 파일 우선, OCR은 보류 실험)**

### M02 파싱/정제
- **역할**: 원문 → 라인 후보(품목·수량·단위·단가). 후보만 제안, 확정은 사람.
- **화면**: 파싱 결과 확인(view=review) — 미매칭 빨강, 수량불확실 노랑, 다중 후보 확인
- **코드**: `lib/order-parser.ts`(순수 함수 — parseOrderText/canConfirm/confirmBlockReason), fixture `order-moa-real-order-test-*`
- **DB**: 없음(파싱 후보는 DB 미저장 — 화면 상태만, 확정값 C1/A)
- **차수**: 1차 구현됨 / 단위 사전·fixture 확대 상시 / 회사별 규칙 2차 / 자동 확정 금지(영구)

### M03 품목/별칭/단가 (기준정보)
- **역할**: 파싱 매칭의 사전(별칭)과 가격표(거래처별 단가), 품목 원장(카테고리·기본 출고단가·외부코드 포함).
- **화면**: 품목·별칭 관리(W03/W19/W22 — 카테고리·기본 출고단가 입력 포함) / 단가 관리(W04) — **구현 완료**. 즉석 경로도 구현(검색 선택, 신규 품목 즉석 등록, 단가 즉석 저장)
- **코드**: `lib/product-store.ts`, `lib/price-store.ts`, `lib/product-search.ts`, `lib/product-registration.ts`, `product-management-view.tsx`, `price-management-view.tsx`
- **DB**: `ordermoa_products`(+category 0007, source_code 0008, base_sale_price 0009) / `ordermoa_product_aliases` / `ordermoa_customer_prices`
- **차수**: CRUD 1차 완료 / 카탈로그 import 구현(M16) / 단가 이력 2차 / 다단위·거래처 예외단가 재설계 Phase 3

### M04 거래처 관리
- **역할**: 매출처(식당·마트) 원장. soft delete(archived_at).
- **화면**: 거래처 관리(W02) — **구현 완료**
- **코드**: `lib/customer-store.ts`, `customer-management-view.tsx`
- **DB**: `ordermoa_customers`
- **차수**: CRUD 1차 완료 / 거래처 통계 2~3차

### M05 매입처 관리
- **역할**: 품목별 기본 매입처 지정 → 합산표를 매입처별 발주 문장으로 분리.
- **화면**: 합산표 안의 매입처 컬럼·매입처별 문장(구현) / 매입처 관리 화면(W07 — **구현 완료**, 연락처/주소 포함)
- **코드**: `lib/aggregate.ts`(buildSupplierPurchaseSections), `lib/supplier-store.ts`, `supplier-management-view.tsx`
- **DB**: **적용됨(0004+0005)** — `ordermoa_suppliers` + `products.purchase_supplier_id` FK
- **차수**: 1차 완료 / 원가·발주이력·미지급 2차

### M06 주문 확정
- **역할**: 확인 끝난 라인을 orders+order_items로 저장. 단가 스냅샷, amount는 generated.
- **화면**: 파싱 결과 확인의 "주문 확정" 버튼
- **코드**: `order-store.ts`(toOrderInsert/toItemInserts/saveOrder — items 실패 시 cancelled 보상)
- **DB**: `ordermoa_orders`(status: confirmed/cancelled, delete 정책 없음), `ordermoa_order_items`(product_id NOT NULL, amount generated)
- **차수**: 1차 완료(8b 실측 포함) / RPC 원자화 개선 후보 / 주문 수정·반품 2차 / **W23: 확정이 "최종 확정"으로 재정의되고 가격 대기 상태가 추가될 예정(M17, 설계)**

### M07 합산표
- **역할**: 여러 거래처 주문을 품목별 총수량으로 — 매입처 발주의 근거.
- **화면**: 품목별 합산표(view=aggregate) — 날짜/거래처 필터, 거래처별 기여 내역
- **코드**: `lib/aggregate.ts`(buildAggregateRows — 순수 함수)
- **DB**: 읽기 전용(orders/order_items/products)
- **차수**: 1차 구현됨 / DB 저장 주문 기반 재출력 8c / CSV 내보내기 1.5차

### M08 매입처 발주
- **역할**: 합산표에서 체크한 품목을 매입처별 발주 문장으로 만들어 복사(카톡 전송은 사람).
- **화면**: 합산표 하단 — 체크 기본 비움, 섹션별/전체 복사
- **코드**: `lib/aggregate.ts`(formatSupplierPurchaseText)
- **DB**: 없음(복사만) — 발주 기록 저장은 2차
- **차수**: 1차 구현됨 / 발주 이력 저장 2차 / 자동 전송 제외

### M09 주문 목록/조회
- **역할**: 확정 주문의 판매조회. 취소(soft) 포함.
- **화면**: 주문 목록(view=orders) — 날짜 조회(W18), 원문 보기/삭제(W09)
- **코드**: `order-store.ts`(loadOrders — confirmed만, 최신순)
- **DB**: orders/order_items(+order_imports.raw_text 병합) 읽기
- **차수**: 1차 완료(실측 포함) / 주문 수정(정정 절차) W23 후속 설계 / **W23: 가격 대기 주문 표시가 추가될 예정(설계)**

### M10 거래명세서
- **역할**: 주문 1건 → 인쇄용 명세서. 저장된 스냅샷 금액만으로 재구성(단가 재조회 금지).
- **화면**: 거래명세서(view=note) — 빈행 패딩, window.print
- **코드**: `page.tsx`(note 뷰), spec `docs/delivery-note-print-spec.md`
- **DB**: 읽기 전용. `delivery_notes` 저장형은 미생성(2차)
- **차수**: 미리보기/인쇄 1차 구현됨 / 양식 개선 1.5차 / 저장형+채번+PDF 2차

### M11 리포트/집계
- **역할**: 거래처별 일/월/년 금액 합계(세금계산서 대조의 1차 근거).
- **화면**: 거래처별 월 합계(view=monthly, W12) — **구현 완료**
- **코드**: `lib/monthly-summary.ts`(순수 함수 — order.total 스냅샷 집계, customer_prices 재조회 없음)
- **DB**: 읽기 전용
- **차수**: 월 합계 1차 완료 / 월 정산표 2차 / 추이 리포트 3차

### M12 미수금/입금
- **역할**: 수동 미수 체크 → 입금 기록.
- **화면**: 사이드바 자리만("2차" 배지)
- **코드/DB**: 없음. 스키마 설계만(`receivables` — db-schema §4.11, 수동 status)
- **차수**: **2차** / 알림 3차 / 은행 자동 매칭 제외

### M13 세금계산서 근거
- **역할**: 월·거래처 매출합계 vs 발행액 대조(발행은 안 함).
- **화면/코드/DB**: 없음. `tax_invoice_summaries` 여지만(2차)
- **차수**: 근거 데이터 보존은 **1차부터 동작 중**(스냅샷 원칙) / 정리 화면 2차 / 직접 발행 제외

### M14 재고/원가
- **역할**: (3차) 입출고 수량 기록, (2차) 매입처별 원가 이력 → 개선된 마진.
- **현재**: `products.base_purchase_price`(단일 참고값)로 예상 마진만. 저장 안 함.
- **차수**: 예상 마진 1차 구현됨 / 원가 이력 2차 / 좁은 재고 3차 / 재고 평가 제외

### M15 권한/회사/사용자
- **역할**: 로그인(매직링크), 회사 부트스트랩(RPC), 회사 격리(RLS+트리거).
- **화면**: 로그인/회사 생성(auth-gate.tsx), 개발용 데모 진입(dev 전용)
- **코드**: `app/auth-gate.tsx`, RPC `ordermoa_create_company_with_owner`
- **DB**: companies/company_members + 전 테이블 RLS
- **차수**: owner 단독 1차 완료(실측 포함) / staff UI 2차 / 감사 로그 3차

### M16 설정/데이터 관리
- **역할**: 샘플 시드(멱등), CSV 내보내기, 카탈로그 검수 import.
- **화면**: 데이터 내보내기/가져오기(view=data) — **구현 완료**(W15 내보내기 + W21 카탈로그 import 미리보기/검수/DB 반영)
- **코드**: `lib/csv-export.ts`, `lib/catalog-import.ts`, `catalog-import-view.tsx`, `order-store.ts`(ensureSeed)
- **차수**: 시드·내보내기·카탈로그 import 완료 / 샘플 초기화·백업 1.5차 / 보관 정책 3차

---

## W23 신규 모듈 개념 (2026-07-11 — 전부 **설계 승인·미구현**, 재설계 기준 §4~§11)

### M17 주문 상태 전이 (수량 확인·가격 대기·최종 확정·정정)
- **역할**: 두 경로를 받치는 상태 모델. 가격 대기 주문도 합산에 포함, 명세서는 최종 확정만.
- **DB**: R1 승인 게이트에서 확정(대안 비교·권장안은 재설계 기준 §11 — 본 문서에 복사하지 않음)

### M18 가격 마감 (매입가 입력 → 판매가 제안·확정)
- **역할**: 품목별 매입가 1회 입력 → 거래처×품목 판매가 제안(거래처 단가 > 기본 출고단가) → 사용자 확정 = 스냅샷 고정. 마진 자동화·저장 없음.
- **화면**: 가격 마감 + 가격 대기 큐(screen-spec §16)

### M19 거래처별 해석 기억 (후속)
- **역할**: `숙주1` 같은 거래처 관습을 명시 저장으로 기억해 후보 제안(자동 확정 금지). 다단위(Phase 3)와 맞물려 핵심 경로 뒤 별도 설계.

### M20 입력 어댑터 (표/CSV/엑셀 → 공통 검수표, 사진 OCR은 보류 실험)
- **역할**: 모든 입력 채널을 M02의 공통 검수표로 수렴. 파일 우선, OCR 2종은 검증 게이트 통과 후. 원본 이미지 기본 미보존(재설계 기준 §12).

### 대시보드(오늘 업무 큐) — 별도 모듈 아님
- M17 상태의 읽기 전용 집계. 별도 진실 저장 금지.

---

## DB 객체 ↔ 모듈 매핑 (2026-07-11 현행)

| 테이블 | 상태 | 주 모듈 |
|---|---|---|
| ordermoa_companies / company_members | 적용됨 | M15 |
| ordermoa_customers | 적용됨 | M04 |
| ordermoa_products / product_aliases | 적용됨(+0007/0008/0009 컬럼) | M03 |
| ordermoa_customer_prices | 적용됨 | M03 |
| ordermoa_order_imports | 적용됨·**사용 중(W09, +0006 order_id)** | M01/M09 |
| ordermoa_orders / order_items | 적용됨 | M06/M07/M09/M10/M11 |
| ordermoa_suppliers | **적용됨(0004+0005)** | M05 |
| (W23) 가격 대기 상태 저장 | **미정 — R1 승인 게이트**(재설계 기준 §11) | M17/M18 |
| receivables / price_history / tax_invoice_summaries / delivery_notes | 미생성(2차) | M12/M03/M13/M10 |

## 모듈 간 의존 규칙

- M02(파서)·M07(합산)은 **순수 함수 유지** — 저장소·UI 의존 금지. 데모/DB 모드가 같은 함수를 쓴다.
- M06(확정)의 스냅샷이 M09~M13의 유일한 진실. 어떤 조회 모듈도 customer_prices를 과거 금액 재계산에 쓰지 않는다.
- M05(매입처)는 M03(품목)의 FK로만 연결 — 발주 문장(M08)은 그 위의 표시 로직.
- 새 모듈 추가 시: 헌장 §6.2 체크리스트(company_id+RLS+트리거+접두사) 통과 후 마이그레이션.
