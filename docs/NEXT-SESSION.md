# 세션 인계 - 오더모아 (Order-Moa) MVP

작성일: 2026-07-07
작업 폴더: `D:\Documents\ERP-1`
브랜치: `codex/integrate-mvp-docs-web`

> 새 세션은 이 문서와 `docs/order-moa-system-meta-prompt.md`를 먼저 읽고 시작한다.

## 현재 프로젝트 위치

- 오더모아는 전체 ERP가 아니라, 도소매/식당납품 사장님을 위한 좁은 웹 ERP MVP다.
- 핵심 흐름은 `발주 원문 붙여넣기 -> 파싱 확인 -> 주문 확정 -> 품목 합산표 -> 매입처별 발주 문장 -> 주문 목록 -> 거래명세서 인쇄`다.
- Supabase는 새 프로젝트 한도 때문에 기존 `yangsan-inventory` 프로젝트를 공유한다. 오더모아 DB 객체는 모두 `ordermoa_` 접두사를 쓴다.
- `web/.env.local`에 Supabase URL/anon key가 있으면 DB 모드, 없으면 데모 모드로 동작한다.

## 최근 완료된 큰 줄기

- 8a: Supabase 인증, 회사 생성, RLS, A/B 회사 격리 실측 완료.
- 8b 코드: 주문 저장/조회, 샘플 시드 멱등화, `orders`/`order_items` 저장 경로 구현.
- UI: 좌측 사이드바형 업무 화면, 품목 검색, 다중 후보 확인, 신규 품목 즉석 등록, 매입처별 발주 문장, 거래명세서 인쇄 보정.
- 파서: 실제 발주 fixture 기반 테스트, 규격 숫자 뒤 수량 인식, 단위 사전 확장.
- 문서: 전체 시스템 헌장/로드맵/모듈맵/AI 작업 규칙 초안 작성 및 Codex 검수 반영.

## 다음 작업 우선순위

1. **기준정보 관리 1차**
   - 거래처 관리, 품목·별칭 관리, 단가 관리 화면을 만든다.
   - `page.tsx`가 커졌으므로 화면 단위 분리를 함께 진행한다.

2. **매입처 DB화 (1차 보강, 8c 전 권장)**
   - 현재 매입처는 화면/샘플 상태에만 있어 새로고침 후 사라질 수 있다.
   - `ordermoa_suppliers` + `ordermoa_products.purchase_supplier_id`를 추가하는 방향으로 설계한다.
   - RLS, `ordermoa_` 접두사, 교차회사 트리거를 반드시 포함한다.

3. **8b 실사용 DB 저장 실측**
   - 실제 로그인 상태에서 발주 확정 후 F5 새로고침.
   - 주문 목록이 유지되고 Supabase Table Editor에서 `ordermoa_orders`/`ordermoa_order_items` row가 보이면 완료 처리.

4. **8c**
   - 저장된 주문 기반 합산표/거래명세서 재출력.
   - 거래처별 월 합계.
   - `order_imports.raw_text` 저장/삭제 연결.

## 불변 규칙

- `order_items.unit_price`는 확정 시점 스냅샷이다.
- `order_items.amount`는 DB generated 컬럼이므로 insert payload에 넣지 않는다.
- 과거 거래명세서를 `customer_prices` 재조회로 만들지 않는다.
- 예상 마진은 저장하지 않고 표시 시점 참고값으로 계산한다.
- 미매칭/수량 불확실/다중 후보 미확인 라인이 있으면 주문 확정 불가다.
- 원본 실데이터 엑셀, API 키, service role key, `.env.local`은 커밋 금지다.

## 검증 한 세트

코드 변경 후 기본 검증:

```powershell
npm test
cd web
npm test
npm run build
npm audit --audit-level=low
```

UI 변경이면 브라우저 smoke도 함께 본다.

