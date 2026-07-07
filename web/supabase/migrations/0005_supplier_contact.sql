-- 오더모아 1차 보강(W07 확장): 매입처 기본정보(연락처/주소) 컬럼 추가.
-- 기존 데이터는 그대로 두고 컬럼만 추가한다(null 허용, 삭제 없음).
-- RLS는 기존 ordermoa_suppliers 정책(0004)이 테이블 단위라 그대로 적용됨 — 정책 변경 불필요.
-- contact_name(담당자명)은 이번에 넣지 않음 — 발주 문장/화면 어디서도 아직 안 쓰여서 보류(설계만: text null 컬럼 하나면 충분).

alter table public.ordermoa_suppliers
  add column if not exists phone text;

alter table public.ordermoa_suppliers
  add column if not exists address text;
