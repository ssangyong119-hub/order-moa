-- 오더모아 1차 보강(W05): 매입처 DB화.
-- 기존 양산 재고 프로젝트와 충돌하지 않도록 모든 public 객체는 ordermoa_ 접두사를 유지한다.

create table public.ordermoa_suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.ordermoa_companies(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  memo text,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (company_id, name)
);

create index ordermoa_idx_suppliers_company on public.ordermoa_suppliers(company_id);
create index ordermoa_idx_suppliers_company_name on public.ordermoa_suppliers(company_id, name);

alter table public.ordermoa_products
  add column purchase_supplier_id uuid references public.ordermoa_suppliers(id);

create index ordermoa_idx_products_purchase_supplier
  on public.ordermoa_products(company_id, purchase_supplier_id);

create or replace function public.ordermoa_check_products_supplier_company()
returns trigger language plpgsql as $$
begin
  if NEW.purchase_supplier_id is not null then
    perform public.ordermoa_assert_same_company(
      NEW.company_id,
      (select company_id from public.ordermoa_suppliers where id = NEW.purchase_supplier_id),
      'ordermoa_products.purchase_supplier_id'
    );
  end if;
  return NEW;
end;
$$;

create trigger ordermoa_trg_products_supplier_company
  before insert or update on public.ordermoa_products
  for each row execute function public.ordermoa_check_products_supplier_company();

alter table public.ordermoa_suppliers enable row level security;

create policy ordermoa_suppliers_select on public.ordermoa_suppliers
  for select using (public.ordermoa_is_company_member(company_id));
create policy ordermoa_suppliers_insert on public.ordermoa_suppliers
  for insert with check (public.ordermoa_is_company_member(company_id));
create policy ordermoa_suppliers_update on public.ordermoa_suppliers
  for update using (public.ordermoa_is_company_member(company_id))
  with check (public.ordermoa_is_company_member(company_id));
create policy ordermoa_suppliers_delete on public.ordermoa_suppliers
  for delete using (public.ordermoa_is_company_member(company_id));
