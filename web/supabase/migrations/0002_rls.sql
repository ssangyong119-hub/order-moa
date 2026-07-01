-- 오더모아 단위 8a — RLS 정책 (공유 Supabase 프로젝트용)
-- 근거: docs/supabase-rls-policy.md §3/§4.1/§5/§8
-- 공유 프로젝트 충돌 방지: 오더모아 객체/헬퍼/정책에 `ordermoa_` 접두사.
-- 회사 격리: 로그인 사용자가 자기 회사 데이터에만 접근. 비로그인은 전면 차단.

-- security definer 헬퍼 (정책 재귀 회피)
create or replace function public.ordermoa_is_company_member(cid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.ordermoa_company_members m
    where m.company_id = cid and m.user_id = auth.uid()
  );
$$;

create or replace function public.ordermoa_is_company_owner(cid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.ordermoa_company_members m
    where m.company_id = cid and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- 전 테이블 RLS 활성화
alter table public.ordermoa_companies        enable row level security;
alter table public.ordermoa_company_members  enable row level security;
alter table public.ordermoa_customers        enable row level security;
alter table public.ordermoa_products         enable row level security;
alter table public.ordermoa_product_aliases  enable row level security;
alter table public.ordermoa_customer_prices  enable row level security;
alter table public.ordermoa_order_imports    enable row level security;
alter table public.ordermoa_orders           enable row level security;
alter table public.ordermoa_order_items      enable row level security;

-- ordermoa_companies
create policy ordermoa_companies_select on public.ordermoa_companies
  for select using (public.ordermoa_is_company_member(id) or owner_user_id = auth.uid());
create policy ordermoa_companies_insert on public.ordermoa_companies
  for insert with check (owner_user_id = auth.uid());
create policy ordermoa_companies_update on public.ordermoa_companies
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
-- delete 정책 없음 → 1차 삭제 불가

-- ordermoa_company_members (조회는 멤버, 관리는 owner + 최초 owner 부트스트랩 예외 §4.1)
create policy ordermoa_members_select on public.ordermoa_company_members
  for select using (public.ordermoa_is_company_member(company_id));
create policy ordermoa_members_insert on public.ordermoa_company_members
  for insert with check (
    public.ordermoa_is_company_owner(company_id)
    or (
      user_id = auth.uid() and role = 'owner'
      and exists (select 1 from public.ordermoa_companies c
                  where c.id = company_id and c.owner_user_id = auth.uid())
    )
  );
create policy ordermoa_members_update on public.ordermoa_company_members
  for update using (public.ordermoa_is_company_owner(company_id))
              with check (public.ordermoa_is_company_owner(company_id));
create policy ordermoa_members_delete on public.ordermoa_company_members
  for delete using (public.ordermoa_is_company_owner(company_id));

-- 표준 멤버 테이블 4정책 (company_id 기준). orders는 delete 생략.
-- ordermoa_customers
create policy ordermoa_customers_select on public.ordermoa_customers for select using (public.ordermoa_is_company_member(company_id));
create policy ordermoa_customers_insert on public.ordermoa_customers for insert with check (public.ordermoa_is_company_member(company_id));
create policy ordermoa_customers_update on public.ordermoa_customers for update using (public.ordermoa_is_company_member(company_id)) with check (public.ordermoa_is_company_member(company_id));
create policy ordermoa_customers_delete on public.ordermoa_customers for delete using (public.ordermoa_is_company_member(company_id));

-- ordermoa_products
create policy ordermoa_products_select on public.ordermoa_products for select using (public.ordermoa_is_company_member(company_id));
create policy ordermoa_products_insert on public.ordermoa_products for insert with check (public.ordermoa_is_company_member(company_id));
create policy ordermoa_products_update on public.ordermoa_products for update using (public.ordermoa_is_company_member(company_id)) with check (public.ordermoa_is_company_member(company_id));
create policy ordermoa_products_delete on public.ordermoa_products for delete using (public.ordermoa_is_company_member(company_id));

-- ordermoa_product_aliases
create policy ordermoa_product_aliases_select on public.ordermoa_product_aliases for select using (public.ordermoa_is_company_member(company_id));
create policy ordermoa_product_aliases_insert on public.ordermoa_product_aliases for insert with check (public.ordermoa_is_company_member(company_id));
create policy ordermoa_product_aliases_update on public.ordermoa_product_aliases for update using (public.ordermoa_is_company_member(company_id)) with check (public.ordermoa_is_company_member(company_id));
create policy ordermoa_product_aliases_delete on public.ordermoa_product_aliases for delete using (public.ordermoa_is_company_member(company_id));

-- ordermoa_customer_prices
create policy ordermoa_customer_prices_select on public.ordermoa_customer_prices for select using (public.ordermoa_is_company_member(company_id));
create policy ordermoa_customer_prices_insert on public.ordermoa_customer_prices for insert with check (public.ordermoa_is_company_member(company_id));
create policy ordermoa_customer_prices_update on public.ordermoa_customer_prices for update using (public.ordermoa_is_company_member(company_id)) with check (public.ordermoa_is_company_member(company_id));
create policy ordermoa_customer_prices_delete on public.ordermoa_customer_prices for delete using (public.ordermoa_is_company_member(company_id));

-- ordermoa_order_imports (update가 raw_text→null 삭제를 처리)
create policy ordermoa_order_imports_select on public.ordermoa_order_imports for select using (public.ordermoa_is_company_member(company_id));
create policy ordermoa_order_imports_insert on public.ordermoa_order_imports for insert with check (public.ordermoa_is_company_member(company_id));
create policy ordermoa_order_imports_update on public.ordermoa_order_imports for update using (public.ordermoa_is_company_member(company_id)) with check (public.ordermoa_is_company_member(company_id));
create policy ordermoa_order_imports_delete on public.ordermoa_order_imports for delete using (public.ordermoa_is_company_member(company_id));

-- ordermoa_orders (delete 생략: 취소는 status='cancelled' update)
create policy ordermoa_orders_select on public.ordermoa_orders for select using (public.ordermoa_is_company_member(company_id));
create policy ordermoa_orders_insert on public.ordermoa_orders for insert with check (public.ordermoa_is_company_member(company_id));
create policy ordermoa_orders_update on public.ordermoa_orders for update using (public.ordermoa_is_company_member(company_id)) with check (public.ordermoa_is_company_member(company_id));

-- ordermoa_order_items
create policy ordermoa_order_items_select on public.ordermoa_order_items for select using (public.ordermoa_is_company_member(company_id));
create policy ordermoa_order_items_insert on public.ordermoa_order_items for insert with check (public.ordermoa_is_company_member(company_id));
create policy ordermoa_order_items_update on public.ordermoa_order_items for update using (public.ordermoa_is_company_member(company_id)) with check (public.ordermoa_is_company_member(company_id));
create policy ordermoa_order_items_delete on public.ordermoa_order_items for delete using (public.ordermoa_is_company_member(company_id));
