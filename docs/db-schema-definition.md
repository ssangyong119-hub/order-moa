# 오더모아 DB 스키마 정의서

작성일: 2026-06-29
작성 주체: Claude (단위 2 — DB 스키마)
상위 문서: `docs/function-specification.md`(§7 데이터 객체, §13/§14.1 확정값), `docs/task-prompt-unit-2-db-rls.md`
관련 문서: `docs/supabase-rls-policy.md`(RLS 정책), `docs/web-security-checklist.md`

> 본 문서는 Supabase(PostgreSQL) 기준 **테이블 설계 문서**다. SQL은 **초안(참고용)**이며, 실제 Supabase 적용·마이그레이션 파일 생성은 하지 않는다(별도 단위). RLS 정책은 `supabase-rls-policy.md`에 둔다.

> **[2026-07-07 헌장 정렬]** 차수·범위가 어긋나면 `docs/order-moa-system-meta-prompt.md`(헌장)가 우선한다. 본 문서 이후 확정: **매입처 테이블 `ordermoa_suppliers`(id, company_id, name, memo, created_at, archived_at) + `products.purchase_supplier_id uuid nullable FK`가 1차 보강(8c 전 권장)으로 추가 예정**(additive, Codex 승인 후 마이그레이션 — 헌장 §6.4). RLS 4정책 + 교차 회사 트리거 + unique(company_id, name) 포함 조건. §4.12의 purchase_prices(매입처별 원가 이력)는 그대로 2차.

---

## 1. 문서 목적

- 오더모아 웹 MVP 1차의 **테이블/컬럼/타입/제약/관계**를 확정 가능한 수준으로 정의한다.
- 기능정의서의 데이터 객체(§7)와 DB 설계 전 확정값(§13/§14.1, C1~C5/A~D)을 그대로 반영한다.
- 새 테이블·새 기능을 추가하지 않는다. 후순위 테이블은 명확히 구분한다.

---

## 2. 설계 원칙 (확정값 반영)

- 모든 업무 테이블은 **`company_id uuid NOT NULL`**(FK companies) → RLS로 회사 격리.
- **PK는 `uuid`** (`default gen_random_uuid()`), 시각은 `timestamptz default now()`.
- **금액은 KRW `integer`**, **수량은 `numeric`**.
- **`line_amount = round(quantity × unit_price)`** (원 단위 반올림). `order_items.amount`는 이 규칙의 **생성 컬럼(generated)** 으로 강제.
- **주문/명세서 합계 = 라인 `amount`의 합**(합산 후 반올림 없음).
- **`order_items.unit_price`는 주문 확정 시점의 단가 스냅샷**이다. 확정 후 `customer_prices`가 바뀌어도 과거 주문/거래명세서 금액은 변하지 않는다 → **거래명세서 재출력·거래처별 기간 금액 집계·세금계산서 대조의 기준**(§5.2 기능정의서). 재출력 시 단가를 `customer_prices`에서 다시 조회하지 않는다.
- **예상 마진은 주문에 스냅샷 저장하지 않는다**(1차). 표시 시점에 `products.base_purchase_price`로 계산하는 **참고값**일 뿐이며, 회계 기록이 아니다. 정확 마진은 2차.
- 거래처별 **일/월/년 금액 집계**는 별도 집계 테이블 없이 `orders.order_date`(+`customer_id`)와 `order_items.amount`의 합으로 쿼리한다(1차). 집계 캐시/월정산 테이블은 후순위.
- **`order_items`는 확정 주문 라인만 저장** → `product_id` **NOT NULL**. 파싱 후보/draft는 DB 영구 저장 안 함(화면 + `order_imports.raw_text`).
- **`order_imports.customer_id` NOT NULL**. `raw_text` **기본 저장 ON**, 사용자 삭제 가능(→null).
- **raw_text 삭제가 확정 주문에 영향 없게**: `orders`/`order_items`는 `order_imports`와 **FK로 묶지 않는다**(논리적 파생만). 따라서 raw_text를 null로 지워도 확정 주문은 그대로 유지된다.
- **VAT 계산 없음**(1차). `products.tax_type`은 확장 필드로만 둠.
- **기준 매입단가**는 `products.base_purchase_price integer nullable`(품목당 단일, 선택)로만 둔다 → **예상 마진은 표시용 참고값**(판매단가 − 기준 매입단가). 매입처별/시점별 정밀 원가·재고·정확한 회계 마진은 **2차 별도 테이블**로 분리(§4.12).
- **`delivery_notes` 저장/`note_number` 채번은 후순위/선택**.
- 삭제는 가능한 한 **soft delete**(customers/products=`archived_at`, orders=`status='cancelled'`).
- 모든 **FK 참조는 같은 `company_id` 안에서만** 연결한다(교차 회사 혼입 차단). 강제 방식은 §5.1 / §6.1(트리거) 참조.
- **service role key는 클라이언트 노출 금지**(서버 전용).

