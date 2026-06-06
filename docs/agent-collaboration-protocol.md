# Codex-Claude 협업 프로토콜

작성일: 2026-06-06

## 1. 목적

이 문서는 오더모아 프로젝트에서 Codex와 Claude가 같은 작업 폴더를 사용하면서 충돌 없이 협업하기 위한 운영 규칙입니다.

기본 운영 모델:

- Codex: 제품 방향, 작업 지시, 문서화, 검증, 리뷰, Git/GitHub 관리, 전체 일정 관리
- Claude: 앱 구현, 코드 작성, UI 구현, 리팩터링, 테스트 작성

역할은 기본값일 뿐이며 절대적인 제한이 아닙니다.

## 2. 협업 원칙

1. 하나의 목표를 공유한다.
2. 같은 파일을 동시에 수정하지 않는다.
3. 작업 전후로 git 상태를 확인한다.
4. 기능 구현 전 제품 목적과 보안 기준을 확인한다.
5. 테스트 없이 완료를 주장하지 않는다.
6. 중요한 판단은 문서에 남긴다.
7. 역할에 갇히지 않고 서로 보완한다.

## 3. 작업 폴더 운영

공용 저장소:

```text
D:\Documents\ERP-1
```

GitHub:

```text
https://github.com/ssangyong119-hub/order-moa
```

기본 브랜치:

```text
codex/order-moa-mvp
```

작업 시작 전:

```powershell
git status --short
git branch --show-current
git pull
```

작업 종료 전:

```powershell
npm test
git status --short
```

## 4. 접근금지/충돌 방지 조항

### 4.1 상대 작업 파일 보호

Codex 또는 Claude가 특정 파일을 작업 중이라고 명시하면, 상대는 그 파일을 수정하지 않습니다.

예:

```text
Claude 작업 중: app/(dashboard)/orders/page.tsx
Codex 접근 금지: app/(dashboard)/orders/page.tsx
```

```text
Codex 작업 중: docs/web-mvp-roadmap.md
Claude 접근 금지: docs/web-mvp-roadmap.md
```

### 4.2 작업 로그

현재 작업 중인 파일은 `docs/agent-worklog.md`에 기록합니다.

기록 예:

```markdown
## 2026-06-06 22:50 Claude

작업 중:

- app/(dashboard)/orders/page.tsx
- lib/order-parser.ts

접근금지 요청:

- 위 파일은 작업 완료 전까지 수정하지 말 것
```

### 4.3 예외

긴급 보안 문제, 테스트 실패, 빌드 실패처럼 즉시 수정이 필요한 경우에는 수정 전 먼저 사용자에게 알립니다.

## 5. 역할 분담

### Codex 역할

- 요구사항 정리
- 제품 방향 결정 보조
- 설문/인터뷰 분석
- 작업 지시서 작성
- 보안/개인정보 검토
- 구현 결과 리뷰
- 테스트/검증 확인
- GitHub 브랜치/커밋/푸시 관리
- Claude 작업 결과 통합 판단

### Claude 역할

- 웹 앱 구현
- UI 컴포넌트 작성
- Supabase 연동
- 데이터 모델 구현
- 발주 파서 구현
- 테스트 작성
- 리팩터링
- 구현 중 발견한 제품/UX/보안 이슈 제안

### 공유 역할

- 더 나은 구조 제안
- 위험 발견
- 문서 개선
- 테스트 보강
- 사용자 목표 재확인

## 6. 작업 전달 방식

Codex가 Claude에게 줄 작업 지시는 다음 구조를 사용합니다.

```markdown
# Claude 작업 지시

목표:

- ...

읽을 문서:

- ...

수정 허용 파일:

- ...

수정 금지 파일:

- ...

구현 요구사항:

- ...

보안 요구사항:

- ...

검증 명령:

- ...

완료 보고:

- 변경 파일
- 테스트 결과
- 남은 이슈
```

## 7. Claude 완료 보고 방식

Claude는 작업 완료 후 아래를 남깁니다.

```markdown
## Claude 완료 보고

완료한 일:

- ...

변경 파일:

- ...

검증:

- `npm test`: 통과/실패

주의할 점:

- ...

Codex 리뷰 요청:

- ...
```

## 8. Git 운영

작은 변경:

- 같은 브랜치 `codex/order-moa-mvp`에서 작업 가능

큰 기능:

- 별도 브랜치 사용 권장

브랜치 예:

```text
claude/web-auth-spike
claude/order-parser
codex/web-mvp-planning
```

커밋 메시지 예:

```text
feat: add order paste parser
test: cover order aggregation rules
docs: update web mvp security checklist
fix: enforce company scoped customer query
```

## 9. 보안/개인정보 운영

MVP라도 아래는 반드시 지킵니다.

- `.env` 파일 커밋 금지
- Supabase service role key 클라이언트 노출 금지
- 고객 연락처/사업자번호가 테스트 데이터에 실제값으로 들어가지 않게 주의
- 설문 원본의 연락처를 문서에 옮기지 않기
- 카톡 캡처/거래명세서 원본은 Google Drive 자료 폴더에서만 관리

## 10. 우선순위 판단 규칙

새 기능이 떠오르면 다음 순서로 판단합니다.

1. 설문 결과와 연결되는가?
2. 발주 취합 문제를 더 빨리 검증하는가?
3. 보안 리스크가 감당 가능한가?
4. MVP 1차에 꼭 필요한가?
5. 기존 ERP 대체 또는 보조 가치가 명확한가?

위 기준을 통과하지 못하면 보류합니다.

## 11. 현재 합의된 MVP 1차

포함:

- 로그인
- 회사/사업장 생성
- 거래처 등록
- 품목 등록
- 거래처별 단가 등록
- 카톡/문자 발주 붙여넣기
- 사람이 확인/수정하는 파싱 화면
- 거래처별 주문표
- 품목별 총 발주/출고 합산표
- 거래명세서 미리보기
- CSV/Excel 내보내기

제외:

- 카카오톡 자동 읽기
- 완전 자동 OCR
- 홈택스 세금계산서 직접 발행
- 은행 입금 자동 매칭
- 이카운트 직접 연동

