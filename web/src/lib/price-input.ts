// 금액 입력 공통 UX (R5a) — 파싱 확인·가격 마감·단가 관리에서 재사용.
// 저장 차단(빈값/음수/NaN/무한대)은 각 화면의 기존 검증 규칙이 담당한다. 여기선 표시 정규화·포커스 이동만.

/**
 * blur 시 표시 정규화: 유효한 0 이상 정수/실수면 원 단위 정수 문자열로(선행 0 "05"→"5" 제거).
 * 빈 값은 빈 값 유지, 음수·NaN·무한대는 원본 유지(상위 검증이 차단).
 */
export function normalizePriceInput(raw: string): string {
  const t = raw.trim();
  if (t === "") return "";
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return raw;
  return String(Math.round(n));
}

/**
 * Enter 시 같은 표 안 selector에 해당하는 다음 입력칸으로 포커스 이동 + 전체선택.
 * 마지막 칸이면 blur만(기존 저장/흐름을 깨지 않는다).
 */
export function focusNextPriceInput(current: HTMLInputElement, selector: string): void {
  const inputs = Array.from(
    current.closest("table")?.querySelectorAll<HTMLInputElement>(selector) ?? [],
  );
  const i = inputs.indexOf(current);
  if (i >= 0 && i < inputs.length - 1) {
    const next = inputs[i + 1];
    next.focus();
    next.select();
  } else {
    current.blur();
  }
}
