import { expect, test } from "vitest";
import {
  buildSeedRows,
  diffSeedRows,
  mapDbOrder,
  toItemInserts,
  toOrderInsert,
  type DbOrderRow,
} from "./order-store";
import { sampleCustomerPrices, sampleCustomers, sampleProducts } from "./sample-data";
import type { Product } from "./domain/types";

test("toOrderInsert: confirmed 주문 + 스냅샷 기준 필드", () => {
  expect(toOrderInsert("comp1", "cust1", "2026-07-06")).toEqual({
    company_id: "comp1",
    customer_id: "cust1",
    order_date: "2026-07-06",
    source: "kakao",
    status: "confirmed",
  });
});

test("toItemInserts: amount(generated) 미포함 + unit_price 스냅샷 포함", () => {
  const rows = toItemInserts("comp1", "ord1", [
    { productId: "p1", rawName: "콩나물 2박스", quantity: 2, unit: "박스", unitPrice: 8000 },
    { productId: "p2", rawName: null, quantity: 3, unit: "", unitPrice: 2500 },
  ]);
  expect(rows).toEqual([
    { company_id: "comp1", order_id: "ord1", product_id: "p1", raw_name: "콩나물 2박스", quantity: 2, unit: "박스", unit_price: 8000 },
    { company_id: "comp1", order_id: "ord1", product_id: "p2", raw_name: null, quantity: 3, unit: null, unit_price: 2500 },
  ]);
  for (const r of rows) {
    expect("amount" in r).toBe(false); // generated 컬럼 — insert에 넣으면 DB 오류
  }
});

test("mapDbOrder: total=Σ라인 amount, 마진은 basePurchasePrice로 표시 시점 계산", () => {
  const products: Product[] = [
    { id: "p1", name: "콩나물", baseUnit: "박스", aliases: [], basePurchasePrice: 6500 },
    { id: "p2", name: "두부", baseUnit: "판", aliases: [], basePurchasePrice: null },
  ];
  const row: DbOrderRow = {
    id: "o1",
    order_date: "2026-07-06",
    customer_id: "c1",
    customer: { name: "가람식당" },
    items: [
      { product_id: "p1", raw_name: "콩나물 2박스", quantity: "2", unit: "박스", unit_price: 8000, amount: 16000 },
      { product_id: "p2", raw_name: null, quantity: 3, unit: null, unit_price: 2500, amount: 7500 },
    ],
  };
  const order = mapDbOrder(row, products);
  expect(order.total).toBe(23500);
  expect(order.lines[0].quantity).toBe(2); // numeric 문자열 방어
  expect(order.lines[1].unit).toBe("판"); // unit null → baseUnit 폴백
  expect(order.margin).toBe((8000 - 6500) * 2); // p2는 매입단가 없음 → 제외
  expect(order.customerName).toBe("가람식당");
});

test("mapDbOrder: 품목이 로드 목록에 없으면 raw_name 폴백", () => {
  const row: DbOrderRow = {
    id: "o2",
    order_date: "2026-07-06",
    customer_id: "c1",
    customer: null,
    items: [{ product_id: "missing", raw_name: "옛품목 1개", quantity: 1, unit: "개", unit_price: 100, amount: 100 }],
  };
  const order = mapDbOrder(row, []);
  expect(order.lines[0].productName).toBe("옛품목 1개");
  expect(order.customerName).toBe("거래처");
  expect(order.margin).toBe(null);
});

test("buildSeedRows: 샘플 전체를 회사 스코프 uuid로 매핑(참조 일관)", () => {
  let n = 0;
  const rows = buildSeedRows("comp1", () => `id-${++n}`);
  expect(rows.customers.length).toBe(sampleCustomers.length);
  expect(rows.products.length).toBe(sampleProducts.length);
  expect(rows.prices.length).toBe(sampleCustomerPrices.length);
  expect(rows.aliases.length).toBe(sampleProducts.reduce((s, p) => s + (p.aliases?.length ?? 0), 0));
  // 모든 행이 같은 회사
  for (const r of [...rows.customers, ...rows.products, ...rows.aliases, ...rows.prices]) {
    expect((r as { company_id: string }).company_id).toBe("comp1");
  }
  // 가격 행의 참조가 시드된 id 집합 안에 있는지(교차회사 트리거 통과 조건)
  const custIds = new Set(rows.customers.map((c) => c.id));
  const prodIds = new Set(rows.products.map((p) => p.id));
  for (const pr of rows.prices) {
    expect(custIds.has(pr.customer_id)).toBe(true);
    expect(prodIds.has(pr.product_id)).toBe(true);
  }
  for (const al of rows.aliases) {
    expect(prodIds.has(al.product_id)).toBe(true);
  }
  // 매입단가 nullable 유지(없는 품목은 null)
  const withNull = rows.products.filter((p) => p.base_purchase_price === null);
  expect(withNull.length).toBeGreaterThan(0);
});

