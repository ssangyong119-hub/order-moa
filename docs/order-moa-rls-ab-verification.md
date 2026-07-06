# 8a-검증 마무리 — A/B 회사 격리 실측 절차

작성일: 2026-07-02
목적: **B계정(다른 회사)으로 히든식품(A회사) 데이터가 절대 안 보이는지** 실측한다. 8b(주문 저장) 전 필수.
근거: `docs/supabase-rls-policy.md` §9.1(A/B 격리) · §9.5(교차 회사 위조)

> ✅ **실측 결과(2026-07-02, 경로 0으로 수행): 전부 통과.**
> - select 격리: 다른 회사 사용자 기준 `ordermoa_companies / company_members / customers` = **0 / 0 / 0**
> - 위조 insert: A회사 company_id로 `ordermoa_customers` insert → **`ERROR: 42501 new row violates row-level security policy` 거부**
> - 둘 다 `begin…rollback`으로 감싸 DB 무변경. → **8a-검증 완료, 8b 진행 가능.**

> 판정 기준 요약: B(비멤버)에서 **A회사 select = 0행**, **A회사 company_id 위조 insert = 오류(거부)** 면 합격.

---

## 경로 0 (가장 쉬움·권장) — 두 번째 계정 없이 SQL Editor 한 곳에서 (5분)

두 번째 로그인 계정을 만들 필요가 없습니다. SQL Editor에서 "B라는 다른 사용자인 척"만 하면 RLS 잠금이 그대로 작동합니다. 앞서 join 조회를 성공하셨던 그 화면입니다.

### 어디서 하나
- Supabase 대시보드 → 프로젝트(yangsan-inventory) 진입 → **왼쪽 메뉴의 `SQL Editor`**(종이+연필 아이콘) → **New query**.

### 붙여넣기 A — A회사 데이터가 B에게 안 보이는지 (그대로 실행)
```sql
begin;
set local role authenticated;
-- 실제 계정 아님. RLS 격리 확인용 가짜 'B 사용자' uid.
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000b0","role":"authenticated"}';

select 'A) B가 보는 회사 수(0이어야 함)'      as test, count(*) as rows_seen from public.ordermoa_companies
union all
select 'B) B가 보는 A회사 멤버 수(0이어야 함)' , count(*) from public.ordermoa_company_members
union all
select 'C) B가 보는 A회사 거래처 수(0이어야 함)', count(*) from public.ordermoa_customers;

rollback;
```
- **판정**: 세 줄 모두 `rows_seen = 0` 이면 → **A회사(히든식품) 데이터가 B에게 전혀 안 보인다 = 격리 성공.**
- (참고) 같은 쿼리를 `set role` 없이 그냥 실행하면 postgres 관리자 권한이라 다 보입니다. 위 `set local role authenticated`가 "일반 로그인 사용자처럼" 만드는 핵심입니다.

### 붙여넣기 B — A회사로 위조해서 몰래 집어넣기가 막히는지
1. 먼저 히든식품 id를 확인:
   ```sql
   select id, name from public.ordermoa_companies;
   ```
   → `히든식품` 행의 id 값을 복사(`<A_COMPANY_ID>`).
2. 아래에서 `<A_COMPANY_ID>` 한 곳만 바꿔 실행:
   ```sql
   begin;
   set local role authenticated;
   set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000b0","role":"authenticated"}';

   insert into public.ordermoa_customers (company_id, name)
   values ('<A_COMPANY_ID>', '위조테스트');

   rollback;
   ```
- **판정**: 빨간 오류 `new row violates row-level security policy for table "ordermoa_customers"` 가 뜨면 → **위조 차단 성공.** (오류가 나는 게 정상입니다.)

> 두 붙여넣기 모두 `begin … rollback`으로 감싸 있어 **DB에 아무 흔적도 남지 않습니다**(yangsan-inventory 기존 데이터 안전).

---

## 경로 1 (대안) — 실제 B 사용자 UUID로 하는 방식 (이메일 수신 불필요)

## 경로 1 (권장) — 대시보드 + SQL Editor (이메일 수신 불필요, 5분)

