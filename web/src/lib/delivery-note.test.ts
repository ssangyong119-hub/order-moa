import { expect, test } from "vitest";
import { DELIVERY_NOTE_MIN_ROWS, padDeliveryNoteLines } from "./delivery-note";

test("거래명세서는 품목이 적어도 최소 행 수까지 빈 줄을 채운다", () => {
  const rows = padDeliveryNoteLines([{ productName: "콩나물" }, { productName: "두부" }], 8);
  expect(rows).toHaveLength(8);
  expect(rows[0]).toEqual({ kind: "item", line: { productName: "콩나물" } });
  expect(rows[1]).toEqual({ kind: "item", line: { productName: "두부" } });
  expect(rows.slice(2).every((row) => row.kind === "blank")).toBe(true);
});

test("거래명세서 품목이 최소 행보다 많으면 실제 품목을 자르지 않는다", () => {
  const lines = Array.from({ length: 13 }, (_, index) => ({ productName: `품목${index + 1}` }));
  const rows = padDeliveryNoteLines(lines, 8);
  expect(rows).toHaveLength(13);
  expect(rows[12]).toEqual({ kind: "item", line: { productName: "품목13" } });
});

test("기본 고정 행 수(15)로 채운다 — 품목 1개여도 표가 A4 하단까지 내려오게", () => {
  expect(DELIVERY_NOTE_MIN_ROWS).toBe(15);
  const rows = padDeliveryNoteLines([{ productName: "콩나물" }]);
  expect(rows).toHaveLength(15);
  expect(rows[0]).toEqual({ kind: "item", line: { productName: "콩나물" } });
  expect(rows.slice(1).every((row) => row.kind === "blank")).toBe(true);
});