### 남은 질문 3개 — 본 문서 확정

| # | 질문 | 확정 |
|---|---|---|
| 1 | `customer_prices.effective_from` | **유지**. 1차는 현재 단가 관리용 **메모성 필드**(단가 이력 테이블은 2차) |
| 2 | `receivables` 생성 시점 | 주문 확정 시 **자동 생성 안 함**. 1차는 **수동 생성 + 수동 status** |
| 3 | `order_items.unit` | **입력 단위 그대로 저장**. `products.base_unit`은 기본값/참고값. 단위 정규화는 2차 |
| 4 | 기준 매입단가 위치 | **`products.base_purchase_price integer nullable`(1차 단순안 채택)**. 예상 마진 표시용 참고값. 매입단가가 거래처/매입처/시점별로 다른 정밀 모델(매입이력·원가이력·재고평가)은 **2차 별도 테이블**(`purchase_prices`/`price_history` 류)로 분리. 1차는 품목당 단일 매입단가 1개로 단순화 |

---

## 3. 테이블 목록

| 테이블 | 1차 MVP | 구분 |
|---|---|---|
| companies | ✅ | 격리 단위 |
| company_members | ✅ | 역할(owner/staff), 1차 owner |
| customers | ✅ | soft delete |
| products | ✅ | tax_type 확장 |
| product_aliases | ✅ | 파싱 매칭 |
| customer_prices | ✅ | 현재 단가 |
| order_imports | ✅ | 붙여넣기 원문/세션 |
| orders | ✅ | 확정 주문 |
| order_items | ✅ | 확정 라인(generated amount) |
| suppliers | 🔶 1차 보강(8c 전 권장, 승인 대기) | 매입처 — 헌장 §6.4, products.purchase_supplier_id FK와 세트 |
| delivery_notes | 🔶 선택/후순위 | 미리보기 우선 |
| receivables | 🔶 수동만 | 자동화 2차 |
| price_history | ⛔ 2차 | 단가 이력 |
| tax_invoice_summaries | ⛔ 2차 | 세금계산서 정리 |

### 3.1 마이그레이션 구분 (Codex 리뷰 반영)

- **1차 필수 마이그레이션 테이블**: companies, company_members, customers, products, product_aliases, customer_prices, order_imports, orders, order_items
- **1차 선택 마이그레이션 테이블**: delivery_notes, receivables
- **2차 제외 테이블**: price_history, tax_invoice_summaries

> 실제 마이그레이션 단위에서 **선택 테이블(delivery_notes, receivables) 포함 여부는 Codex 승인 후 결정**한다. 아래 §6 SQL 초안에는 참고용으로 선택 테이블 CREATE도 두되 "1차 선택"으로 명확히 구분한다.

---

## 4. 테이블별 필드 정의

표기: 타입 / 필수(NOT NULL) / 기본값 / 제약. 모든 PK는 `id uuid PK default gen_random_uuid()`, `created_at timestamptz NOT NULL default now()`(별도 표기 생략 가능).

### 4.1 companies
| 필드 | 타입 | 필수 | 기본값 | 제약/비고 |
|---|---|---|---|---|
| id | uuid | ✅ | gen_random_uuid() | PK |
| name | text | ✅ | | 상호, length 1~200 |
| business_number | text | | null | 사업자번호(선택) |
| owner_user_id | uuid | ✅ | | FK auth.users(id) |
| created_at | timestamptz | ✅ | now() | |
- 인덱스: `idx_companies_owner (owner_user_id)`

