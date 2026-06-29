# 오더모아 Supabase RLS 정책 설계서

작성일: 2026-06-29
작성 주체: Claude (단위 2 — RLS)
상위 문서: `docs/db-schema-definition.md`, `docs/function-specification.md`(§9), `docs/web-security-checklist.md`

> 본 문서는 행 수준 보안(RLS) **설계 문서**다. SQL은 **초안(참고용)**이며 Supabase 실제 적용·마이그레이션은 하지 않는다.

---

## 1. RLS 설계 목적

- 오더모아는 **사업자 데이터**(거래처/단가/미수금/명세서)를 다룬다. 회사 간 데이터가 절대 섞이면 안 된다.
- 클라이언트(브라우저)는 `anon`/`authenticated` 키로 DB에 직접 접근할 수 있으므로, **권한을 DB(RLS)에서 강제**한다. "화면에서 숨김"만으로 권한을 처리하지 않는다.
- 목표: **로그인한 사용자가 자기 회사 데이터에만** select/insert/update 할 수 있게 한다.

## 2. 회사 격리 원칙

- 모든 업무 테이블은 `company_id`를 가진다.
- 접근 허용 조건: 요청자(`auth.uid()`)가 해당 `company_id`의 **멤버**여야 한다.
- 다른 `company_id`의 행은 select/insert/update/delete 모두 불가.
- 비로그인(`auth.uid()` is null)은 전 테이블 접근 불가.
- **참조 무결성**: RLS는 행의 `company_id`만 검증한다. 참조하는 `customer_id`/`product_id`/`order_id`가 같은 회사인지는 **DB 트리거**(`db-schema-definition.md` §5.1/§6.1, 방식 B)로 강제한다. RLS의 `with check`만으로는 교차 회사 참조를 막지 못한다.

## 3. security definer 헬퍼 함수

`company_members`를 직접 정책에서 조회하면 정책 재귀가 발생할 수 있으므로, **`security definer` 함수**로 소속/소유를 판정한다(함수는 RLS를 우회해 `company_members`를 읽음).

```sql
-- 소속 멤버 판정
create or replace function public.is_company_member(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = cid and m.user_id = auth.uid()
  );
$$;

-- 회사 소유자(owner) 판정 (멤버 관리용)
create or replace function public.is_company_owner(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = cid and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;
```

> 주의: 두 함수는 `security definer`이므로 소유자/검색경로를 신뢰 가능한 값으로 고정(`set search_path = public`)한다.

## 4. 역할 기준 (owner / staff)

- **owner**: 회사 생성자. 모든 데이터 + 멤버 관리.
- **staff**: 발주/거래처/품목 입력 등. **1차 MVP는 owner만 사용**(staff는 `role` 스키마만 준비, UI 미구현).
- 1차 정책은 대부분 **"멤버면 허용"**(owner/staff 구분 없이) + **멤버 관리만 owner 전용**으로 단순화한다. staff 세분화 권한은 2차.

### 4.1 최초 회사 생성 / owner 멤버 부트스트랩 (Codex 리뷰 반영)

문제: `company_members` insert를 owner만 허용하면, **최초 회사 생성 직후엔 아직 멤버 row가 없어** 첫 owner 등록이 막힌다(`is_company_owner`가 false).

해결 방향:
- **(권장) 회사 생성 + owner 멤버 등록을 하나의 안전한 서버 함수(RPC, `security definer`) 또는 서버 액션 트랜잭션**으로 처리한다. 이 경로에서 `companies` insert + `company_members(role='owner')` insert를 원자적으로 수행 → 클라이언트가 멤버 테이블에 직접 insert할 필요가 없다.
- **RLS 보강(부트스트랩 예외)**: 최초 owner 등록은 **본인을 `role='owner'`로 넣고 `companies.owner_user_id = auth.uid()`인 경우**에 한해 insert 허용. 그 외 일반 멤버 추가/수정/삭제는 기존대로 **owner만**.
- 우선순위: **RPC/서버 트랜잭션 > RLS 부트스트랩 예외**.

## 5. 객체별 정책 방향

