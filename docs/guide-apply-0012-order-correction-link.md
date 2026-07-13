# 0012 확정 주문 정정 링크 - 적용 가이드

대상 파일: `web/supabase/migrations/0012_order_correction_link.sql`

상태: **미적용. 사용자만 Supabase SQL Editor에서 실행한다.** 이 문서는 적용 전 앱 코드를 배포해도 된다. 적용 전에는 앱이 컬럼 폴백으로 기존 주문 기능을 유지하고 정정 UI만 숨긴다.

## 1. 적용 전 확인

1. 프로젝트 `yangsan-inventory`의 SQL Editor를 연다.
2. `0010`, `0011`이 이미 적용됐고, `0012` 파일이 아직 적용되지 않았는지 확인한다.
3. 정정 기능을 잠시 사용하지 않는 시간에 실행한다. 이 마이그레이션은 데이터 backfill이나 RLS 변경을 하지 않는다.

## 2. 본문 적용

1. `0012_order_correction_link.sql` 전체를 새 쿼리에 붙여넣고 실행한다.
2. 기대 결과는 `Success. No rows returned`다.
3. 한 번 더 실행해도 같은 결과여야 한다. 컬럼/인덱스/트리거는 재실행 안전하게 작성됐다.

## 3. 가드 검증 G1-G12

아래 검증은 **적용 후** 사용자 SQL Editor에서 한다. 각 실험은 `begin; ... rollback;` 안에서 수행해 실데이터를 남기지 않는다. 예상 차단은 `DO ... EXCEPTION` 블록으로 감싼다. 한 항목이라도 기대와 다르면 `rollback;` 후 중단한다.

먼저 같은 회사의 `company_id`, `customer_id`, `product_id`를 확인한다.

```sql
select id, name from public.ordermoa_companies;
select id, name from public.ordermoa_customers where company_id = '<company_id>' limit 5;
select id, name from public.ordermoa_products where company_id = '<company_id>' limit 5;
```

| 항목 | 조작 | 기대 |
|---|---|---|
| G1 | 자기 자신을 `corrected_from_order_id`로 INSERT | CHECK 차단 |
| G2 | 다른 회사 주문을 원주문으로 INSERT | `cross-company reference` 차단 |
| G3 | 아직 `confirmed`인 주문을 원주문으로 INSERT | 원주문 상태 가드 차단 |
| G4 | 만들어진 정정본의 링크 UPDATE | 링크 불변 가드 차단 |
| G5 | 같은 원주문에 활성 정정본 두 번째 INSERT | 부분 유니크 차단 |
| G6 | 첫 정정본을 cancelled로 바꾼 뒤 다음 정정본 INSERT | 성공 |
| G7 | 0012 본문 재실행 | 성공, 기존 데이터 무변경 |
| G8 | `correction_started_at`을 채운 orders INSERT | 표식 주입 차단 |
| G9 | confirmed->cancelled 외 전이에서 표식 UPDATE | 표식 전이 가드 차단 |
| G10 | 기록된 표식을 변경하거나 null로 UPDATE | 표식 불변 가드 차단 |
| G11 | confirmed 주문을 `status='cancelled', correction_started_at=now()` 한 UPDATE로 변경 | 성공 |
| G12 | 표식 없는 cancelled 주문을 원주문으로 INSERT | 원본 표식 가드 차단 |

### 안전한 기본 실험 틀

아래 틀로 G3, G8-G12를 확인할 수 있다. `<...>` 세 값은 모두 같은 회사 소속 UUID로 치환한다. 결과의 `PASS`만 허용한다.

