-- 오더모아 단위 8a — RLS 정책
-- 근거: docs/supabase-rls-policy.md §3/§4.1/§5/§8
-- 회사 격리: 로그인 사용자가 자기 회사 데이터에만 접근. 비로그인은 전면 차단.

-- security definer 헬퍼 (정책 재귀 회피)
create or replace function public.is_company_member(cid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = cid and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_company_owner(cid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = cid and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- 전 테이블 RLS 활성화
alter table public.companies        enable row level security;
alter table public.company_members  enable row level security;
alter table public.customers        enable row level security;
alter table public.products         enable row level security;
alter table public.product_aliases  enable row level security;
alter table public.customer_prices  enable row level security;
alter table public.order_imports    enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;

-- companies
create policy companies_select on public.companies
  for select using (public.is_company_member(id) or owner_user_id = auth.uid());
create policy companies_insert on public.companies
  for insert with check (owner_user_id = auth.uid());
create policy companies_update on public.companies
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
-- delete 정책 없음 → 1차 삭제 불가

-- company_members (조회는 멤버, 관리는 owner + 최초 owner 부트스트랩 예외 §4.1)
create policy members_select on public.company_members
  for select using (public.is_company_member(company_id));
create policy members_insert on public.company_members
  for insert with check (
    public.is_company_owner(company_id)
    or (
      user_id = auth.uid() and role = 'owner'
      and exists (select 1 from public.companies c
                  where c.id = company_id and c.owner_user_id = auth.uid())
    )
  );
create policy members_update on public.company_members
  for update using (public.is_company_owner(company_id))
              with check (public.is_company_owner(company_id));
create policy members_delete on public.company_members
  for delete using (public.is_company_owner(company_id));

-- 표준 멤버 테이블 4정책 (company_id 기준). orders는 delete 생략.
-- customers
create policy customers_select on public.customers for select using (public.is_company_member(company_id));
create policy customers_insert on public.customers for insert with check (public.is_company_member(company_id));
create policy customers_update on public.customers for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy customers_delete on public.customers for delete using (public.is_company_member(company_id));

-- products
create policy products_select on public.products for select using (public.is_company_member(company_id));
create policy products_insert on public.products for insert with check (public.is_company_member(company_id));
create policy products_update on public.products for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy products_delete on public.products for delete using (public.is_company_member(company_id));

-- product_aliases
create policy product_aliases_select on public.product_aliases for select using (public.is_company_member(company_id));
create policy product_aliases_insert on public.product_aliases for insert with check (public.is_company_member(company_id));
create policy product_aliases_update on public.product_aliases for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy product_aliases_delete on public.product_aliases for delete using (public.is_company_member(company_id));

-- customer_prices
create policy customer_prices_select on public.customer_prices for select using (public.is_company_member(company_id));
create policy customer_prices_insert on public.customer_prices for insert with check (public.is_company_member(company_id));
create policy customer_prices_update on public.customer_prices for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy customer_prices_delete on public.customer_prices for delete using (public.is_company_member(company_id));

-- order_imports (update가 raw_text→null 삭제를 처리)
create policy order_imports_select on public.order_imports for select using (public.is_company_member(company_id));
create policy order_imports_insert on public.order_imports for insert with check (public.is_company_member(company_id));
create policy order_imports_update on public.order_imports for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy order_imports_delete on public.order_imports for delete using (public.is_company_member(company_id));

-- orders (delete 생략: 취소는 status='cancelled' update)
create policy orders_select on public.orders for select using (public.is_company_member(company_id));
create policy orders_insert on public.orders for insert with check (public.is_company_member(company_id));
create policy orders_update on public.orders for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

-- order_items
create policy order_items_select on public.order_items for select using (public.is_company_member(company_id));
create policy order_items_insert on public.order_items for insert with check (public.is_company_member(company_id));
create policy order_items_update on public.order_items for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy order_items_delete on public.order_items for delete using (public.is_company_member(company_id));
