import { expect, test } from "vitest";
import {
  aggregateRowKey,
  buildAggregateRows,
  buildContributionText,
  buildPurchaseChecklistSummary,
  buildSupplierPurchaseSections,
  formatPurchaseOrderText,
  formatSupplierPurchaseText,
  formatQtyUnit,
  supplierColorIndex,
  type AggregatableOrder,
} from "./aggregate";

const productOrder = [{ id: "p01" }, { id: "p05" }, { id: "p03" }]; // 콩나물, 깐양파, 두부
const productsWithSuppliers = [
  { id: "p01", purchaseSupplierName: "두부콩나물매입처" },
  { id: "p05", purchaseSupplierName: "야채매입처" },
  { id: "p03", purchaseSupplierName: "두부콩나물매입처" },
];

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

test("buildSupplierPurchaseSections: 체크된 품목만 매입처별로 묶는다", () => {
  const rows = buildAggregateRows(orders, productOrder);
  const sections = buildSupplierPurchaseSections(rows, productsWithSuppliers, new Set(["p01"]));
  expect(sections).toEqual([
    {
      supplierName: "두부콩나물매입처",
      rows: [rows[0]],
    },
  ]);
});

test("buildSupplierPurchaseSections: 체크된 품목이 없으면 매입처 발주문장도 비운다", () => {
  const rows = buildAggregateRows(orders, productOrder);
  expect(buildSupplierPurchaseSections(rows, productsWithSuppliers, new Set())).toEqual([]);
});

test("formatSupplierPurchaseText: 전체 복사 — 매입처 헤더 + 인사말(한 줄) + 번호 목록", () => {
  const rows = buildAggregateRows(orders, productOrder);
  const sections = buildSupplierPurchaseSections(rows, productsWithSuppliers, new Set(["p01", "p05"]));
  expect(formatSupplierPurchaseText(sections, { companyName: "오더모아유통" })).toBe(
    [
      "[두부콩나물매입처]",
      "오더모아유통입니다 발주 품목입니다",
      "",
      "1. 콩나물 7박스",
      "",
      "[야채매입처]",
      "오더모아유통입니다 발주 품목입니다",
      "",
      "1. 양파 3망",
    ].join("\n"),
  );
});

test("formatSupplierPurchaseText: 날짜를 첫 줄에 넣는다(R5a)", () => {
  const rows = buildAggregateRows(orders, productOrder);
  const [section] = buildSupplierPurchaseSections(rows, productsWithSuppliers, new Set(["p01"]));
  expect(
    formatSupplierPurchaseText([section], {
      companyName: "오더모아유통",
      withSupplierHeader: false,
      date: "2026-07-11",
    }),
  ).toBe("2026-07-11\n오더모아유통입니다 발주 품목입니다\n\n1. 콩나물 7박스");
});

test("formatSupplierPurchaseText: 개별 복사 — 매입처 헤더 없이 인사말부터(날짜 없음)", () => {
  const rows = buildAggregateRows(orders, productOrder);
  const [section] = buildSupplierPurchaseSections(rows, productsWithSuppliers, new Set(["p01"]));
  expect(
    formatSupplierPurchaseText([section], { companyName: "오더모아유통", withSupplierHeader: false }),
  ).toBe("오더모아유통입니다 발주 품목입니다\n\n1. 콩나물 7박스");
});

test("formatSupplierPurchaseText: 회사명 없으면 인사말 줄 생략", () => {
  const rows = buildAggregateRows(orders, productOrder);
  const [section] = buildSupplierPurchaseSections(rows, productsWithSuppliers, new Set(["p01"]));
  expect(formatSupplierPurchaseText([section], { withSupplierHeader: false })).toBe(
    "발주 품목입니다\n\n1. 콩나물 7박스",
  );
});

test("buildSupplierPurchaseSections: 이번 발주만 매입처 override(productId+unit) 적용 후 재그룹핑", () => {
  const rows = buildAggregateRows(orders, productOrder);
  // 콩나물(p01|박스)을 두부콩나물매입처 → 야채매입처로 이번만 재배정
  const override = new Map([[aggregateRowKey({ productId: "p01", unit: "박스" }), "야채매입처"]]);
  const sections = buildSupplierPurchaseSections(
    rows,
    productsWithSuppliers,
    new Set(["p01", "p05"]),
    override,
  );
  expect(sections.map((s) => [s.supplierName, s.rows.map((r) => r.name)])).toEqual([
    ["야채매입처", ["콩나물", "양파"]],
  ]);
});

test("buildPurchaseChecklistSummary: override로 미지정 품목을 배정하면 미지정 카운트 감소", () => {
  const rows = buildAggregateRows(orders, productOrder);
  const withUnassigned = [
    { id: "p01", purchaseSupplierName: "두부콩나물매입처" },
    { id: "p05", purchaseSupplierName: null }, // 미지정
  ];
  const override = new Map([[aggregateRowKey({ productId: "p05", unit: "망" }), "야채매입처"]]);
  const summary = buildPurchaseChecklistSummary(rows, new Set(["p01", "p05"]), withUnassigned, override);
  expect(summary.unassigned).toBe(0);
});

test("buildPurchaseChecklistSummary: 전체/담음/안담음/미지정 카운트", () => {
  const rows = buildAggregateRows(orders, productOrder); // 콩나물(두부콩나물), 양파(야채)
  const withUnassigned = [
    { id: "p01", purchaseSupplierName: "두부콩나물매입처" },
    { id: "p05", purchaseSupplierName: null }, // 미지정
  ];
  const summary = buildPurchaseChecklistSummary(rows, new Set(["p01"]), withUnassigned);
  expect(summary).toEqual({ total: 2, included: 1, excluded: 1, unassigned: 1 });
});

test("supplierColorIndex: 같은 이름은 항상 같은 색, 0..7 범위", () => {
  const a = supplierColorIndex("야채매입처");
  const b = supplierColorIndex("야채매입처");
  expect(a).toBe(b);
  expect(a).toBeGreaterThanOrEqual(0);
  expect(a).toBeLessThanOrEqual(7);
  expect(Number.isInteger(supplierColorIndex("두부콩나물매입처"))).toBe(true);
});
