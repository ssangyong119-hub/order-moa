# 오더모아 웹 아키텍처 옵션

작성일: 2026-06-06

## 1. 권장 결론

웹 MVP 권장 스택:

- Frontend/Backend: Next.js
- DB/Auth/Storage: Supabase
- Hosting: Vercel
- Language: TypeScript
- UI: Tailwind CSS 또는 shadcn/ui
- Test: Vitest 또는 Playwright

추천 이유:

- 작은 팀/개인 개발자가 빠르게 만들 수 있다.
- 로그인, DB, 파일 저장, 배포를 빠르게 붙일 수 있다.
- PostgreSQL 기반이라 ERP성 데이터 모델에 적합하다.
- Supabase Row Level Security로 회사별 데이터 격리를 설계할 수 있다.
- Vercel은 Next.js 배포가 빠르다.

## 2. 옵션 A: Next.js + Supabase + Vercel

구성:

```text
Browser
→ Next.js App Router
→ Server Actions / Route Handlers
→ Supabase Auth
→ Supabase Postgres
→ Supabase Storage
```

장점:

- MVP 속도가 빠르다.
- 인증과 DB를 직접 구축하지 않아도 된다.
- PostgreSQL이라 거래처/품목/단가/주문/정산 관계형 모델에 맞다.
- Vercel 배포가 간단하다.
- 나중에 모바일 웹 앱으로 확장하기 쉽다.

단점:

- Supabase/Vercel에 종속된다.
- RLS 정책을 잘못 작성하면 데이터 노출 위험이 있다.
- 대량 OCR/파일 처리에는 별도 백엔드가 필요할 수 있다.

적합도:

- MVP 1차에 가장 적합.

## 3. 옵션 B: React SPA + Express API + PostgreSQL

구성:

```text
Browser
→ React SPA
→ Express/NestJS API
→ PostgreSQL
→ S3-compatible Storage
```

장점:

- 백엔드 구조를 직접 통제하기 쉽다.
- 장기적으로 큰 서비스에는 명확하다.
- 외부 연동/배치/OCR 서버를 붙이기 좋다.

단점:

- 초기 구축 비용이 높다.
- 인증/권한/배포/DB 운영을 더 많이 직접 해야 한다.
- MVP 검증 속도가 느려질 수 있다.

적합도:

- MVP 검증 이후 2차 확장에 적합.

## 4. 옵션 C: Supabase 단독 + 정적 프론트

구성:

```text
Browser
→ Static React/Vite
→ Supabase Client
→ Supabase Postgres/Auth
```

장점:

- 구조가 단순하다.
- 배포가 쉽다.
- 로컬 정적 MVP에서 전환하기 쉽다.

단점:

- 서버 전용 로직을 넣기 어렵다.
- 민감한 업무 로직을 클라이언트에 많이 둘 위험이 있다.
- 추후 OCR/정산/외부 API 연동에 약하다.

적합도:

- 아주 빠른 프로토타입에는 가능하지만, 오더모아 웹 MVP에는 Next.js가 더 낫다.

## 5. 추천 데이터 모델

초기 테이블:

```text
companies
company_members
customers
products
product_aliases
customer_prices
price_history
orders
order_items
order_imports
delivery_notes
receivables
```

### companies

- id
- name
- owner_user_id
- business_number
- created_at

### company_members

- id
- company_id
- user_id
- role
- created_at

### customers

- id
- company_id
- name
- phone
- address
- memo
- created_at
- archived_at

### products

- id
- company_id
- name
- base_unit
- tax_type
- memo
- created_at
- archived_at

### product_aliases

- id
- company_id
- product_id
- alias

### customer_prices

- id
- company_id
- customer_id
- product_id
- sale_price
- effective_from
- memo

### price_history

- id
- company_id
- customer_id
- product_id
- old_price
- new_price
- changed_at
- changed_by

### orders

- id
- company_id
- customer_id
- order_date
- source
- status
- memo
- created_at

### order_items

- id
- company_id
- order_id
- product_id
- raw_name
- quantity
- unit
- unit_price
- amount
- parse_confidence
- confirmed

### order_imports

- id
- company_id
- source
- raw_text
- parsed_at
- confirmed_at
- created_by

### delivery_notes

- id
- company_id
- order_id
- note_number
- issued_at
- total_amount
- memo

### receivables

- id
- company_id
- customer_id
- order_id
- amount
- paid_amount
- status
- due_date
- paid_at

## 6. 발주 파싱 구조

MVP 1차는 AI 없이 규칙 기반 + 사람 확인으로 시작한다.

흐름:

```text
사용자가 카톡/문자 발주 붙여넣기
→ 줄 단위 분리
→ 숫자/단위 후보 추출
→ 품목 별칭 후보 매칭
→ 확인 화면에서 사람이 수정
→ 주문 확정
→ 합산표/거래명세서 생성
```

초기 파싱 예:

```text
콩나물 2박스
두부 3판
미나리 5단
```

복잡한 입력:

```text
콩 2, 두부 세개, 저번 양파 말고 큰거
```

처리:

- 완전 자동 확정하지 않는다.
- 후보로 표시하고 사용자 확인을 요구한다.

## 7. API/서버 기능 구분

Server Actions 적합:

- 거래처 생성/수정
- 품목 생성/수정
- 단가 저장
- 주문 확정

Route Handlers 적합:

- CSV/Excel export
- 추후 OCR webhook
- 추후 외부 API 연동
- 파일 다운로드

클라이언트 컴포넌트 적합:

- 붙여넣기 파싱 UI
- 주문 항목 편집 테이블
- 합산표 필터/정렬

## 8. 구현 가능성 판단

MVP 1차 구현 가능성:

- 높음.

예상 난도:

- 로그인/회사 생성: 중
- 거래처/품목/단가 CRUD: 하
- 붙여넣기 파싱: 중
- 주문 확인 UI: 중
- 합산표: 하
- 거래명세서 미리보기: 중
- 엑셀 내보내기: 중
- RLS 정책: 중상

가장 큰 리스크:

- 사용자가 초기 거래처/품목/단가 등록을 귀찮아할 수 있다.
- 발주 파싱이 애매하면 오히려 수작업보다 답답할 수 있다.
- RLS/권한을 대충 만들면 웹 서비스로 위험하다.

## 9. 기술 검증 체크포인트

스파이크 1:

- Supabase Auth 로그인
- 회사 생성
- 회사별 거래처 조회
- RLS로 타 회사 데이터 접근 차단

스파이크 2:

- 카톡 발주 텍스트 붙여넣기
- 품목 별칭 매칭
- 사용자가 확인 후 주문 저장

스파이크 3:

- 주문 여러 건에서 품목별 합산표 생성
- 거래처별 거래명세서 미리보기

스파이크 4:

- CSV/Excel 내보내기
- 모바일 화면 확인

각 스파이크가 통과하면 웹 MVP 구현 가능하다고 판단한다.

## 10. 공식 자료 근거

참고한 공식 문서:

- Supabase Docs: https://supabase.com/docs
- Supabase User Management/RLS 안내: https://supabase.com/docs/guides/auth/managing-user-data
- Next.js App Router Docs: https://nextjs.org/docs/app
- Next.js Backend for Frontend guide: https://nextjs.org/docs/app/guides/backend-for-frontend
- Vercel Environment Variables: https://vercel.com/docs/projects/environment-variables

