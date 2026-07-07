# 매입처 저장 기능 켜기 — Supabase에 0004 적용하기 (비개발자용)

작성일: 2026-07-07 (Claude)
소요 시간: 약 3분
대상 파일: `web/supabase/migrations/0004_suppliers.sql`

## 이게 뭔가요?

지금 앱의 "야채매입처" 같은 매입처 정보는 화면에만 있어서 새로고침하면 사라질 수 있습니다.
이 작업은 DB(Supabase)에 **매입처 보관함(테이블)** 을 만들어서, 매입처와 "이 품목은 어느 매입처에서 산다"가 영구 저장되게 합니다.

> ⚠️ **중요**: 최신 앱 코드는 이 보관함이 있다고 가정합니다. **이 작업을 하기 전까지는 로그인(DB) 모드에서 "데이터 준비 중 문제가 발생했습니다" 오류가 나는 게 정상**입니다. 아래를 적용하면 해결됩니다. (데모 모드는 영향 없음)
>
> 이 SQL은 다시 실행해도 최대한 안전하게 만들어두었습니다. 실수로 같은 내용을 한 번 더 실행해도 `Success. No rows returned`가 나오면 정상입니다.

## 순서

1. **Supabase 접속** — 브라우저에서 https://supabase.com → 로그인 → `yangsan-inventory` 프로젝트 클릭.

2. **SQL Editor 열기** — 왼쪽 메뉴에서 **SQL Editor** 클릭 → **New query**(새 쿼리) 버튼.

3. **파일 내용 복사** — 컴퓨터에서 아래 파일을 메모장으로 열고 **전체 선택(Ctrl+A) → 복사(Ctrl+C)**:
   ```
   D:\Documents\ERP-1\web\supabase\migrations\0004_suppliers.sql
   ```

4. **붙여넣고 실행** — SQL Editor 빈칸에 붙여넣기(Ctrl+V) → 오른쪽 아래 **Run**(또는 Ctrl+Enter).

5. **성공 확인** — 아래에 `Success. No rows returned` 라고 나오면 끝.

## 잘 됐는지 확인 (1분)

1. 왼쪽 메뉴 **Table Editor** 클릭.
2. 테이블 목록에서 `ordermoa_suppliers` 가 새로 보이면 성공.
3. 앱을 열어 실제 로그인 → 화면이 정상적으로 뜨고, 최초 진입이면 샘플 매입처 5개(야채매입처 등)가 자동 설치됩니다.

## 이런 메시지가 나오면?

| 메시지 | 뜻 | 조치 |
|---|---|---|
| `Success. No rows returned` | 정상 적용 | 없음 — 완료 |
| 다시 실행했는데 `Success. No rows returned` | 이미 적용된 내용을 다시 확인한 상태 | 정상 — 아무것도 안 해도 됨 |
| `relation "ordermoa_suppliers" already exists` | 예전 버전 SQL을 실행했거나 일부만 적용된 상태일 수 있음 | 새 파일 내용으로 다시 실행. 계속 나오면 오류 문구 전달 |
| `column "purchase_supplier_id" ... already exists` | 예전 버전 SQL을 실행했거나 일부만 적용된 상태일 수 있음 | 새 파일 내용으로 다시 실행. 계속 나오면 오류 문구 전달 |
| 그 외 빨간 오류 | 예상 밖 상황 | 오류 문구를 복사해서 Claude/Codex에게 전달 |

## 하지 말아야 할 것

- `ordermoa_` 로 시작하지 않는 테이블(양산 재고용)은 **절대 만지지 마세요.**
- SQL을 임의로 수정해서 실행하지 마세요 — 파일 그대로 복사·실행만.
