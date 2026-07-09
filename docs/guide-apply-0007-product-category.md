# 0007 적용 가이드 — 품목 카테고리 6종 (Phase 2 / W19)

> Codex 승인 후, **사용자가 Supabase SQL Editor에서** 적용한다. Claude는 파일 작성까지만.
> 공유 프로젝트(`yangsan-inventory`)라 모든 객체는 `ordermoa_` 접두사. 이 마이그레이션은 **컬럼 1개 추가**뿐이라 위험 낮음(additive, 데이터 삭제 없음).

## 무엇을 바꾸나
- `ordermoa_products`에 `category` 컬럼 추가: `text · NOT NULL · DEFAULT '기타' · CHECK in (농산물/공산품/냉식/육류/수산/기타)`.
- 기존 품목 행은 전부 `'기타'`로 채워진다(DEFAULT + backfill). 원하는 카테고리는 적용 후 **품목·별칭 관리 화면**에서 바꾸면 된다.
- RLS/교차회사/트리거 **변경 없음**(기존 products 테이블 정책이 컬럼에 그대로 적용).
- `order_items`/`orders`/명세서/합산표/월합계 **무변경**(카테고리는 품목 마스터 속성).

## 적용 순서 (SQL Editor)
1. Supabase 대시보드 → SQL Editor → New query.
2. `web/supabase/migrations/0007_product_category.sql` **전문**을 붙여넣고 Run.
3. 성공 메시지(`Success. No rows returned` 또는 영향 행 수) 확인.
4. (선택) Table Editor → `ordermoa_products` → `category` 컬럼이 생기고 기존 행이 `기타`인지 확인.

> 멱등(idempotent): 두 번 실행해도 안전하다(add column if not exists / set default / backfill / set not null / pg_constraint 가드). 중간에 실패해 다시 돌려도 문제 없음.

## 적용 후 DB 모드 실측 체크리스트 (로그인 모드)
**0007 적용 전에는 DB 모드에서 카테고리가 전부 '기타'로만 보이고 저장이 안 된다(앱이 깨지진 않음 — 폴백). 적용 후 아래를 실측한다.**

- [ ] 로그인(비밀번호) → 품목·별칭 관리 화면 진입, 목록에 카테고리 표시(초기엔 전부 `기타`).
- [ ] 기존 품목 하나 수정 → 카테고리를 `농산물` 등으로 바꿔 저장 → **F5 후 유지** 확인.
- [ ] 새 품목 추가 시 카테고리 선택 → 저장 → 목록/필터에 반영 → F5 후 유지.
- [ ] 카테고리 필터(전체/6종) 동작 확인.
- [ ] 파싱 화면에서 **즉석 품목 등록** → 그 품목이 `기타`로 저장되는지(F5 후 유지).
- [ ] 회귀: 발주 붙여넣기 → 파싱 → 확정 → 합산표 → 명세서 → 월합계가 그대로 동작(카테고리와 무관).
- [ ] 데이터 내보내기 → 품목·별칭 CSV에 `카테고리` 열이 포함되는지.

## 롤백(필요 시)
- 컬럼만 추가했으므로 문제가 생기면 `alter table public.ordermoa_products drop column if exists category;` 로 되돌릴 수 있다(품목 데이터 자체는 보존). 단, 앱 코드가 category를 기대하므로 롤백 시 앱도 이전 커밋으로.
