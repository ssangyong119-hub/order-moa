import { expect, test } from "vitest";
import { buildTodayWorkQueue, type QueueOrder } from "./dashboard-queue";

const TODAY = "2026-07-12";

const order = (over: Partial<QueueOrder>): QueueOrder => ({
  id: "o1",
  date: TODAY,
  customerId: "c1",
  customerName: "가람식당",
  status: "confirmed",
  lines: [{ productId: "p1", productName: "콩나물" }],
  ...over,
});

const products = [
  { id: "p1", purchaseSupplierName: "두부콩나물매입처" },
  { id: "p2", purchaseSupplierName: "야채매입처" },
  { id: "p3", purchaseSupplierName: null }, // 미지정
];

test("가격 대기: quantity_confirmed만 집계 — 날짜 무관, 오래된 것 먼저", () => {
  const q = buildTodayWorkQueue(
    [
      order({ id: "a", status: "quantity_confirmed", date: "2026-07-11", customerName: "한빛카페", lines: [{ productId: "p1", productName: "콩나물" }, { productId: "p2", productName: "미나리" }] }),
      order({ id: "b", status: "quantity_confirmed", date: TODAY }),
      order({ id: "c", status: "confirmed" }), // 최종 확정은 가격 대기 아님
    ],
    products,
    TODAY,
  );
  expect(q.pricePendingCount).toBe(2);
  expect(q.pricePendingOrders.map((o) => o.id)).toEqual(["a", "b"]); // 어제 것 먼저
  expect(q.pricePendingOrders[0]).toEqual({ id: "a", customerName: "한빛카페", date: "2026-07-11", lineCount: 2 });
  expect(q.unhandledCount).toBe(2); // 미처리 = 가격 대기
});

test("명세서 준비: 오늘 confirmed만 — 어제 confirmed·가격 대기 제외", () => {
  const q = buildTodayWorkQueue(
    [
      order({ id: "a", status: "confirmed", date: TODAY }),
      order({ id: "b", status: "confirmed", date: "2026-07-11" }), // 어제 → 제외
      order({ id: "c", status: "quantity_confirmed", date: TODAY }), // qc → 제외
    ],
    products,
    TODAY,
  );
  expect(q.todayConfirmedCount).toBe(1);
});

test("cancelled는 어떤 카드에도 포함되지 않는다", () => {
  const q = buildTodayWorkQueue(
    [
      order({ id: "a", status: "cancelled", date: TODAY }),
      order({ id: "b", status: "cancelled", date: "2026-07-11" }),
    ],
    products,
    TODAY,
  );
  expect(q.pricePendingCount).toBe(0);
  expect(q.todayOrderCount).toBe(0);
  expect(q.todayConfirmedCount).toBe(0);
  expect(q.todayItemKinds).toBe(0);
  expect(q.unhandledCount).toBe(0);
});

test("매입처 발주 파생: 오늘(confirmed+qc) 주문의 품목 종류·매입처 그룹(미지정=1그룹)", () => {
  const q = buildTodayWorkQueue(
    [
      order({ id: "a", status: "confirmed", lines: [{ productId: "p1", productName: "콩나물" }, { productId: "p2", productName: "미나리" }] }),
      order({ id: "b", status: "quantity_confirmed", lines: [{ productId: "p1", productName: "콩나물" }, { productId: "p3", productName: "계란" }] }),
      order({ id: "c", status: "confirmed", date: "2026-07-11", lines: [{ productId: "p2", productName: "미나리" }] }), // 어제 → 제외
    ],
    products,
    TODAY,
  );
  expect(q.todayOrderCount).toBe(2);
  expect(q.todayItemKinds).toBe(3); // p1, p2, p3 (중복 p1은 1종)
  expect(q.todaySupplierGroups).toBe(3); // 두부콩나물·야채·미지정
});

test("빈 주문이면 전부 0", () => {
  const q = buildTodayWorkQueue([], products, TODAY);
  expect(q).toEqual({
    today: TODAY,
    pricePendingOrders: [],
    pricePendingCount: 0,
    todayOrderCount: 0,
    todayItemKinds: 0,
    todaySupplierGroups: 0,
    todayConfirmedCount: 0,
    unhandledCount: 0,
  });
});