test("부분 시드 오판 방지: customers만 존재하면 products/prices 누락분을 기존 id 재사용으로 보충", () => {
  // 시나리오: 이전 시드가 customers insert 후 중단 → customers만 존재
  const existingCustomers = sampleCustomers.map((c, i) => ({ id: `old-c${i}`, name: c.name }));
  let n = 0;
  const rows = diffSeedRows("comp1", existingCustomers, [], () => `new-${++n}`);

  // 거래처는 이미 있으므로 재생성 0 (중복 생성 금지)
  expect(rows.customers.length).toBe(0);
  // 품목/별칭/단가는 전량 생성 대상
  expect(rows.products.length).toBe(sampleProducts.length);
  expect(rows.prices.length).toBe(sampleCustomerPrices.length);

  // 단가가 "기존" 거래처 id를 재사용하는지(새 uuid로 끊어지면 안 됨)
  const oldIds = new Set(existingCustomers.map((c) => c.id));
  for (const pr of rows.prices) {
    expect(oldIds.has(pr.customer_id)).toBe(true);
  }
  // 품목 참조는 이번에 만든 새 id
  const newProdIds = new Set(rows.products.map((p) => p.id));
  for (const pr of rows.prices) {
    expect(newProdIds.has(pr.product_id)).toBe(true);
  }
  for (const al of rows.aliases) {
    expect(newProdIds.has(al.product_id)).toBe(true);
  }
});

test("완전 시드 상태: insert 대상 0 + aliases/prices는 기존 id 기준 upsert rows만", () => {
  const existingCustomers = sampleCustomers.map((c, i) => ({ id: `c${i}`, name: c.name }));
  const existingProducts = sampleProducts.map((p, i) => ({ id: `p${i}`, name: p.name }));
  const rows = diffSeedRows("comp1", existingCustomers, existingProducts, () => {
    throw new Error("완전 시드 상태에선 새 id를 만들면 안 됨");
  });
  expect(rows.customers.length).toBe(0);
  expect(rows.products.length).toBe(0);
  // upsert rows는 전부 기존 id 참조(ignoreDuplicates라 DB 변경 없음)
  const custIds = new Set(existingCustomers.map((c) => c.id));
  const prodIds = new Set(existingProducts.map((p) => p.id));
  for (const pr of rows.prices) {
    expect(custIds.has(pr.customer_id)).toBe(true);
    expect(prodIds.has(pr.product_id)).toBe(true);
  }
  for (const al of rows.aliases) {
    expect(prodIds.has(al.product_id)).toBe(true);
  }
});

test("products만 존재(역방향 부분 시드): customers/prices 보충 + 기존 품목 id 재사용", () => {
  const existingProducts = sampleProducts.map((p, i) => ({ id: `p${i}`, name: p.name }));
  let n = 0;
  const rows = diffSeedRows("comp1", [], existingProducts, () => `new-${++n}`);
  expect(rows.customers.length).toBe(sampleCustomers.length);
  expect(rows.products.length).toBe(0);
  const prodIds = new Set(existingProducts.map((p) => p.id));
  for (const al of rows.aliases) {
    expect(prodIds.has(al.product_id)).toBe(true);
  }
  const newCustIds = new Set(rows.customers.map((c) => c.id));
  for (const pr of rows.prices) {
    expect(newCustIds.has(pr.customer_id)).toBe(true);
    expect(prodIds.has(pr.product_id)).toBe(true);
  }
});
