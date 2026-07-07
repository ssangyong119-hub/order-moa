# 매입처 연락처·주소 칸 추가 — Supabase에 0005 적용하기 (비개발자용)

작성일: 2026-07-07 (Claude)
소요 시간: 약 2분
대상 파일: `web/supabase/migrations/0005_supplier_contact.sql`

## 이게 뭔가요?

매입처 관리 화면이 거래처 관리처럼 **연락처·주소**까지 입력받게 확장됐습니다.
이 작업은 DB의 매입처 보관함(`ordermoa_suppliers`)에 연락처/주소 **칸 2개를 추가**하는 것입니다.

- 기존 매입처 데이터는 **하나도 지워지지 않습니다** — 칸만 늘어나고, 기존 매입처는 연락처/주소가 비어 있는 상태로 유지됩니다.
- 데이터 잠금(RLS) 규칙은 기존 그대로입니다.

> ⚠️ **중요**: 최신 앱 코드는 이 칸이 있다고 가정합니다. **이 작업을 하기 전까지는 로그인(DB) 모드에서 데이터 로딩 오류가 나는 게 정상**입니다. 적용하면 해결됩니다. (데모 모드는 영향 없음)
>
> 이 SQL은 다시 실행해도 안전합니다(`add column if not exists`). 두 번 실행해도 `Success. No rows returned`면 정상.

## 순서

1. **Supabase 접속** — 브라우저에서 https://supabase.com → 로그인 → `yangsan-inventory` 프로젝트 클릭.

2. **SQL Editor 열기** — 왼쪽 메뉴에서 **SQL Editor** 클릭 → **New query**(새 쿼리) 버튼.

3. **파일 내용 복사** — 컴퓨터에서 아래 파일을 메모장으로 열고 **전체 선택(Ctrl+A) → 복사(Ctrl+C)**:
   ```
   D:\Documents\ERP-1\web\supabase\migrations\0005_supplier_contact.sql
   ```

4. **붙여넣고 실행** — SQL Editor 빈칸에 붙여넣기(Ctrl+V) → **Run**(또는 Ctrl+Enter).

5. **성공 확인** — `Success. No rows returned` 라고 나오면 끝.

## 잘 됐는지 확인 (1분)

1. 왼쪽 메뉴 **Table Editor** → `ordermoa_suppliers` 클릭.
2. 컬럼에 `phone` 과 `address` 가 새로 보이면 성공 (기존 매입처 행은 그 칸이 비어 있음 — 정상).
3. 앱에서 로그인 → 매입처 관리 → 매입처 하나 열어 연락처 입력 → 수정 저장 → F5 후에도 유지되는지 확인.

## 이런 메시지가 나오면?

| 메시지 | 뜻 | 조치 |
|---|---|---|
| `Success. No rows returned` | 정상 적용 | 없음 — 완료 |
| 다시 실행해도 같은 메시지 | 이미 적용됨 | 정상 — 아무것도 안 해도 됨 |
| 그 외 빨간 오류 | 예상 밖 상황 | 오류 문구를 복사해서 Claude/Codex에게 전달 |

## 하지 말아야 할 것

- `ordermoa_` 로 시작하지 않는 테이블(양산 재고용)은 **절대 만지지 마세요.**
- SQL을 임의로 수정해서 실행하지 마세요 — 파일 그대로 복사·실행만.

## 참고 — 담당자명(contact_name)은?

이번에는 넣지 않았습니다. 발주 문장·화면 어디에서도 아직 쓸 곳이 없어서요.
필요해지면 `contact_name text` 칸 하나만 추가하면 됩니다(같은 방식의 2줄짜리 SQL).
