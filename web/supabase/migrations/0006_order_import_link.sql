-- 오더모아 1차(W09): 발주 원문(order_imports)을 주문과 연결.
-- 기존 ordermoa_order_imports에는 order_id 링크가 없어, "이 주문의 원문"을 특정할 수 없다.
-- order_id 컬럼(+인덱스)과 회사 일치 검사를 추가한다 — 데이터 삭제 없음, RLS는 기존 테이블 단위 정책 그대로.
-- on delete cascade: 주문이 삭제되면 원문도 함께 정리(현재는 soft cancel이라 실제로는 유지됨).

alter table public.ordermoa_order_imports
  add column if not exists order_id uuid references public.ordermoa_orders(id) on delete cascade;

create index if not exists ordermoa_idx_order_imports_order
  on public.ordermoa_order_imports(order_id);

-- 기존 트리거 함수에 order_id 교차 회사 참조 방지를 추가한다.
-- order_id는 기존/구버전 원문 row 호환을 위해 null 허용.
create or replace function public.ordermoa_check_order_imports_company()
returns trigger language plpgsql as $$
begin
  perform public.ordermoa_assert_same_company(NEW.company_id,
    (select company_id from public.ordermoa_customers where id = NEW.customer_id), 'ordermoa_order_imports.customer_id');
  if NEW.order_id is not null then
    perform public.ordermoa_assert_same_company(NEW.company_id,
      (select company_id from public.ordermoa_orders where id = NEW.order_id), 'ordermoa_order_imports.order_id');
  end if;
  return NEW;
end;
$$;
