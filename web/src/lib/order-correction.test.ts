import { expect, test } from "vitest";
import {
  canCorrectOrder,
  orderToParsedLines,
  upsertCorrectedOrder,
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

test("upsertCorrectedOrder: 원주문이 활성 목록에 있으면 그 자리에서 교체하고 나머지는 유지한다", () => {
  const replacement = { ...confirmedOrder, id: "correction-1", correctedFromOrderId: "order-1" };
  expect(upsertCorrectedOrder([confirmedOrder, { ...confirmedOrder, id: "order-2" }], "order-1", replacement)).toEqual([
    replacement,
    { ...confirmedOrder, id: "order-2" },
  ]);
});

test("upsertCorrectedOrder: 원주문이 활성 목록에 없으면(복구 재발행) 정정본을 맨 앞에 추가한다", () => {
  // 복구 재발행은 취소 이력의 원주문에서 시작하므로 원주문이 활성 orders에 없다.
  // 이때 교체만 하면 정정본이 유실되어 새로고침 전까지 목록·월합계·대시보드에서 사라진다.
  const other = { ...confirmedOrder, id: "order-2" };
  const reissued = { ...confirmedOrder, id: "correction-2", correctedFromOrderId: "cancelled-1" };
  expect(upsertCorrectedOrder([other], "cancelled-1", reissued)).toEqual([reissued, other]);
});