### 4.2 company_members
| 필드 | 타입 | 필수 | 기본값 | 제약/비고 |
|---|---|---|---|---|
| id | uuid | ✅ | gen_random_uuid() | PK |
| company_id | uuid | ✅ | | FK companies(id) ON DELETE CASCADE |
| user_id | uuid | ✅ | | FK auth.users(id) |
| role | text | ✅ | 'owner' | CHECK in ('owner','staff') |
| created_at | timestamptz | ✅ | now() | |
- unique: `(company_id, user_id)` / 인덱스: `(user_id)`
- **부트스트랩 주의**: 최초 회사 생성 시 첫 owner 멤버 등록이 RLS상 막힐 수 있어, 회사 생성 + owner 등록을 **단일 서버 RPC/트랜잭션**으로 처리한다(`supabase-rls-policy.md` §4.1 참조).

### 4.3 customers
| 필드 | 타입 | 필수 | 기본값 | 제약/비고 |
|---|---|---|---|---|
| id | uuid | ✅ | gen_random_uuid() | PK |
| company_id | uuid | ✅ | | FK companies(id) ON DELETE CASCADE |
| name | text | ✅ | | 상호, length≥1 |
| phone | text | | null | |
| address | text | | null | |
| memo | text | | null | |
| created_at | timestamptz | ✅ | now() | |
| archived_at | timestamptz | | null | soft delete |
- 인덱스: `(company_id)`, `(company_id, name)`

### 4.4 products
| 필드 | 타입 | 필수 | 기본값 | 제약/비고 |
|---|---|---|---|---|
| id | uuid | ✅ | gen_random_uuid() | PK |
| company_id | uuid | ✅ | | FK companies(id) ON DELETE CASCADE |
| name | text | ✅ | | 품목명, length≥1 |
| base_unit | text | ✅ | | 기본단위(참고/기본값) |
| tax_type | text | ✅ | 'taxable' | CHECK in ('taxable','exempt'). **계산 반영 2차** |
| base_purchase_price | integer | | null | **기준 매입단가(선택, 질문4 확정)** — CHECK (>=0). 예상 마진 표시용 참고값. **정확한 매입이력/원가이력/재고평가는 2차**(별도 테이블) |
| memo | text | | null | |
| created_at | timestamptz | ✅ | now() | |
| archived_at | timestamptz | | null | soft delete |
- 인덱스: `(company_id)`

### 4.5 product_aliases
| 필드 | 타입 | 필수 | 기본값 | 제약/비고 |
|---|---|---|---|---|
| id | uuid | ✅ | gen_random_uuid() | PK |
| company_id | uuid | ✅ | | FK companies(id) ON DELETE CASCADE |
| product_id | uuid | ✅ | | FK products(id) ON DELETE CASCADE |
| alias | text | ✅ | | length≥1 |
- unique: `(company_id, alias)` (회사 내 별칭→단일 품목) / 인덱스: `(product_id)`

### 4.6 customer_prices
| 필드 | 타입 | 필수 | 기본값 | 제약/비고 |
|---|---|---|---|---|
| id | uuid | ✅ | gen_random_uuid() | PK |
| company_id | uuid | ✅ | | FK companies(id) ON DELETE CASCADE |
| customer_id | uuid | ✅ | | FK customers(id) ON DELETE CASCADE |
| product_id | uuid | ✅ | | FK products(id) ON DELETE CASCADE |
| sale_price | integer | ✅ | | CHECK (sale_price >= 0), KRW |
| effective_from | date | | null | **현재 단가 관리용 메모성 필드(질문1 확정)** |
| created_at | timestamptz | ✅ | now() | |
- unique: `(company_id, customer_id, product_id)` (거래처×품목 현재 단가 1행)

### 4.7 order_imports
| 필드 | 타입 | 필수 | 기본값 | 제약/비고 |
|---|---|---|---|---|
| id | uuid | ✅ | gen_random_uuid() | PK |
| company_id | uuid | ✅ | | FK companies(id) ON DELETE CASCADE |
| customer_id | uuid | ✅ | | FK customers(id). **NOT NULL(C4)** |
| source | text | | 'kakao' | 원문 출처 |
| raw_text | text | | null | **기본 저장 ON, 삭제 가능(→null)(C3)**. 민감정보 가능 |
| parsed_at | timestamptz | | null | |
| confirmed_at | timestamptz | | null | 확정 시각 |
| created_by | uuid | ✅ | | FK auth.users(id) |
| created_at | timestamptz | ✅ | now() | |
- 인덱스: `(company_id)`, `(customer_id)`
- 비고: `orders`와 FK로 연결하지 않음 → raw_text 삭제가 확정 주문에 영향 없음.

