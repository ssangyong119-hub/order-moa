import { expect, test } from "vitest";
import {
  buildAggregateRows,
  buildContributionText,
  formatPurchaseOrderText,
  formatQtyUnit,
  type AggregatableOrder,
} from "./aggregate";

const productOrder = [{ id: "p01" }, { id: "p05" }, { id: "p03" }]; // 콩나물, 깐양파, 두부

// 예: 1거래처 콩나물 3 / 2거래처 콩나물 2·양파 2 / 3거래처 콩나물 2·양파 1
const orders: AggregatableOrder[] = [
  {
    customerId: "c1",
    customerName: "가람식당",
    lines: [{ productId: "p01", productName: "콩나물", unit: "박스", quantity: 3 }],
  },
  {
    customerId: "c2",
    customerName: "한빛카페",
    lines: [
      { productId: "p01", productName: "콩나물", unit: "박스", quantity: 2 },
      { productId: "p05", productName: "양파", unit: "망", quantity: 2 },
    ],
  },
  {
    customerId: "c3",
    customerName: "으뜸반찬",
    lines: [
      { productId: "p01", productName: "콩나물", unit: "박스", quantity: 2 },
      { productId: "p05", productName: "양파", unit: "망", quantity: 1 },
    ],
  },
];

test("buildAggregateRows: 품목별 총수량 + 거래처 수 + 정렬", () => {
  const rows = buildAggregateRows(orders, productOrder);
  expect(rows.map((r) => [r.name, r.qty, r.unit, r.custCount])).toEqual([
    ["콩나물", 7, "박스", 3],
    ["양파", 3, "망", 2],
  ]);
});

test("buildAggregateRows: 거래처별 기여(수량 내림차순)", () => {
  const rows = buildAggregateRows(orders, productOrder);
  const kong = rows[0];
  // 수량 내림차순, 동률(2)은 한글 이름순(으뜸 < 한)
  expect(kong.contributions.map((c) => [c.customerName, c.qty])).toEqual([
    ["가람식당", 3],
    ["으뜸반찬", 2],
    ["한빛카페", 2],
  ]);
});

test("같은 거래처가 같은 품목을 두 번 시키면 합산된다", () => {
  const dup: AggregatableOrder[] = [
    { customerId: "c1", customerName: "가람식당", lines: [{ productId: "p01", productName: "콩나물", unit: "박스", quantity: 2 }] },
    { customerId: "c1", customerName: "가람식당", lines: [{ productId: "p01", productName: "콩나물", unit: "박스", quantity: 1 }] },
  ];
  const rows = buildAggregateRows(dup, productOrder);
  expect(rows[0].qty).toBe(3);
  expect(rows[0].custCount).toBe(1);
  expect(rows[0].contributions).toEqual([{ customerId: "c1", customerName: "가람식당", qty: 3 }]);
});

test("formatPurchaseOrderText: 제목 + 품목별 수량 줄", () => {
  const rows = buildAggregateRows(orders, productOrder);
  expect(formatPurchaseOrderText(rows, "오늘 발주 합산")).toBe(
    "오늘 발주 합산\n콩나물 7박스\n양파 3망",
  );
});

test("formatPurchaseOrderText: 빈 결과면 제목만", () => {
  expect(formatPurchaseOrderText([], "오늘 발주 합산")).toBe("오늘 발주 합산");
});

test("buildContributionText: 거래처별 내역 문장", () => {
  const rows = buildAggregateRows(orders, productOrder);
  expect(buildContributionText(rows[0])).toBe("가람식당 3박스, 으뜸반찬 2박스, 한빛카페 2박스");
});

test("formatQtyUnit: 단위 없으면 수량만", () => {
  expect(formatQtyUnit(7, "박스")).toBe("7박스");
  expect(formatQtyUnit(7, "")).toBe("7");
});
