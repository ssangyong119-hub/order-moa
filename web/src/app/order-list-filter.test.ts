import { expect, test } from "vitest";
import { filterOrdersForList } from "./order-list-filter";

const order = (id: string, date: string, status: string) =>
  ({ id, date, status }) as unknown as Parameters<typeof filterOrdersForList>[0][number];

const orders = [
  order("a", "2026-07-12", "confirmed"),
  order("b", "2026-07-12", "quantity_confirmed"),
  order("c", "2026-07-11", "quantity_confirmed"),
  order("d", "2026-07-11", "confirmed"),
];

test("상태=가격 대기: quantity_confirmed만 남는다 (날짜 전체)", () => {
  expect(filterOrdersForList(orders, "", "quantity_confirmed").map((o) => o.id)).toEqual(["b", "c"]);
});

test("상태=최종 확정: confirmed만 남는다", () => {
  expect(filterOrdersForList(orders, "", "confirmed").map((o) => o.id)).toEqual(["a", "d"]);
});

test("날짜와 상태 필터는 함께 적용된다", () => {
  expect(filterOrdersForList(orders, "2026-07-12", "quantity_confirmed").map((o) => o.id)).toEqual(["b"]);
});

test("상태=전체·날짜=전체면 모두 반환", () => {
  expect(filterOrdersForList(orders, "", "all").map((o) => o.id)).toEqual(["a", "b", "c", "d"]);
});