### 4.8 orders
| 필드 | 타입 | 필수 | 기본값 | 제약/비고 |
|---|---|---|---|---|
| id | uuid | ✅ | gen_random_uuid() | PK |
| company_id | uuid | ✅ | | FK companies(id) ON DELETE CASCADE |
| customer_id | uuid | ✅ | | FK customers(id) |
| order_date | date | ✅ | current_date | |
| source | text | | null | kakao/sms/phone 등 |
| status | text | ✅ | 'confirmed' | CHECK in ('draft','confirmed','cancelled'). **1차는 confirmed/cancelled만 사용** |
| memo | text | | null | |
| created_at | timestamptz | ✅ | now() | |
- 인덱스: `(company_id, order_date)`, `(customer_id)`
- 비고: 1차는 확정 시점에 생성(draft 주문 미저장). 취소는 `status='cancelled'`(soft).

### 4.9 order_items
| 필드 | 타입 | 필수 | 기본값 | 제약/비고 |
|---|---|---|---|---|
| id | uuid | ✅ | gen_random_uuid() | PK |
| company_id | uuid | ✅ | | FK companies(id) ON DELETE CASCADE |
| order_id | uuid | ✅ | | FK orders(id) ON DELETE CASCADE |
| product_id | uuid | ✅ | | FK products(id). **NOT NULL(A): 확정 라인만 저장** |
| raw_name | text | | null | 원문 토막(참고) |
| quantity | numeric | ✅ | | CHECK (quantity > 0) |
| unit | text | | null | **입력 단위 그대로 저장(질문3 확정)** |
| unit_price | integer | ✅ | 0 | CHECK (unit_price >= 0), KRW |
| amount | integer | ✅ | (generated) | **GENERATED `round(quantity*unit_price)`**(B). |
- 인덱스: `(order_id)`, `(company_id, product_id)`(합산표)
- 비고: 파싱 후보/draft 라인은 저장하지 않음. 모든 행은 확정 라인.

### 4.10 delivery_notes — 🔶 선택/후순위
| 필드 | 타입 | 필수 | 기본값 | 제약/비고 |
|---|---|---|---|---|
| id | uuid | ✅ | gen_random_uuid() | PK |
| company_id | uuid | ✅ | | FK companies(id) ON DELETE CASCADE |
| order_id | uuid | ✅ | | FK orders(id) ON DELETE CASCADE |
| note_number | text | | null | **1차 자동 채번 불필요(D)** |
| issued_at | timestamptz | | null | |
| total_amount | integer | ✅ | 0 | **공급가 합계 = Σ order_items.amount, VAT 미포함(1차)** |
| memo | text | | null | |
- 비고: 1차는 주문 기반 미리보기/인쇄 우선. 저장형 명세서·채번은 후순위.

### 4.11 receivables — 🔶 수동만
| 필드 | 타입 | 필수 | 기본값 | 제약/비고 |
|---|---|---|---|---|
| id | uuid | ✅ | gen_random_uuid() | PK |
| company_id | uuid | ✅ | | FK companies(id) ON DELETE CASCADE |
| customer_id | uuid | ✅ | | FK customers(id) |
| order_id | uuid | | null | FK orders(id) ON DELETE SET NULL |
| amount | integer | ✅ | 0 | KRW |
| paid_amount | integer | ✅ | 0 | KRW, CHECK (paid_amount >= 0) |
| status | text | ✅ | 'unpaid' | CHECK in ('unpaid','partial','paid'). **수동(질문2 확정)** |
| due_date | date | | null | |
| paid_at | timestamptz | | null | |
- 비고: **주문 확정 시 자동 생성 안 함**. 사용자가 수동 생성·수동 status. 자동 매칭/알림 2차.

### 4.12 후순위(2차) 테이블 — 스키마 여지만

