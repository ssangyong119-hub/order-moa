export type PaddedDeliveryNoteRow<T> =
  | { kind: "item"; line: T }
  | { kind: "blank"; line: null };

export function padDeliveryNoteLines<T>(lines: T[], minRows = 10): PaddedDeliveryNoteRow<T>[] {
  const itemRows: PaddedDeliveryNoteRow<T>[] = lines.map((line) => ({ kind: "item", line }));
  const blankCount = Math.max(0, minRows - itemRows.length);
  return [
    ...itemRows,
    ...Array.from({ length: blankCount }, () => ({ kind: "blank" as const, line: null })),
  ];
}
