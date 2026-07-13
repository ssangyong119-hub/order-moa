import { expect, test } from "vitest";
import {
  canCorrectOrder,
  orderToParsedLines,
  replaceOrderById,
} from "./order-correction";
import type { ConfirmedOrder } from "./order-store";

const confirmedOrder: ConfirmedOrder = {
  id: "order-1",
  date: "2026-07-13",
  customerId: "customer-1",
  customerName: "가람식당",
  lines: [
    {
      id: "item-1",
      productId: "product-1",
      productName: "콩나물",
      quantity: 2,
      unit: "박스",
      unitPrice: 8000,
      amount: 16000,
      basePurchasePrice: 6500,
    },
  ],
  total: 16000,
  margin: 3000,
  status: "confirmed",
};

test("orderToParsedLines: 확정 스냅샷을 편집 가능한 검수표 라인으로 복사한다", () => {
  expect(orderToParsedLines(confirmedOrder)).toEqual([
    expect.objectContaining({
      id: "correction-order-1-item-1",
      rawText: "콩나물 2박스",
      productId: "product-1",
      productName: "콩나물",
      quantity: 2,
      unit: "박스",
      unitPrice: 8000,
      status: "matched",
      wasUnmatched: false,
    }),
  ]);
});

test("canCorrectOrder: confirmed만 정정 가능하며 활성 정정본이 있으면 막는다", () => {
  expect(canCorrectOrder(confirmedOrder, [])).toBe(true);
  expect(canCorrectOrder({ ...confirmedOrder, status: "quantity_confirmed" }, [])).toBe(false);
  expect(canCorrectOrder({ ...confirmedOrder, status: "cancelled" }, [])).toBe(false);
  expect(canCorrectOrder(confirmedOrder, [{ correctedFromOrderId: "order-1" }])).toBe(false);
});

test("replaceOrderById: 새 정정본만 활성 목록에 넣고 나머지는 유지한다", () => {
  const replacement = { ...confirmedOrder, id: "correction-1", correctedFromOrderId: "order-1" };
  expect(replaceOrderById([confirmedOrder, { ...confirmedOrder, id: "order-2" }], "order-1", replacement)).toEqual([
    replacement,
    { ...confirmedOrder, id: "order-2" },
  ]);
});