- **price_history**: `id, company_id, customer_id, product_id, old_price int, new_price int, changed_at timestamptz, changed_by uuid`. 단가 변경 감사/이력. (1차 미생성)
- **purchase_prices / cost_history(가칭)**: 매입처별·매입일별 원가, 재고 평가 등 **정확한 원가 모델**. 1차 `products.base_purchase_price`(단일 참고값)를 대체/확장. **정확한 회계 마진 계산의 근거**가 되는 2차 테이블. (1차 미생성)
- **tax_invoice_summaries**: `id, company_id, customer_id, year_month text, sales_total int, issued_amount int, gap int`. 월·거래처 매출/발행 정리. (1차 미생성, 직접 발행 아님)

---

## 5. 관계 요약

```
auth.users 1─N company_members N─1 companies
companies 1─N {customers, products, product_aliases, customer_prices,
               order_imports, orders, order_items, delivery_notes, receivables}
customers 1─N {customer_prices, orders, order_imports, receivables}
products  1─N {product_aliases, customer_prices, order_items}
orders    1─N order_items
orders    1─N delivery_notes (선택)
order_imports  —(FK 없음, 논리적 파생)→ orders
```

### 5.1 교차 회사 FK 무결성 (Codex 리뷰 반영)

RLS는 각 행의 `company_id`가 내 회사인지만 강제한다. 그러나 행이 **참조하는** `customer_id`/`product_id`/`order_id`가 같은 회사 소속인지는 RLS만으로 보장되지 않는다(교차 회사 데이터 혼입 위험). 따라서 다음 **동일 `company_id` 규칙**을 DB에서 강제한다.

- `customer_prices.company_id = customers.company_id = products.company_id`
- `product_aliases.company_id = products.company_id`
- `orders.company_id = customers.company_id`
- `order_items.company_id = orders.company_id = products.company_id`
- `delivery_notes.company_id = orders.company_id`
- `receivables.company_id = customers.company_id`, `order_id`가 있으면 `= orders.company_id`

강제 방식(택1):
- **A. 복합 unique + 복합 FK**: 부모에 `unique(id, company_id)`를 두고 자식 FK를 `(parent_id, company_id) references parent(id, company_id)`로 건다. 가장 강하지만 컬럼/제약이 늘어난다.
- **B. 트리거 검증(권장)**: insert/update 시 참조 행의 `company_id`가 본인 `company_id`와 같은지 트리거로 확인. MVP에서 문서상 가장 명확.
- **C. 앱 레벨 검증 + DB 트리거 보강**: 서버 액션에서 1차 검증 + B 트리거로 최종 방어.

→ **1차 MVP 채택: B(트리거 검증)**. SQL 초안은 §6.1 참조. (A는 2차 강화 옵션, C는 운영 보강.)

---

## 6. SQL 초안 (참고용 — 적용/마이그레이션 아님)

> 아래는 설계 검토용 초안이다. 실제 적용·마이그레이션은 별도 단위. RLS 활성화/정책은 `supabase-rls-policy.md` 참조. **delivery_notes·receivables는 "1차 선택"(§3.1)** 이며 마이그레이션 포함 여부는 Codex 승인 후 결정한다. 교차 회사 무결성 트리거는 §6.1 참조.