### 1단계. B 테스트 사용자 만들기
1. Supabase 대시보드 → **Authentication → Users → Add user → Create new user**
2. 이메일: 아무 테스트 주소(예: `btest@example.com`) / 비밀번호 아무거나 / **Auto Confirm User 체크**
3. 만들어진 사용자의 **UUID를 복사**해 둔다 (`B_USER_ID`)

### 2단계. A회사 UUID 확인
SQL Editor에서 (일반 실행 = 관리자 권한):
```sql
select id, name from public.ordermoa_companies;
```
→ `히든식품`의 id를 복사 (`A_COMPANY_ID`)

### 3단계. B계정으로 "가장"해서 격리 실측
아래 스크립트에서 `<B_USER_ID>`와 `<A_COMPANY_ID>` 두 곳만 바꿔 SQL Editor에서 실행:

```sql
begin;

-- B계정으로 가장 (RLS가 실제로 적용되는 authenticated 역할)
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"<B_USER_ID>","role":"authenticated"}';

-- [검사 0] 내가 B로 보이는지
select auth.uid() as impersonated_as;

-- [검사 1] B회사 생성 (부트스트랩 RPC — 성공해야 함)
select public.ordermoa_create_company_with_owner('B테스트상사') as b_company_id;

-- [검사 2] 회사 목록: B테스트상사 1행만 나와야 함. 히든식품이 보이면 ★실패★
select id, name from public.ordermoa_companies;

-- [검사 3] A회사 멤버 목록: 0행이어야 함
select * from public.ordermoa_company_members where company_id = '<A_COMPANY_ID>';

-- [검사 4] A회사 거래처: 0행이어야 함 (A에 데이터가 없어도 0행이면 정상)
select * from public.ordermoa_customers where company_id = '<A_COMPANY_ID>';

rollback;  -- 실측 후 B테스트상사 생성까지 전부 되돌림(DB 흔적 없음)
```

### 4단계. 위조 insert 거부 확인 (별도 실행)
```sql
begin;
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"<B_USER_ID>","role":"authenticated"}';

-- [검사 5] A회사 company_id로 거래처 위조 insert → "row-level security" 오류가 나야 정상(★오류가 나면 성공★)
insert into public.ordermoa_customers (company_id, name) values ('<A_COMPANY_ID>', '위조테스트');

rollback;
```
> 검사 5는 **오류 메시지가 뜨는 것이 성공**입니다: `new row violates row-level security policy for table "ordermoa_customers"`.

### 5단계(선택). A회사 멤버 위조 등록 거부
```sql
begin;
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"<B_USER_ID>","role":"authenticated"}';
-- B가 자신을 A회사 owner로 위조 등록 → 거부되어야 함(부트스트랩 예외는 companies.owner_user_id 본인일 때만)
insert into public.ordermoa_company_members (company_id, user_id, role)
values ('<A_COMPANY_ID>', '<B_USER_ID>', 'owner');
rollback;
```

---

## 경로 2 (대안) — 앱으로 실측 (두 번째 이메일 수신 가능할 때)

1. 시크릿/다른 브라우저에서 `http://localhost:3000`
2. **두 번째 이메일**로 매직링크 로그인
3. 회사 만들기: `B테스트상사`
4. 판정: 회사 선택/상단 표시에 **B테스트상사만** 보이고 **히든식품이 절대 안 보이면 합격**
5. (선택) 4단계 위조 insert는 경로 1의 SQL로 보강

> 경로 2로 만든 B계정/B회사는 실데이터로 남음 — 나중에 정리하려면 Codex와 상의(1차엔 지장 없음).

---

## 판정표 (결과 기록)

| # | 검사 | 기대 | 실제(기입) |
|---|---|---|---|
| 0 | auth.uid() = B_USER_ID | 일치 | |
| 1 | B회사 생성 RPC | 성공(uuid 반환) | |
| 2 | companies 목록 | B테스트상사만(히든식품 없음) | |
| 3 | A회사 멤버 select | 0행 | |
| 4 | A회사 거래처 select | 0행 | |
| 5 | A company_id 위조 insert | **RLS 오류(거부)** | |
| 6(선택) | A회사 owner 위조 등록 | 거부 | |

- 전부 기대대로 → **8a-검증 완료**, 8b 진행 가능.
- 하나라도 어긋나면 → 해당 SQL 결과를 복사해 다음 세션에 전달(파서처럼 RLS도 실측 기반으로 수정).
