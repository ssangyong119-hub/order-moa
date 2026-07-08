export type PaddedDeliveryNoteRow<T> =
  | { kind: "item"; line: T }
  | { kind: "blank"; line: null };

// A4 세로 1장에 표가 하단까지 자연스럽게 내려오도록 고정하는 최소 행 수.
// 화면/인쇄 미리보기가 같은 형태로 떨어지게 하려는 값(품목이 적어도 이 수만큼 빈 줄로 채움).
export const DELIVERY_NOTE_MIN_ROWS = 15;

export function padDeliveryNoteLines<T>(
  lines: T[],
  minRows: number = DELIVERY_NOTE_MIN_ROWS,
): PaddedDeliveryNoteRow<T>[] {
  const itemRows: PaddedDeliveryNoteRow<T>[] = lines.map((line) => ({ kind: "item", line }));
  const blankCount = Math.max(0, minRows - itemRows.length);
  return [
    ...itemRows,
    ...Array.from({ length: blankCount }, () => ({ kind: "blank" as const, line: null })),
  ];
}