| 테이블 | select | insert | update | delete |
|---|---|---|---|---|
| companies | 멤버 or owner_user_id 본인 | 본인(owner_user_id=auth.uid) | owner | 1차 미허용(restrict) |
| company_members | 멤버 | **owner** (+최초 owner 부트스트랩 예외, §4.1) | **owner** | **owner** |
| customers | 멤버 | 멤버 | 멤버 | 멤버(권장: soft `archived_at`) |
| products | 멤버 | 멤버 | 멤버 | 멤버(권장: soft `archived_at`) |
| product_aliases | 멤버 | 멤버 | 멤버 | 멤버 |
| customer_prices | 멤버 | 멤버 | 멤버 | 멤버 |
| order_imports | 멤버 | 멤버 | 멤버(**raw_text→null 허용**) | 멤버 |
| orders | 멤버 | 멤버 | 멤버(취소=status) | 1차 미허용(권장: status='cancelled') |
| order_items | 멤버 | 멤버 | 멤버 | 멤버(주문 범위) |
| delivery_notes | 멤버 | 멤버 | 멤버 | 멤버 |
| receivables | 멤버 | 멤버 | 멤버 | 멤버 |

- "멤버" = `is_company_member(company_id)` true.
- companies는 `id`(자기 회사) 기준, 나머지는 `company_id` 기준.
- `company_members` insert는 §4.1 부트스트랩 예외를 포함한다(최초 owner 본인 등록 허용).
- `delivery_notes`·`receivables`는 **1차 선택 테이블**(db-schema §3.1)이나, 생성 시 정책은 동일 "멤버" 패턴을 적용한다.

## 6. soft delete 방향

- **customers / products**: 하드 delete 대신 `archived_at` 설정(UPDATE)을 권장. 목록 조회 시 `archived_at is null` 필터.
- **orders**: 취소는 `status='cancelled'`(UPDATE). 하드 delete는 1차 미허용.
- 하드 delete가 필요한 보조 데이터(`order_imports`, `product_aliases`)는 멤버 delete 허용.

## 7. raw_text 삭제 정책 (C3)

- 원문 삭제는 **행 삭제가 아니라 `order_imports.raw_text`를 null로 UPDATE**한다 → update(멤버) 정책으로 처리.
- `orders`/`order_items`는 `order_imports`와 **FK로 연결하지 않으므로**, raw_text를 지워도 **확정 주문 데이터는 그대로 유지**된다.
- 첨부파일/OCR 원본 컬럼은 없다(1차 제외).

## 8. SQL 정책 초안 (참고용)

> 모든 테이블에 RLS 활성화 후 정책 생성. 아래는 초안이며 적용/마이그레이션 아님.

```sql
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
alter table public.delivery_notes   enable row level security;
alter table public.receivables      enable row level security;

-- companies
create policy companies_select on public.companies
  for select using (public.is_company_member(id) or owner_user_id = auth.uid());
create policy companies_insert on public.companies
  for insert with check (owner_user_id = auth.uid());
create policy companies_update on public.companies
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
-- delete 정책 없음 → 1차 삭제 불가

-- company_members (owner만 관리, 조회는 멤버)
create policy members_select on public.company_members
  for select using (public.is_company_member(company_id));
create policy members_insert on public.company_members
  for insert with check (
    public.is_company_owner(company_id)                 -- 일반: owner가 멤버 추가
    or (                                                 -- 부트스트랩: 최초 owner 본인 등록(§4.1)
      user_id = auth.uid() and role = 'owner'
      and exists (select 1 from public.companies c
                  where c.id = company_id and c.owner_user_id = auth.uid())
    )
  );
-- 권장: 회사 생성 + 첫 owner 등록은 security definer RPC/서버 트랜잭션으로 처리(§4.1)
create policy members_update on public.company_members
  for update using (public.is_company_owner(company_id))
              with check (public.is_company_owner(company_id));
create policy members_delete on public.company_members
  for delete using (public.is_company_owner(company_id));

-- 표준 멤버 테이블 공통 패턴 (customers 예시)
create policy customers_select on public.customers
  for select using (public.is_company_member(company_id));
create policy customers_insert on public.customers
  for insert with check (public.is_company_member(company_id));
create policy customers_update on public.customers
  for update using (public.is_company_member(company_id))
              with check (public.is_company_member(company_id));
create policy customers_delete on public.customers
  for delete using (public.is_company_member(company_id));

-- products / product_aliases / customer_prices / order_imports /
-- orders / order_items / delivery_notes / receivables
-- → customers와 동일 패턴(select/insert/update [+delete]) 반복.
--   단 orders는 delete 정책 생략(취소는 status='cancelled' update).
--   order_imports update 정책이 raw_text→null 삭제를 처리.
```