```sql
-- 확장(필요 시): pgcrypto 또는 gen_random_uuid (Supabase 기본 제공)

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  business_number text,
  owner_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index idx_companies_owner on public.companies(owner_user_id);

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null default 'owner' check (role in ('owner','staff')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);
create index idx_company_members_user on public.company_members(user_id);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(name) >= 1),
  phone text,
  address text,
  memo text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index idx_customers_company on public.customers(company_id);
create index idx_customers_company_name on public.customers(company_id, name);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(name) >= 1),
  base_unit text not null,
  tax_type text not null default 'taxable' check (tax_type in ('taxable','exempt')),
  base_purchase_price integer check (base_purchase_price >= 0), -- 질문4: 기준 매입단가(선택), 예상 마진 표시용 참고값. 정밀 원가는 2차
  memo text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index idx_products_company on public.products(company_id);

create table public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  alias text not null check (char_length(alias) >= 1),
  unique (company_id, alias)
);
create index idx_product_aliases_product on public.product_aliases(product_id);

create table public.customer_prices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sale_price integer not null check (sale_price >= 0),
  effective_from date, -- 1차: 현재 단가 메모성 필드
  created_at timestamptz not null default now(),
  unique (company_id, customer_id, product_id)
);

create table public.order_imports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id), -- C4: NOT NULL
  source text default 'kakao',
  raw_text text,            -- C3: 기본 저장 ON, 삭제 시 null
  parsed_at timestamptz,
  confirmed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index idx_order_imports_company on public.order_imports(company_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  order_date date not null default current_date,
  source text,
  status text not null default 'confirmed' check (status in ('draft','confirmed','cancelled')),
  memo text,
  created_at timestamptz not null default now()
);
create index idx_orders_company_date on public.orders(company_id, order_date);
create index idx_orders_customer on public.orders(customer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id), -- A: 확정 라인만, NOT NULL
  raw_name text,
  quantity numeric not null check (quantity > 0),
  unit text,            -- 질문3: 입력 단위 그대로
  unit_price integer not null default 0 check (unit_price >= 0),
  -- B: line_amount = round(quantity * unit_price), 생성 컬럼으로 강제
  amount integer not null generated always as (round(quantity * unit_price)::integer) stored
);
create index idx_order_items_order on public.order_items(order_id);
create index idx_order_items_company_product on public.order_items(company_id, product_id);

-- 1차 선택 테이블 (마이그레이션 포함 여부는 Codex 승인 후 결정)
create table public.delivery_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  note_number text,           -- D: 1차 자동 채번 불필요
  issued_at timestamptz,
  total_amount integer not null default 0, -- Σ order_items.amount, VAT 미포함
  memo text
);

-- 1차 선택 테이블 (수동, 마이그레이션 포함 여부는 Codex 승인 후 결정)
create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  order_id uuid references public.orders(id) on delete set null,
  amount integer not null default 0,
  paid_amount integer not null default 0 check (paid_amount >= 0),
  status text not null default 'unpaid' check (status in ('unpaid','partial','paid')),
  due_date date,
  paid_at timestamptz
);
```

> 비고: `amount` 생성 컬럼이 환경상 제약되면, 앱에서 `round(quantity*unit_price)` 계산 후 저장하고 `CHECK`로 보강하는 대안을 둔다(동일 규칙). VAT 컬럼은 1차에 두지 않는다.

### 6.1 교차 회사 무결성 트리거 초안 (방식 B, 참고용)

참조하는 행의 `company_id`가 본인 `company_id`와 같은지 insert/update 시 검증한다. 아래는 형태 예시이며 적용/마이그레이션이 아니다(테이블별 참조 컬럼에 맞춰 작성).

```sql
-- order_items: product_id / order_id 가 같은 회사인지 검증
create or replace function public.check_order_items_company()
returns trigger language plpgsql as $$
declare ref_company uuid;
begin
  select company_id into ref_company from public.products where id = NEW.product_id;
  if ref_company is null or ref_company <> NEW.company_id then
    raise exception 'cross-company product_id (order_items)';
  end if;
  select company_id into ref_company from public.orders where id = NEW.order_id;
  if ref_company is null or ref_company <> NEW.company_id then
    raise exception 'cross-company order_id (order_items)';
  end if;
  return NEW;
end;
$$;
create trigger trg_order_items_company
  before insert or update on public.order_items
  for each row execute function public.check_order_items_company();

-- 동일 패턴으로 아래 테이블에도 참조별 검증 트리거를 둔다:
--  customer_prices : customer_id, product_id 의 company_id 일치
--  product_aliases : product_id 의 company_id 일치
--  orders          : customer_id 의 company_id 일치
--  delivery_notes  : order_id 의 company_id 일치
--  receivables     : customer_id (그리고 order_id가 있으면 order) 의 company_id 일치
```

> 대안 A(복합 unique+복합 FK)는 부모에 `unique(id, company_id)`를 두고 자식을 `(parent_id, company_id)`로 참조해 DB 제약만으로 강제할 수 있다. 1차는 B(트리거)로 문서화한다.

---

## 7. 다음 산출물

- `docs/supabase-rls-policy.md` — RLS 정책 + 검증 시나리오(본 스키마 기준)
- 이후: 화면 설계서 / API·Server Action 정의서 / 구현 작업지시서

> 비고: 본 문서는 설계 초안이며 Supabase 적용·마이그레이션 파일은 만들지 않았다. 설문 5건 한계 전제는 유지된다.
