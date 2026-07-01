-- 오더모아 단위 8a — 회사 생성 + owner 멤버 부트스트랩 RPC (공유 Supabase 프로젝트용)
-- 근거: docs/supabase-rls-policy.md §4.1 (RPC/서버 트랜잭션 우선)
-- 공유 프로젝트 충돌 방지: RPC/테이블에 `ordermoa_` 접두사.
-- 회사 생성 직후엔 멤버 row가 없어 RLS로 첫 owner 등록이 막히는 문제를 회피하기 위해,
-- companies insert + company_members(role='owner') insert를 하나의 security definer 트랜잭션으로 처리한다.

create or replace function public.ordermoa_create_company_with_owner(p_name text, p_business_number text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid;
begin
  if v_uid is null then
    raise exception 'auth required';
  end if;
  if p_name is null or char_length(btrim(p_name)) < 1 then
    raise exception 'company name required';
  end if;

  insert into public.ordermoa_companies (name, business_number, owner_user_id)
  values (btrim(p_name), nullif(btrim(coalesce(p_business_number, '')), ''), v_uid)
  returning id into v_company_id;

  insert into public.ordermoa_company_members (company_id, user_id, role)
  values (v_company_id, v_uid, 'owner');

  return v_company_id;
end;
$$;

-- 로그인 사용자만 실행 가능
revoke all on function public.ordermoa_create_company_with_owner(text, text) from public, anon;
grant execute on function public.ordermoa_create_company_with_owner(text, text) to authenticated;
