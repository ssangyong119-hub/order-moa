# 회사 PC 작업 인수인계

작성일: 2026-05-26

## 1. GitHub 저장소

저장소 주소:

```text
https://github.com/ssangyong119-hub/order-moa
```

작업 브랜치:

```text
codex/order-moa-mvp
```

## 2. 회사 PC에서 처음 시작할 때

PowerShell을 열고 작업할 폴더로 이동한다.

예:

```powershell
cd D:\Documents
```

저장소를 처음 받는 경우:

```powershell
git clone https://github.com/ssangyong119-hub/order-moa.git
cd order-moa
git switch codex/order-moa-mvp
```

브랜치 확인:

```powershell
git branch --show-current
```

아래처럼 나오면 정상이다.

```text
codex/order-moa-mvp
```

## 3. 이미 회사 PC에 폴더가 있는 경우

기존 프로젝트 폴더로 이동한다.

```powershell
cd D:\Documents\order-moa
```

최신 내용 받기:

```powershell
git fetch origin
git switch codex/order-moa-mvp
git pull
```

## 4. 앱 실행 방법

브라우저에서 아래 파일을 연다.

```text
index.html
```

또는 PowerShell에서:

```powershell
start .\index.html
```

현재 앱에서 확인할 기능:

- 거래처 등록
- 품목 등록
- 거래처별 단가 등록
- 발주 입력
- 도매상 발주 합산
- 거래명세서 미리보기
- JSON 자료 내보내기/가져오기

## 5. 테스트 실행

PowerShell에서:

```powershell
npm test
```

정상 결과:

```text
tests 5
pass 5
fail 0
```

## 6. 회사에서 Codex 호출 문구

Codex를 열고 프로젝트 폴더를 `order-moa`로 맞춘 뒤 아래처럼 말한다.

```text
오더모아 프로젝트 이어서 작업하자.
현재 폴더 기준으로 docs/erp-discovery-log.md,
docs/order-moa-product-definition.md,
docs/superpowers/plans/2026-05-26-order-moa-mvp.md,
docs/company-pc-handoff.md를 읽고 현재 상태를 파악한 뒤 이어가줘.
브랜치는 codex/order-moa-mvp야.
```

## 7. Google Drive 자료 폴더 만들기

Google Drive에 아래 폴더를 만든다.

```text
오더모아
```

추천 하위 폴더:

```text
오더모아/
├─ 01_기획문서/
├─ 02_설문결과/
├─ 03_현장자료_캡처/
├─ 04_경쟁사조사/
├─ 05_화면설계/
└─ 06_회의메모/
```

Google Drive 데스크톱 앱이 설치되어 있고 로컬 경로가 보이면, PowerShell로도 만들 수 있다.

예시 1:

```powershell
cd G:\내 드라이브
mkdir 오더모아
cd 오더모아
mkdir 01_기획문서, 02_설문결과, 03_현장자료_캡처, 04_경쟁사조사, 05_화면설계, 06_회의메모
```

예시 2:

```powershell
cd "G:\My Drive"
mkdir 오더모아
cd 오더모아
mkdir 01_기획문서, 02_설문결과, 03_현장자료_캡처, 04_경쟁사조사, 05_화면설계, 06_회의메모
```

Google Drive 경로는 PC마다 다를 수 있다.

## 8. Google Drive에 넣을 자료

`01_기획문서`:

- `docs/erp-discovery-log.md`
- `docs/order-moa-product-definition.md`
- `docs/company-pc-handoff.md`

`02_설문결과`:

- 네이버폼 응답 엑셀
- 설문 요약

`03_현장자료_캡처`:

- 이카운트 화면 캡처
- 거래명세서 캡처
- 카카오톡 발주 예시
- 발주 사진 예시

주의:

- 거래처명, 전화번호, 사업자번호, 계좌번호 등 민감정보는 가리고 저장한다.

## 9. 회사에서 새 작업 후 집에서 이어가기

회사에서 작업을 끝내면:

```powershell
git status
git add .
git commit -m "작업 내용 요약"
git push
```

집에서 이어갈 때:

```powershell
git switch codex/order-moa-mvp
git pull
```

## 10. 내일 우선 작업 후보

1. 현재 MVP 화면을 회사 PC에서 열어보기
2. 친구 업무 흐름 기준으로 화면이 맞는지 점검하기
3. 발주 입력 화면을 더 실제 업무처럼 바꿀지 논의하기
4. 거래명세서 양식을 이카운트 캡처와 비슷하게 다듬기
5. 설문 응답이 들어오면 결과 정리 파일 만들기

