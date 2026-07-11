# 0011 가드 보강 마이그레이션 — 적용 가이드 (W23-R3)

대상 파일: `web/supabase/migrations/0011_order_pricing_guard_hardening.sql`
상태: **미적용**. 이 가이드대로 본문 적용 + 실험 H1~H7b가 전부 PASS여야 "DB smoke 완료"로 본다.

## 0. 이 마이그레이션이 하는 일 (요약)
0010 스냅샷 가드를 보강한다. 전부 **additive · idempotent · 데이터 무접촉 · backfill 0 · 신규 테이블/RLS 없음** — 재실행해도 안전.
- **상태 전이**: `confirmed`는 `cancelled`로만 전이(→quantity_confirmed·→draft 차단). `cancelled`는 종결(되살리기 차단).
- **order_items 가드(INSERT/UPDATE/DELETE 전부)**: `confirmed`/`cancelled` 주문의 라인은 추가(INSERT)·수정(UPDATE)·삭제(DELETE)·다른 주문으로 이동(order_id 변경) 모두 차단. `quantity_confirmed` 주문에는 가격 마감용 UPDATE와 라인 INSERT를 허용.

> ⚠️ **0011 본문 적용 + H1~H7b 전부 PASS 전에는 DB smoke를 "완료"로 보지 않는다.** (적용 전에도 앱은 0010 가드로 안전하지만, 0011 강화는 미적용 상태.)

## 1. Supabase SQL Editor 접속
1. supabase.com 로그인 → 프로젝트 **yangsan-inventory** 선택.
2. 좌측 메뉴 **SQL Editor → New query**.

## 2. 본문 적용
1. `0011_order_pricing_guard_hardening.sql` **파일 전체**를 복사해 붙여넣고 **Run**.
   - 하단 실험 안내는 `/* … */` 주석이라 실행되지 않는다 — 파일 전체를 붙여넣어도 안전하다.
2. **기대 결과: `Success. No rows returned`**
3. 한 번 더 실행해도 동일하게 `Success` (idempotent). 오류가 나면 붙여넣기 범위를 다시 확인.

## 3. 가드 검증 실험 H1~H7b (안전 · 실데이터 무변경)

**설계 원칙 (중요):**
- 전체를 **하나의 트랜잭션(`begin … rollback`)**으로 감싸 **아무것도 커밋하지 않는다** → 끝에서 자동 원복, 실데이터 무변경.
- 예상 오류가 나는 단계는 각각 **`DO` 블록의 `EXCEPTION`으로 격리**한다. 그래서 오류가 나도 트랜잭션이 abort되지 않고 다음 테스트로 계속 진행한다. (예상 오류 SQL을 한 트랜잭션에서 그냥 연속 실행하면 첫 오류에서 트랜잭션이 aborted 상태가 되어 이후가 전부 무의미해진다 — 그래서 이 방식을 쓴다.)
- 각 단계는 `_r3log`에 PASS/FAIL을 남기고 마지막 `SELECT`로 한눈에 확인한다.

**준비:** 아래 스크립트 상단 `insert into _r3(...)` 3줄의 `<본인 …>`를 본인 값으로 치환한다.
- `company_id`: `select id from public.ordermoa_companies;` (본인 회사)
- `customer_id`: 그 회사의 거래처 하나 — `select id, name from public.ordermoa_customers where company_id = '<본인 company_id>' limit 5;`
- `product_id`: 그 회사의 품목 하나 — `select id, name from public.ordermoa_products where company_id = '<본인 company_id>' limit 5;`
- 세 id는 **같은 회사** 소속이어야 한다(교차회사 트리거 때문).

아래 전체를 SQL Editor에 붙여넣고 Run:

```sql
begin;

-- [준비 0] 본인 값으로 치환 (아래 3줄만 수정)
create temp table _r3 (k text primary key, v uuid) on commit drop;
insert into _r3(k, v) values
  ('cid',  '<본인 company_id>'::uuid),
  ('cust', '<본인 customer_id>'::uuid),
  ('pid',  '<본인 product_id>'::uuid);

create temp table _r3log (step text, expect text, result text) on commit drop;

-- [준비 1] 가격 대기(quantity_confirmed) 주문 A(:oid) + 라인(:iid)
with o as (
  insert into public.ordermoa_orders (company_id, customer_id, order_date, source, status)
  values ((select v from _r3 where k='cid'), (select v from _r3 where k='cust'), current_date, 'kakao', 'quantity_confirmed')
  returning id)
insert into _r3(k, v) select 'oid', id from o;

with i as (
  insert into public.ordermoa_order_items (company_id, order_id, product_id, quantity, unit, unit_price)
  values ((select v from _r3 where k='cid'), (select v from _r3 where k='oid'), (select v from _r3 where k='pid'), 3, '박스', 0)
  returning id)
insert into _r3(k, v) select 'iid', id from i;

-- [준비 2] 가격 대기 주문 B(:oid2) + 라인(:iid2) — H7b(가격 마감 전 INSERT 허용) 대조군
with o2 as (
  insert into public.ordermoa_orders (company_id, customer_id, order_date, source, status)
  values ((select v from _r3 where k='cid'), (select v from _r3 where k='cust'), current_date, 'kakao', 'quantity_confirmed')
  returning id)
insert into _r3(k, v) select 'oid2', id from o2;

with i2 as (
  insert into public.ordermoa_order_items (company_id, order_id, product_id, quantity, unit, unit_price)
  values ((select v from _r3 where k='cid'), (select v from _r3 where k='oid2'), (select v from _r3 where k='pid'), 1, '개', 0)
  returning id)
insert into _r3(k, v) select 'iid2', id from i2;

-- ── H1: qc 라인 단가 UPDATE → 성공(허용) ──
do $$ begin
  update public.ordermoa_order_items set unit_price = 2500 where id = (select v from _r3 where k='iid');
  insert into _r3log values ('H1', '성공(허용)', 'PASS');
exception when others then insert into _r3log values ('H1', '성공(허용)', 'FAIL: ' || SQLERRM); end $$;

-- ── H2: qc→confirmed 승격 → 성공(허용) ──
do $$ begin
  update public.ordermoa_orders set status = 'confirmed' where id = (select v from _r3 where k='oid');
  insert into _r3log values ('H2', '성공(허용)', 'PASS');
exception when others then insert into _r3log values ('H2', '성공(허용)', 'FAIL: ' || SQLERRM); end $$;

-- ── H3: confirmed 라인 단가 UPDATE → 차단 ──
do $$ begin
  update public.ordermoa_order_items set unit_price = 9999 where id = (select v from _r3 where k='iid');
  insert into _r3log values ('H3', '차단', 'FAIL: 차단되지 않음');
exception when others then insert into _r3log values ('H3', '차단', 'PASS: ' || SQLERRM); end $$;

-- ── H4a: confirmed → quantity_confirmed(되돌림) → 차단 ──
do $$ begin
  update public.ordermoa_orders set status = 'quantity_confirmed' where id = (select v from _r3 where k='oid');
  insert into _r3log values ('H4a', '차단', 'FAIL: 차단되지 않음');
exception when others then insert into _r3log values ('H4a', '차단', 'PASS: ' || SQLERRM); end $$;

-- ── H4b: confirmed → draft → 차단 ──
do $$ begin
  update public.ordermoa_orders set status = 'draft' where id = (select v from _r3 where k='oid');
  insert into _r3log values ('H4b', '차단', 'FAIL: 차단되지 않음');
exception when others then insert into _r3log values ('H4b', '차단', 'PASS: ' || SQLERRM); end $$;

-- ── H5: confirmed 라인 DELETE → 차단 ──
do $$ begin
  delete from public.ordermoa_order_items where id = (select v from _r3 where k='iid');
  insert into _r3log values ('H5', '차단', 'FAIL: 차단되지 않음');
exception when others then insert into _r3log values ('H5', '차단', 'PASS: ' || SQLERRM); end $$;

-- ── H7a: confirmed 주문에 새 라인 INSERT → 차단 ──
do $$ begin
  insert into public.ordermoa_order_items (company_id, order_id, product_id, quantity, unit, unit_price)
  values ((select v from _r3 where k='cid'), (select v from _r3 where k='oid'), (select v from _r3 where k='pid'), 1, '개', 100);
  insert into _r3log values ('H7a', '차단', 'FAIL: 차단되지 않음');
exception when others then insert into _r3log values ('H7a', '차단', 'PASS: ' || SQLERRM); end $$;

-- ── H7b: quantity_confirmed 주문(:oid2)에 새 라인 INSERT → 성공(허용) ──
do $$ begin
  insert into public.ordermoa_order_items (company_id, order_id, product_id, quantity, unit, unit_price)
  values ((select v from _r3 where k='cid'), (select v from _r3 where k='oid2'), (select v from _r3 where k='pid'), 1, '개', 100);
  insert into _r3log values ('H7b', '성공(허용)', 'PASS');
exception when others then insert into _r3log values ('H7b', '성공(허용)', 'FAIL: ' || SQLERRM); end $$;

-- ── H6a: confirmed → cancelled → 성공(허용) ──
do $$ begin
  update public.ordermoa_orders set status = 'cancelled' where id = (select v from _r3 where k='oid');
  insert into _r3log values ('H6a', '성공(허용)', 'PASS');
exception when others then insert into _r3log values ('H6a', '성공(허용)', 'FAIL: ' || SQLERRM); end $$;

-- ── H6b: cancelled → confirmed(되살리기) → 차단 ──
do $$ begin
  update public.ordermoa_orders set status = 'confirmed' where id = (select v from _r3 where k='oid');
  insert into _r3log values ('H6b', '차단', 'FAIL: 차단되지 않음');
exception when others then insert into _r3log values ('H6b', '차단', 'PASS: ' || SQLERRM); end $$;

-- 결과 확인
select step, expect, result from _r3log order by step;

-- 원복 (아무것도 커밋하지 않는다 — 위에서 만든 테스트 주문/라인 전부 사라짐)
rollback;
```