```sql
begin;
create temp table _r5b (k text primary key, v uuid) on commit drop;
create temp table _r5blog (step text primary key, result text) on commit drop;
insert into _r5b(k, v) values
  ('cid', '<company_id>'::uuid),
  ('cust', '<customer_id>'::uuid),
  ('pid', '<product_id>'::uuid);

-- confirmed 원주문 A를 만든 뒤 G11의 정상 경로로 취소+표식을 한 문장에 기록한다.
with o as (
  insert into public.ordermoa_orders (company_id, customer_id, order_date, source, status)
  values ((select v from _r5b where k='cid'), (select v from _r5b where k='cust'), current_date, 'test', 'quantity_confirmed')
  returning id
), i as (
  insert into public.ordermoa_order_items (company_id, order_id, product_id, quantity, unit, unit_price)
  select (select v from _r5b where k='cid'), id, (select v from _r5b where k='pid'), 1, '개', 1000 from o
  returning order_id
), c as (
  update public.ordermoa_orders set status='confirmed' where id=(select order_id from i) returning id
)
insert into _r5b(k, v) select 'source', id from c;

do $$ begin
  update public.ordermoa_orders set status='cancelled', correction_started_at=now()
   where id=(select v from _r5b where k='source');
  insert into _r5blog values ('G11', 'PASS');
exception when others then insert into _r5blog values ('G11', 'FAIL: ' || SQLERRM); end $$;

-- G8: INSERT 표식 주입은 막혀야 한다.
do $$ begin
  insert into public.ordermoa_orders (company_id, customer_id, order_date, source, status, correction_started_at)
  values ((select v from _r5b where k='cid'), (select v from _r5b where k='cust'), current_date, 'test', 'quantity_confirmed', now());
  insert into _r5blog values ('G8', 'FAIL: 차단되지 않음');
exception when others then insert into _r5blog values ('G8', 'PASS: ' || SQLERRM); end $$;

-- G12: 표식 없는 보상 취소 주문은 정정 원주문이 될 수 없다.
with o as (
  insert into public.ordermoa_orders (company_id, customer_id, order_date, source, status)
  values ((select v from _r5b where k='cid'), (select v from _r5b where k='cust'), current_date, 'test', 'quantity_confirmed')
  returning id
), c as (
  update public.ordermoa_orders set status='cancelled' where id=(select id from o) returning id
)
insert into _r5b(k, v) select 'plain_cancelled', id from c;
do $$ begin
  insert into public.ordermoa_orders (company_id, customer_id, order_date, source, status, corrected_from_order_id)
  values ((select v from _r5b where k='cid'), (select v from _r5b where k='cust'), current_date, 'correction', 'quantity_confirmed', (select v from _r5b where k='plain_cancelled'));
  insert into _r5blog values ('G12', 'FAIL: 차단되지 않음');
exception when others then insert into _r5blog values ('G12', 'PASS: ' || SQLERRM); end $$;

select * from _r5blog order by step;
rollback;
```

### 나머지 G1-G7, G9-G10 실행 블록

위 기본 틀은 `select * from _r5blog ...`와 `rollback;` **직전까지만** 실행한 뒤, 같은 SQL Editor 탭에서 아래 블록을 **한 블록씩** 실행한다. `source`는 G11에서 만들어진 표식 있는 취소 원주문이다. 실패를 기대하는 항목은 `PASS:` 오류 문구가, 성공을 기대하는 G6은 결과 행이 나와야 한다. 모든 블록이 끝난 뒤 기본 틀의 마지막 `select`와 `rollback;`을 실행한다.

