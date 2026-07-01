-- 오더모아 단위 8a — 1차 필수 테이블 스키마
-- 근거: docs/db-schema-definition.md §4/§6 (확정값 C1~C5/A~D)
-- 적용은 Supabase 프로젝트에서 별도 수행. 이 파일은 마이그레이션 소스.
-- 범위(8a): companies, company_members, customers, products, product_aliases,
--           customer_prices, order_imports, orders, order_items
-- 제외(후순위): delivery_notes, receivables, price_history, tax_invoice_summaries

-- Supabase는 gen_random_uuid() 기본 제공(pgcrypto). 필요 시:
-- create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  business_number text,
  owner_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_companies_owner on public.companies(owner_user_id);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null default 'owner' check (role in ('owner','staff')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);
create index if not exists idx_company_members_user on public.company_members(user_id);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(name) >= 1),
  phone text,
  address text,
  memo text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists idx_customers_company on public.customers(company_id);
create index if not exists idx_customers_company_name on public.customers(company_id, name);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(name) >= 1),
  base_unit text not null,
  tax_type text not null default 'taxable' check (tax_type in ('taxable','exempt')),
  base_purchase_price integer check (base_purchase_price >= 0), -- 기준 매입단가(선택, 예상 마진 표시용 참고값)
  memo text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists idx_products_company on public.products(company_id);

create table if not exists public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  alias text not null check (char_length(alias) >= 1),
  unique (company_id, alias)
);
create index if not exists idx_product_aliases_product on public.product_aliases(product_id);

create table if not exists public.customer_prices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sale_price integer not null check (sale_price >= 0),
  effective_from date, -- 1차: 현재 단가 메모성 필드
  created_at timestamptz not null default now(),
  unique (company_id, customer_id, product_id)
);

create table if not exists public.order_imports (
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
create index if not exists idx_order_imports_company on public.order_imports(company_id);
create index if not exists idx_order_imports_customer on public.order_imports(customer_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  order_date date not null default current_date,
  source text,
  status text not null default 'confirmed' check (status in ('draft','confirmed','cancelled')),
  memo text,
  created_at timestamptz not null default now()
);
create index if not exists idx_orders_company_date on public.orders(company_id, order_date);
create index if not exists idx_orders_customer on public.orders(customer_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id), -- A: 확정 라인만, NOT NULL
  raw_name text,
  quantity numeric not null check (quantity > 0),
  unit text,                                    -- 입력 단위 그대로
  unit_price integer not null default 0 check (unit_price >= 0), -- 확정 시점 스냅샷
  -- B: line_amount = round(quantity * unit_price), 생성 컬럼으로 강제
  amount integer not null generated always as (round(quantity * unit_price)::integer) stored
);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_company_product on public.order_items(company_id, product_id);

-- 교차 회사 참조 무결성 (db-schema §5.1/§6.1, 방식 B: 트리거)
-- 참조하는 행의 company_id가 본인 company_id와 같은지 검증한다.
create or replace function public.assert_same_company(child_company uuid, parent_company uuid, label text)
returns void language plpgsql as $$
begin
  if parent_company is null or parent_company <> child_company then
    raise exception 'cross-company reference (%)', label;
  end if;
end;
$$;

create or replace function public.check_product_aliases_company()
returns trigger language plpgsql as $$
begin
  perform public.assert_same_company(NEW.company_id,
    (select company_id from public.products where id = NEW.product_id), 'product_aliases.product_id');
  return NEW;
end;
$$;
create trigger trg_product_aliases_company
  before insert or update on public.product_aliases
  for each row execute function public.check_product_aliases_company();

create or replace function public.check_customer_prices_company()
returns trigger language plpgsql as $$
begin
  perform public.assert_same_company(NEW.company_id,
    (select company_id from public.customers where id = NEW.customer_id), 'customer_prices.customer_id');
  perform public.assert_same_company(NEW.company_id,
    (select company_id from public.products where id = NEW.product_id), 'customer_prices.product_id');
  return NEW;
end;
$$;
create trigger trg_customer_prices_company
  before insert or update on public.customer_prices
  for each row execute function public.check_customer_prices_company();

create or replace function public.check_order_imports_company()
returns trigger language plpgsql as $$
begin
  perform public.assert_same_company(NEW.company_id,
    (select company_id from public.customers where id = NEW.customer_id), 'order_imports.customer_id');
  return NEW;
end;
$$;
create trigger trg_order_imports_company
  before insert or update on public.order_imports
  for each row execute function public.check_order_imports_company();

create or replace function public.check_orders_company()
returns trigger language plpgsql as $$
begin
  perform public.assert_same_company(NEW.company_id,
    (select company_id from public.customers where id = NEW.customer_id), 'orders.customer_id');
  return NEW;
end;
$$;
create trigger trg_orders_company
  before insert or update on public.orders
  for each row execute function public.check_orders_company();

create or replace function public.check_order_items_company()
returns trigger language plpgsql as $$
begin
  perform public.assert_same_company(NEW.company_id,
    (select company_id from public.products where id = NEW.product_id), 'order_items.product_id');
  perform public.assert_same_company(NEW.company_id,
    (select company_id from public.orders where id = NEW.order_id), 'order_items.order_id');
  return NEW;
end;
$$;
create trigger trg_order_items_company
  before insert or update on public.order_items
  for each row execute function public.check_order_items_company();