> 패턴 반복: 표준 멤버 테이블은 `(company_id)` 기준 동일 4정책을 만든다. orders는 delete 정책 생략 권장.

## 9. 검증 시나리오

### 9.1 A회사 / B회사 격리
- 전제: 사용자 U_A는 A회사 멤버, U_B는 B회사 멤버.
- [ ] U_A가 B회사 `customers` select → **0행**.
- [ ] U_A가 B회사 `customer_id`/`company_id`로 `orders` insert → **거부**(with check 실패).
- [ ] U_A가 B회사 `customer_prices` update → **0행 영향/거부**.
- [ ] U_A가 요청 바디의 `company_id`를 B로 위조 → **with check 차단**.

### 9.2 비로그인 접근 차단
- [ ] `auth.uid()`가 null인 요청 → `is_company_member` false → 전 테이블 **select/insert/update/delete 차단**.

### 9.3 raw_text 삭제 후 주문 유지
- [ ] `order_imports.raw_text`를 null로 update(멤버) → 성공.
- [ ] 동일 회사의 확정 `orders`/`order_items` → **그대로 존재**(FK 미연결이므로 영향 없음).

### 9.4 역할
- [ ] staff(2차)도 1차 정책에선 멤버로 동작(데이터 접근 가능), 멤버 관리(`company_members`)는 **owner만**.

### 9.5 교차 회사 FK 참조 차단 (Codex 리뷰 반영)
- [ ] U_A가 **B회사 `customer_id`**를 참조해 A회사 `customer_prices` insert → **차단**(트리거: customer의 company_id ≠ A).
- [ ] U_A가 **B회사 `product_id`**를 참조해 A회사 `order_items` insert → **차단**(트리거: product의 company_id ≠ A).
- [ ] U_A가 **B회사 `order_id`**를 참조해 `delivery_notes`/`receivables` 생성 → **차단**(트리거: order의 company_id ≠ A).
> 위는 RLS(row.company_id) + 교차 회사 트리거(db-schema §5.1/§6.1, 방식 B) 조합으로 차단된다.

### 9.6 최초 회사 생성 부트스트랩 (Codex 리뷰 반영)
- [ ] 신규 사용자가 회사 생성(RPC/서버 트랜잭션) → `companies` + `company_members(role='owner')`가 원자적으로 생성된다.
- [ ] 부트스트랩 후 해당 사용자는 `is_company_member`/`is_company_owner`가 true가 되어 정상 동작한다.
- [ ] 부트스트랩 예외 정책(§4.1)이 **본인 owner 1회 등록만** 허용하고, 타인/타회사 등록은 막는지 확인.

## 10. service role key 주의사항

- **service role key는 RLS를 우회**한다. 절대 클라이언트(브라우저/`NEXT_PUBLIC_*`)에 노출하지 않는다.
- 클라이언트는 `anon`/`authenticated` 키만 사용 → 모든 접근이 RLS 적용을 받는다.
- service role key는 **서버 전용**(Server Action/Route Handler의 서버 환경)에서만, 꼭 필요한 관리 작업에 한해 사용한다.
- `.env`/환경변수 파일은 Git에 커밋하지 않는다.

---

## 11. 다음 산출물

- 화면 설계서(S1~S11) / API·Server Action 정의서 / 구현 작업지시서.
- RLS는 구현 단위에서 실제 Supabase에 적용·검증한다(본 문서는 설계까지).

> 비고: 본 문서는 설계 초안이며 Supabase 적용·마이그레이션 파일은 만들지 않았다.