```sql
-- G1: 자기 참조는 CHECK가 막아야 한다.
do $$ declare blocked boolean := false; begin
  begin
    with self_row as (select gen_random_uuid() as id)
    insert into public.ordermoa_orders (id, company_id, customer_id, order_date, source, status, corrected_from_order_id)
    select id, (select v from _r5b where k='cid'), (select v from _r5b where k='cust'), current_date, 'correction', 'quantity_confirmed', id
      from self_row;
  exception when others then blocked := true; end;
  if not blocked then raise exception 'G1 FAIL: 차단되지 않음'; end if;
  raise notice 'G1 PASS';
end $$;

-- G3 준비: 표식 없이 아직 confirmed인 별도 주문을 만든다.
with o as (
  insert into public.ordermoa_orders (company_id, customer_id, order_date, source, status)
  values ((select v from _r5b where k='cid'), (select v from _r5b where k='cust'), current_date, 'test', 'quantity_confirmed')
  returning id
), i as (
  insert into public.ordermoa_order_items (company_id, order_id, product_id, quantity, unit, unit_price)
  select (select v from _r5b where k='cid'), id, (select v from _r5b where k='pid'), 1, '개', 1000 from o
  returning order_id
), c as (
  update public.ordermoa_orders set status='confirmed' where id=(select order_id from i) returning id
)
insert into _r5b(k, v) select 'still_confirmed', id from c;

do $$ declare blocked boolean := false; begin
  begin
    insert into public.ordermoa_orders (company_id, customer_id, order_date, source, status, corrected_from_order_id)
    values ((select v from _r5b where k='cid'), (select v from _r5b where k='cust'), current_date, 'correction', 'quantity_confirmed', (select v from _r5b where k='still_confirmed'));
  exception when others then blocked := true; end;
  if not blocked then raise exception 'G3 FAIL: 차단되지 않음'; end if;
  raise notice 'G3 PASS';
end $$;

-- G4 준비: source의 첫 활성 정정본을 만든다.
with child as (
  insert into public.ordermoa_orders (company_id, customer_id, order_date, source, status, corrected_from_order_id)
  values ((select v from _r5b where k='cid'), (select v from _r5b where k='cust'), current_date, 'correction', 'quantity_confirmed', (select v from _r5b where k='source'))
  returning id
)
insert into _r5b(k, v) select 'child', id from child;

do $$ declare blocked boolean := false; begin
  begin
    update public.ordermoa_orders set corrected_from_order_id=null where id=(select v from _r5b where k='child');
  exception when others then blocked := true; end;
  if not blocked then raise exception 'G4 FAIL: 차단되지 않음'; end if;
  raise notice 'G4 PASS';
end $$;

-- G5: 같은 원주문에 두 번째 활성 정정본을 만들 수 없다.
do $$ declare blocked boolean := false; begin
  begin
    insert into public.ordermoa_orders (company_id, customer_id, order_date, source, status, corrected_from_order_id)
    values ((select v from _r5b where k='cid'), (select v from _r5b where k='cust'), current_date, 'correction', 'quantity_confirmed', (select v from _r5b where k='source'));
  exception when others then blocked := true; end;
  if not blocked then raise exception 'G5 FAIL: 차단되지 않음'; end if;
  raise notice 'G5 PASS';
end $$;

-- G6: 부분 실패 정정본을 취소하면 새 정정본은 허용한다.
update public.ordermoa_orders set status='cancelled' where id=(select v from _r5b where k='child');
insert into public.ordermoa_orders (company_id, customer_id, order_date, source, status, corrected_from_order_id)
values ((select v from _r5b where k='cid'), (select v from _r5b where k='cust'), current_date, 'correction', 'quantity_confirmed', (select v from _r5b where k='source'))
returning id;

-- G9: status 전이 없이 표식만 기록할 수 없다.
do $$ declare blocked boolean := false; begin
  begin
    update public.ordermoa_orders set correction_started_at=now() where id=(select v from _r5b where k='still_confirmed');
  exception when others then blocked := true; end;
  if not blocked then raise exception 'G9 FAIL: 차단되지 않음'; end if;
  raise notice 'G9 PASS';
end $$;

-- G10: 기록된 source 표식은 변경하거나 null로 만들 수 없다.
do $$ declare blocked boolean := false; begin
  begin
    update public.ordermoa_orders set correction_started_at=now() where id=(select v from _r5b where k='source');
  exception when others then blocked := true; end;
  if not blocked then raise exception 'G10a FAIL: 차단되지 않음'; end if;
  raise notice 'G10a PASS';
end $$;
do $$ declare blocked boolean := false; begin
  begin
    update public.ordermoa_orders set correction_started_at=null where id=(select v from _r5b where k='source');
  exception when others then blocked := true; end;
  if not blocked then raise exception 'G10b FAIL: 차단되지 않음'; end if;
  raise notice 'G10b PASS';
end $$;
```

G2와 G7은 별도 조건이 있어 다음처럼 확인한다.

```sql
-- G2: 두 번째 회사의 customer_id를 준비한 뒤, 다른 회사 원주문을 가리키면 차단돼야 한다.
-- <other_company_customer_id>는 source 회사가 아닌 다른 회사 소속이어야 한다.
do $$ declare blocked boolean := false; begin
  begin
    insert into public.ordermoa_orders (company_id, customer_id, order_date, source, status, corrected_from_order_id)
    values ('<other_company_id>'::uuid, '<other_company_customer_id>'::uuid, current_date, 'correction', 'quantity_confirmed', (select v from _r5b where k='source'));
  exception when others then blocked := true; end;
  if not blocked then raise exception 'G2 FAIL: 차단되지 않음'; end if;
  raise notice 'G2 PASS';
end $$;

-- G7: 위 트랜잭션을 rollback한 뒤 0012 파일 본문만 한 번 더 실행한다.
-- 기대: Success. No rows returned. 이후 컬럼/인덱스/트리거 정의와 기존 행에 변경이 없어야 한다.
```

## 4. 적용 후 앱 확인

1. 로그인 DB 모드에서 F5 후 주문 목록의 최종 확정 주문에만 `정정`이 보이는지 확인한다.
2. 정정 진입 후 수량을 바꾸고 `정정 확정 (기존 주문 취소)`을 실행한다.
3. 합산표와 월합계에 새 주문만 반영되는지, 주문 목록에서 새 주문에 `정정본` 뱃지가 보이는지 확인한다.
4. 취소 이력에서 원주문이 보이고, 일반 표식 없는 취소 주문에는 `정정본 만들기(재발행)`이 보이지 않는지 확인한다.
5. 원주문/정정본 모두 새로고침 후 유지되는지 확인한다.

DB 검증과 로그인 smoke는 사용자가 직접 0012를 적용한 뒤에만 완료로 기록한다.