## 3-1. 기대 결과

`SELECT` 결과 그리드(마지막에서 두 번째 줄)에 아래처럼 **10행 전부 PASS**여야 한다:

| step | expect | result |
|---|---|---|
| H1 | 성공(허용) | PASS |
| H2 | 성공(허용) | PASS |
| H3 | 차단 | PASS: … |
| H4a | 차단 | PASS: … |
| H4b | 차단 | PASS: … |
| H5 | 차단 | PASS: … |
| H6a | 성공(허용) | PASS |
| H6b | 차단 | PASS: … |
| H7a | 차단 | PASS: … |
| H7b | 성공(허용) | PASS |

각 의미:
- **H1** 가격 대기 라인 단가 UPDATE = 가격 마감의 정상 경로 → 허용.
- **H2** 가격 대기 → 최종 확정 승격 → 허용.
- **H3** 최종 확정 라인 단가 UPDATE → 스냅샷 불변으로 차단.
- **H4a/H4b** 최종 확정 → 가격 대기/draft 되돌림 → 차단(취소로만 전이).
- **H5** 최종 확정 라인 DELETE → 차단.
- **H6a** 최종 확정 → 취소 → 허용(기존 취소 경로).
- **H6b** 취소 → 최종 확정 되살리기 → 차단(취소는 종결).
- **H7a** 최종 확정 주문에 라인 주입(INSERT) → 차단.
- **H7b** 가격 대기 주문에 라인 INSERT → 허용(가격 마감 전 정상 삽입 · saveOrder 경로 A 공존).

> 참고: 결과 그리드가 비어 보이면 상단 **Messages/Notices** 탭도 확인하거나, 스크립트 맨 끝 `rollback;` 한 줄만 잠시 지우고 다시 Run해 그리드를 확인한 뒤 **반드시 별도로 `rollback;` 한 줄을 실행**해 원복한다.

## 4. 실패 시 중단 기준
- **어느 한 행이라도 FAIL이면 거기서 멈춘다.** 어느 H가 FAIL인지(그리고 `result`의 메시지)를 그대로 공유한다. 0011 강화가 의도대로 동작하지 않는다는 뜻이므로, 원인 확인 전까지 다음 단계(로그인 DB smoke)로 넘어가지 않는다.
- **준비 단계에서 오류**(예: `cross-company reference`, `null value` , `violates check constraint`)면 치환한 `company_id/customer_id/product_id`가 서로 다른 회사이거나 존재하지 않는 것 — id를 다시 확인한다. (실험 스크립트는 오류가 나도 `rollback` 전이면 커밋된 게 없다. 오류로 중간에 끊겼다면 그냥 다시 `rollback;`을 한 번 실행해 트랜잭션을 닫는다.)

## 5. 원복
- 실험 스크립트는 마지막 `rollback;`으로 **자동 원복**된다. 위에서 만든 테스트 주문/라인은 커밋되지 않으므로 **별도 삭제가 필요 없다.**
- (혹시 실수로 `commit;`을 했다면: 테스트 주문이 confirmed/cancelled로 남아 트리거가 삭제를 막는다. 그 경우에만 관리자가 트리거를 잠시 drop → 정리 → 트리거 재생성. 위 절차대로면 이럴 일은 없다.)

## 6. 적용 후 로그인 DB smoke (사용자)
1. 앱 로그인(DB 모드)에서 발주 붙여넣기 → **수량만 확정** → 주문 목록 [가격 대기] 확인 → **F5 유지**.
2. [가격 마감] → 단가 입력 → 마감 → 명세서 발행 확인 → **F5 유지**.
3. 명세서 재출력 확인. **테스트 주문 1건만** 사용(대량 생성 금지).
4. 위 실험(3장)이 전부 PASS + 로그인 smoke까지 확인되면 **"DB smoke 완료"**.

## 7. 관련
- 결정/설계: `docs/order-moa-w23-r1-state-model-decision.md`, `docs/order-moa-system-redesign-2026-07-11.md` §6
- 작업 기록: `docs/agent-worklog.md`(2026-07-11 W23-R3 / 검수 보강 / 실험 절차 보정)
- 이전 마이그레이션 실험: 0010은 E1~E4(적용 완료), 0011은 이 문서의 H1~H7b.
