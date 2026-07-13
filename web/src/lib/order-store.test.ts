import { expect, test } from "vitest";
import {
  attachRawText,
  buildSeedRows,
  closeOrderPrices,
  correctConfirmedOrder,
  diffSeedRows,
  loadOrders,
  mapDbOrder,
  planCloseOrderPrices,
  planCustomerPriceSaves,
  saveOrder,
  toItemInserts,
  toOrderInsert,
  withRawTextCleared,
  type ConfirmedOrder,
  type DbOrderRow,
} from "./order-store";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sampleCustomerPrices,
  sampleCustomers,
  sampleProducts,
  samplePurchaseSuppliers,
} from "./sample-data";
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

test("toOrderInsert(W23-R2): 수량만 확정은 quantity_confirmed로 저장(가격 대기)", () => {
  expect(toOrderInsert("comp1", "cust1", "2026-07-11", "quantity_confirmed").status).toBe(
    "quantity_confirmed",
  );
  // 기본값은 여전히 confirmed — 기존 경로 A 무변경
  expect(toOrderInsert("comp1", "cust1", "2026-07-11").status).toBe("confirmed");
});

test("toOrderInsert(R5b): 정정본은 원주문 링크와 correction 출처만 저장한다", () => {
  expect(
    toOrderInsert("comp1", "cust1", "2026-07-13", "quantity_confirmed", {
      correctedFromOrderId: "original-1",
      source: "correction",
    }),
  ).toEqual({
    company_id: "comp1",
    customer_id: "cust1",
    order_date: "2026-07-13",
    source: "correction",
    status: "quantity_confirmed",
    corrected_from_order_id: "original-1",
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
      { id: "it1", product_id: "p1", raw_name: "콩나물 2박스", quantity: "2", unit: "박스", unit_price: 8000, amount: 16000 },
      { id: "it2", product_id: "p2", raw_name: null, quantity: 3, unit: null, unit_price: 2500, amount: 7500 },
    ],
  };
  const order = mapDbOrder(row, products);
  expect(order.total).toBe(23500);
  expect(order.lines[0].id).toBe("it1"); // R3: 라인 id 전파(정확한 라인 단가 마감용)
  expect(order.lines[1].id).toBe("it2");
  expect(order.lines[0].quantity).toBe(2); // numeric 문자열 방어
  expect(order.lines[1].unit).toBe("판"); // unit null → baseUnit 폴백
  expect(order.margin).toBe((8000 - 6500) * 2); // p2는 매입단가 없음 → 제외
  expect(order.customerName).toBe("가람식당");
  expect(order.status).toBe("confirmed"); // status 누락(구 픽스처/구버전 행) → confirmed 정규화
});

test("mapDbOrder(W23-R2): quantity_confirmed는 가격 대기로, 모르는 값은 confirmed로 정규화", () => {
  const base: DbOrderRow = {
    id: "o2",
    order_date: "2026-07-11",
    customer_id: "c1",
    customer: { name: "가람식당" },
    items: [],
  };
  expect(mapDbOrder({ ...base, status: "quantity_confirmed" }, []).status).toBe("quantity_confirmed");
  expect(mapDbOrder({ ...base, status: "confirmed" }, []).status).toBe("confirmed");
  expect(mapDbOrder({ ...base, status: "draft" }, []).status).toBe("confirmed"); // 예약값 방어
});

test("mapDbOrder(R5b): cancelled와 정정 연결/시작 표식을 이력 모델로 보존한다", () => {
  const base: DbOrderRow = {
    id: "original-1",
    order_date: "2026-07-13",
    customer_id: "c1",
    status: "cancelled",
    corrected_from_order_id: null,
    correction_started_at: "2026-07-13T12:00:00.000Z",
    customer: { name: "가람식당" },
    items: [],
  };
  expect(mapDbOrder(base, [])).toMatchObject({
    status: "cancelled",
    correctedFromOrderId: null,
    correctionStartedAt: "2026-07-13T12:00:00.000Z",
  });
});

const orderWithLines = (id: string): ConfirmedOrder => ({
  id,
  date: "2026-07-08",
  customerId: "c1",
  customerName: "가람식당",
  lines: [
    { id: `${id}_it1`, productId: "p1", productName: "콩나물", quantity: 2, unit: "박스", unitPrice: 8000, amount: 16000, basePurchasePrice: 6500 },
  ],
  total: 16000,
  margin: 3000,
  status: "confirmed",
});

test("attachRawText: order_id로 원문 병합, 매칭 없으면 그대로", () => {
  const orders = [orderWithLines("o1"), orderWithLines("o2")];
  const merged = attachRawText(orders, [
    { order_id: "o1", raw_text: "콩나물 2박스" },
    { order_id: "o2", raw_text: null }, // 삭제된 원문
    { order_id: null, raw_text: "버려짐" }, // order_id 없으면 무시
  ]);
  expect(merged[0].rawText).toBe("콩나물 2박스");
  expect(merged[1].rawText).toBe(null);
  // 원문 병합이 주문 내역(금액/품목)을 건드리지 않는다
  expect(merged[0].total).toBe(16000);
  expect(merged[0].lines).toHaveLength(1);
});

test("withRawTextCleared: 해당 주문 rawText만 null, lines/total 불변", () => {
  const orders = [{ ...orderWithLines("o1"), rawText: "지울 원문" }, { ...orderWithLines("o2"), rawText: "유지" }];
  const cleared = withRawTextCleared(orders, "o1");
  expect(cleared[0].rawText).toBe(null);
  expect(cleared[0].lines).toEqual(orders[0].lines); // 품목 그대로
  expect(cleared[0].total).toBe(16000); // 금액 그대로
  expect(cleared[1].rawText).toBe("유지"); // 다른 주문 영향 없음
});

test("mapDbOrder: 품목이 로드 목록에 없으면 raw_name 폴백", () => {
  const row: DbOrderRow = {
    id: "o2",
    order_date: "2026-07-06",
    customer_id: "c1",
    customer: null,
    items: [{ id: "itX", product_id: "missing", raw_name: "옛품목 1개", quantity: 1, unit: "개", unit_price: 100, amount: 100 }],
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
  expect(rows.suppliers.length).toBe(samplePurchaseSuppliers.length);
  expect(rows.products.length).toBe(sampleProducts.length);
  expect(rows.prices.length).toBe(sampleCustomerPrices.length);
  expect(rows.aliases.length).toBe(sampleProducts.reduce((s, p) => s + (p.aliases?.length ?? 0), 0));
  // 모든 행이 같은 회사
  for (const r of [...rows.customers, ...rows.suppliers, ...rows.products, ...rows.aliases, ...rows.prices]) {
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
  const supplierIds = new Set(rows.suppliers.map((s) => s.id));
  const productsWithSupplier = rows.products.filter((p) => p.purchase_supplier_id);
  expect(productsWithSupplier.length).toBeGreaterThan(0);
  for (const p of productsWithSupplier) {
    expect(supplierIds.has(p.purchase_supplier_id!)).toBe(true);
  }
  // 매입단가 nullable 유지(없는 품목은 null)
  const withNull = rows.products.filter((p) => p.base_purchase_price === null);
  expect(withNull.length).toBeGreaterThan(0);
});

test("부분 시드 오판 방지: customers만 존재하면 products/prices 누락분을 기존 id 재사용으로 보충", () => {
  // 시나리오: 이전 시드가 customers insert 후 중단 → customers만 존재
  const existingCustomers = sampleCustomers.map((c, i) => ({ id: `old-c${i}`, name: c.name }));
  let n = 0;
  const rows = diffSeedRows("comp1", existingCustomers, [], [], () => `new-${++n}`);

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
  const existingSuppliers = samplePurchaseSuppliers.map((s, i) => ({ id: `s${i}`, name: s.name }));
  const supplierBySampleId = new Map(samplePurchaseSuppliers.map((s, i) => [s.id, `s${i}`]));
  const existingProducts = sampleProducts.map((p, i) => ({
    id: `p${i}`,
    name: p.name,
    purchase_supplier_id: p.purchaseSupplierId ? supplierBySampleId.get(p.purchaseSupplierId) ?? null : null,
  }));
  const rows = diffSeedRows("comp1", existingCustomers, existingProducts, existingSuppliers, () => {
    throw new Error("완전 시드 상태에선 새 id를 만들면 안 됨");
  });
  expect(rows.customers.length).toBe(0);
  expect(rows.suppliers.length).toBe(0);
  expect(rows.products.length).toBe(0);
  expect(rows.productSupplierUpdates.length).toBe(0);
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
  const rows = diffSeedRows("comp1", [], existingProducts, [], () => `new-${++n}`);
  expect(rows.customers.length).toBe(sampleCustomers.length);
  expect(rows.suppliers.length).toBe(samplePurchaseSuppliers.length);
  expect(rows.products.length).toBe(0);
  expect(rows.productSupplierUpdates.length).toBeGreaterThan(0);
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

test("부분 시드 보정: 매입처만 없으면 기존 품목에 매입처 id를 이어 붙인다", () => {
  const existingCustomers = sampleCustomers.map((c, i) => ({ id: `c${i}`, name: c.name }));
  const existingProducts = sampleProducts.map((p, i) => ({ id: `p${i}`, name: p.name, purchase_supplier_id: null }));
  let n = 0;
  const rows = diffSeedRows("comp1", existingCustomers, existingProducts, [], () => `new-${++n}`);

  expect(rows.customers.length).toBe(0);
  expect(rows.products.length).toBe(0);
  expect(rows.suppliers.length).toBe(samplePurchaseSuppliers.length);
  expect(rows.productSupplierUpdates.length).toBeGreaterThan(0);

  const insertedSupplierIds = new Set(rows.suppliers.map((s) => s.id));
  for (const patch of rows.productSupplierUpdates) {
    expect(insertedSupplierIds.has(patch.purchase_supplier_id)).toBe(true);
  }
});

// ── W23-R3 가격 마감: 순수 계획 함수 planCloseOrderPrices ──
// DB에서 읽은 실제 라인(id 기준)과 사용자 입력 단가를 대조해, 확정 전에 전부 검증한다.
// 검증 실패면 {ok:false} — DB 실행 함수는 이걸 받고 아무것도 UPDATE하지 않는다.

const line = (id: string) => ({ id });

test("planCloseOrderPrices: 모든 라인 입력 정상 → id 기준 updates(라인 순서 유지)", () => {
  const plan = planCloseOrderPrices([line("a"), line("b")], [
    { lineId: "b", unitPrice: 2500 },
    { lineId: "a", unitPrice: 8000 },
  ]);
  expect(plan).toEqual({
    ok: true,
    updates: [
      { lineId: "a", unitPrice: 8000 },
      { lineId: "b", unitPrice: 2500 },
    ],
  });
});

test("planCloseOrderPrices: 소수 단가는 원 단위 정수로 반올림", () => {
  const plan = planCloseOrderPrices([line("a")], [{ lineId: "a", unitPrice: 1234.6 }]);
  expect(plan).toEqual({ ok: true, updates: [{ lineId: "a", unitPrice: 1235 }] });
});

test("planCloseOrderPrices: 동일 품목 여러 줄이어도 각 라인 id에 정확히 매핑", () => {
  // 같은 콩나물이 두 줄(수량 분리 주문) — product_id가 아니라 라인 id로 구분되어야 한다
  const plan = planCloseOrderPrices([line("l1"), line("l2")], [
    { lineId: "l1", unitPrice: 8000 },
    { lineId: "l2", unitPrice: 8200 },
  ]);
  expect(plan).toEqual({
    ok: true,
    updates: [
      { lineId: "l1", unitPrice: 8000 },
      { lineId: "l2", unitPrice: 8200 },
    ],
  });
});

test("planCloseOrderPrices: 라인이 없으면 오류(빈 주문 확정 방지)", () => {
  const plan = planCloseOrderPrices([], [{ lineId: "a", unitPrice: 1 }]);
  expect(plan.ok).toBe(false);
});

test("planCloseOrderPrices: 단가 누락(입력 안 된 라인) → 오류, 아무것도 확정 안 함", () => {
  const plan = planCloseOrderPrices([line("a"), line("b")], [{ lineId: "a", unitPrice: 8000 }]);
  expect(plan.ok).toBe(false);
});

test("planCloseOrderPrices: 음수 단가 → 오류", () => {
  const plan = planCloseOrderPrices([line("a")], [{ lineId: "a", unitPrice: -1 }]);
  expect(plan.ok).toBe(false);
});

test("planCloseOrderPrices: NaN 단가 → 오류", () => {
  const plan = planCloseOrderPrices([line("a")], [{ lineId: "a", unitPrice: Number.NaN }]);
  expect(plan.ok).toBe(false);
});

test("planCloseOrderPrices: 무한대 단가 → 오류", () => {
  const plan = planCloseOrderPrices([line("a")], [{ lineId: "a", unitPrice: Number.POSITIVE_INFINITY }]);
  expect(plan.ok).toBe(false);
});

test("planCloseOrderPrices: 중복 라인 id 입력 → 오류", () => {
  const plan = planCloseOrderPrices([line("a"), line("b")], [
    { lineId: "a", unitPrice: 100 },
    { lineId: "a", unitPrice: 200 },
    { lineId: "b", unitPrice: 300 },
  ]);
  expect(plan.ok).toBe(false);
});

test("planCloseOrderPrices: 다른 주문의 라인 id 입력 → 오류", () => {
  const plan = planCloseOrderPrices([line("a")], [
    { lineId: "a", unitPrice: 100 },
    { lineId: "other-order-line", unitPrice: 200 },
  ]);
  expect(plan.ok).toBe(false);
});

test("planCloseOrderPrices: 입력 수와 실제 라인 수가 다르면(초과) 오류", () => {
  const plan = planCloseOrderPrices([line("a")], [
    { lineId: "a", unitPrice: 100 },
    { lineId: "b", unitPrice: 200 },
  ]);
  expect(plan.ok).toBe(false);
});

// ── W23-R3 검수: 거래처 기본단가 저장 계획(순수) — 동일 품목 다줄 충돌 처리 ──

const clRow = (id: string, productId: string, productName: string) => ({ id, productId, productName });

test("planCustomerPriceSaves: 체크된 라인만 저장, 단일 라인은 그대로", () => {
  const r = planCustomerPriceSaves(
    [clRow("l1", "p1", "콩나물"), clRow("l2", "p2", "두부")],
    { l1: 8000, l2: 2500 },
    { l1: true, l2: false },
  );
  expect(r.saves).toEqual([{ productId: "p1", price: 8000 }]);
  expect(r.conflicts).toEqual([]);
});

test("planCustomerPriceSaves: 같은 품목 여러 줄·같은 단가면 1건 저장(충돌 아님)", () => {
  const r = planCustomerPriceSaves(
    [clRow("l1", "p1", "콩나물"), clRow("l2", "p1", "콩나물")],
    { l1: 8000, l2: 8000 },
    { l1: true, l2: true },
  );
  expect(r.saves).toEqual([{ productId: "p1", price: 8000 }]);
  expect(r.conflicts).toEqual([]);
});

test("planCustomerPriceSaves: 같은 품목 여러 줄·다른 단가면 저장 제외 + 충돌 경고(조용한 덮어쓰기 금지)", () => {
  const r = planCustomerPriceSaves(
    [clRow("l1", "p1", "콩나물"), clRow("l2", "p1", "콩나물"), clRow("l3", "p2", "두부")],
    { l1: 8000, l2: 8500, l3: 2500 },
    { l1: true, l2: true, l3: true },
  );
  // p1은 충돌 → 저장에서 제외, p2만 저장
  expect(r.saves).toEqual([{ productId: "p2", price: 2500 }]);
  expect(r.conflicts).toEqual(["콩나물"]);
});

test("planCustomerPriceSaves: 충돌은 체크된 라인끼리만 판정(체크 안 된 다른 단가 줄은 무시)", () => {
  const r = planCustomerPriceSaves(
    [clRow("l1", "p1", "콩나물"), clRow("l2", "p1", "콩나물")],
    { l1: 8000, l2: 8500 },
    { l1: true, l2: false }, // l2는 체크 안 됨 → 충돌 아님
  );
  expect(r.saves).toEqual([{ productId: "p1", price: 8000 }]);
  expect(r.conflicts).toEqual([]);
});

// ── W23-R3 검수: closeOrderPrices / saveOrder DB 오케스트레이션 (fake supabase mock) ──
// 체이너블 쿼리 빌더를 흉내내 (table, op, eqs, select, values)를 기록·응답한다.
// 목적: 영향 행 검증(정확히 1행)·status 승격 순서·부분 실패 시 미승격을 실측.

function makeFakeDb(handler: (call: FakeCall) => { data: unknown; error: unknown } | undefined) {
  const calls: FakeCall[] = [];
  const makeBuilder = (table: string) => {
    const call: FakeCall = { table, op: "select", values: undefined, eqs: [], selectCols: null, single: false };
    const finalize = () => {
      calls.push(call);
      return Promise.resolve(handler(call) ?? { data: null, error: null });
    };
    const builder: Record<string, unknown> = {
      insert(v: unknown) { call.op = "insert"; call.values = v; return builder; },
      update(v: unknown) { call.op = "update"; call.values = v; return builder; },
      select(cols: string) { call.selectCols = cols; return builder; },
      eq(k: string, val: unknown) { call.eqs.push([k, val]); return builder; },
      is() { return builder; },
      in() { return builder; },
      not() { return builder; },
      order() { return builder; },
      single() { call.single = true; return finalize(); },
      maybeSingle() { call.single = true; return finalize(); },
      then(res: (v: unknown) => unknown, rej: (e: unknown) => unknown) { return finalize().then(res, rej); },
    };
    return builder;
  };
  const db = {
    from: (t: string) => makeBuilder(t),
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
  } as unknown as SupabaseClient;
  return { db, calls };
}

interface FakeCall {
  table: string;
  op: "select" | "insert" | "update";
  values: unknown;
  eqs: Array<[string, unknown]>;
  selectCols: string | null;
  single: boolean;
}

const isOrdersUpdateToConfirmed = (c: FakeCall) =>
  c.table === "ordermoa_orders" && c.op === "update" && (c.values as { status?: string })?.status === "confirmed";

test("closeOrderPrices: 정상 — 라인별 1행 UPDATE 후 confirmed 승격", async () => {
  const { db, calls } = makeFakeDb((c) => {
    if (c.table === "ordermoa_orders" && c.op === "select" && c.selectCols === "status") return { data: { status: "quantity_confirmed" }, error: null };
    if (c.table === "ordermoa_order_items" && c.op === "select" && c.selectCols === "id") return { data: [{ id: "a" }, { id: "b" }], error: null };
    if (c.table === "ordermoa_order_items" && c.op === "update") {
      const id = c.eqs.find((e) => e[0] === "id")?.[1];
      return { data: [{ id }], error: null }; // 정확히 1행
    }
    if (isOrdersUpdateToConfirmed(c)) return { data: [{ id: "o1" }], error: null }; // flip 1행
    if (c.table === "ordermoa_orders" && c.op === "select" && c.single) {
      return { data: { id: "o1", order_date: "2026-07-11", customer_id: "c1", status: "confirmed", customer: { name: "가람식당" }, items: [{ id: "a", product_id: "p1", raw_name: null, quantity: 2, unit: "박스", unit_price: 8000, amount: 16000 }, { id: "b", product_id: "p2", raw_name: null, quantity: 3, unit: "판", unit_price: 2500, amount: 7500 }] }, error: null };
    }
    if (c.table === "ordermoa_order_imports") return { data: [], error: null };
    return undefined;
  });
  const order = await closeOrderPrices(db, "comp1", "o1", [{ lineId: "a", unitPrice: 8000 }, { lineId: "b", unitPrice: 2500 }], []);
  expect(order.status).toBe("confirmed");
  expect(order.total).toBe(23500);
  expect(calls.some(isOrdersUpdateToConfirmed)).toBe(true);
});

test("closeOrderPrices: 라인 UPDATE가 0행이면 오류 + confirmed 승격 안 함(qc 유지)", async () => {
  const { db, calls } = makeFakeDb((c) => {
    if (c.table === "ordermoa_orders" && c.op === "select" && c.selectCols === "status") return { data: { status: "quantity_confirmed" }, error: null };
    if (c.table === "ordermoa_order_items" && c.op === "select" && c.selectCols === "id") return { data: [{ id: "a" }], error: null };
    if (c.table === "ordermoa_order_items" && c.op === "update") return { data: [], error: null }; // 0행!
    return undefined;
  });
  await expect(closeOrderPrices(db, "comp1", "o1", [{ lineId: "a", unitPrice: 8000 }], [])).rejects.toThrow();
  expect(calls.some(isOrdersUpdateToConfirmed)).toBe(false); // 승격 시도 없음
});

test("closeOrderPrices: 승격(flip)이 0행이면 오류(이미 처리됨)", async () => {
  const { db } = makeFakeDb((c) => {
    if (c.table === "ordermoa_orders" && c.op === "select" && c.selectCols === "status") return { data: { status: "quantity_confirmed" }, error: null };
    if (c.table === "ordermoa_order_items" && c.op === "select" && c.selectCols === "id") return { data: [{ id: "a" }], error: null };
    if (c.table === "ordermoa_order_items" && c.op === "update") return { data: [{ id: "a" }], error: null };
    if (isOrdersUpdateToConfirmed(c)) return { data: [], error: null }; // flip 0행
    return undefined;
  });
  await expect(closeOrderPrices(db, "comp1", "o1", [{ lineId: "a", unitPrice: 8000 }], [])).rejects.toThrow();
});

test("closeOrderPrices: 가격 대기가 아니면 오류 + 어떤 UPDATE도 안 함", async () => {
  const { db, calls } = makeFakeDb((c) => {
    if (c.table === "ordermoa_orders" && c.op === "select" && c.selectCols === "status") return { data: { status: "confirmed" }, error: null };
    return undefined;
  });
  await expect(closeOrderPrices(db, "comp1", "o1", [{ lineId: "a", unitPrice: 1 }], [])).rejects.toThrow();
  expect(calls.some((c) => c.op === "update")).toBe(false);
});

test("saveOrder(경로 A): quantity_confirmed로 라인 삽입 후 confirmed로 승격", async () => {
  const { db, calls } = makeFakeDb((c) => {
    if (c.table === "ordermoa_orders" && c.op === "insert") return { data: { id: "o1", order_date: "2026-07-11", customer_id: "c1", status: "quantity_confirmed", customer: { name: "가람식당" } }, error: null };
    if (c.table === "ordermoa_order_items" && c.op === "insert") return { data: [{ id: "a", product_id: "p1", raw_name: null, quantity: 2, unit: "박스", unit_price: 8000, amount: 16000 }], error: null };
    if (isOrdersUpdateToConfirmed(c)) return { data: [{ id: "o1" }], error: null };
    return undefined;
  });
  const order = await saveOrder(db, "comp1", "c1", "2026-07-11", [{ productId: "p1", rawName: null, quantity: 2, unit: "박스", unitPrice: 8000 }], [], null, "confirmed");
  // INSERT 가드(0011)와 공존: 주문 행은 quantity_confirmed로 생성됨
  const orderInsert = calls.find((c) => c.table === "ordermoa_orders" && c.op === "insert");
  expect((orderInsert?.values as { status: string }).status).toBe("quantity_confirmed");
  // 이후 confirmed로 승격
  expect(calls.some(isOrdersUpdateToConfirmed)).toBe(true);
  expect(order.status).toBe("confirmed");
});

test("saveOrder(경로 B): 수량만 확정은 quantity_confirmed로 남고 승격 안 함", async () => {
  const { db, calls } = makeFakeDb((c) => {
    if (c.table === "ordermoa_orders" && c.op === "insert") return { data: { id: "o2", order_date: "2026-07-11", customer_id: "c1", status: "quantity_confirmed", customer: { name: "가람식당" } }, error: null };
    if (c.table === "ordermoa_order_items" && c.op === "insert") return { data: [{ id: "a", product_id: "p1", raw_name: null, quantity: 2, unit: "박스", unit_price: 0, amount: 0 }], error: null };
    return undefined;
  });
  const order = await saveOrder(db, "comp1", "c1", "2026-07-11", [{ productId: "p1", rawName: null, quantity: 2, unit: "박스", unitPrice: 0 }], [], null, "quantity_confirmed");
  expect(order.status).toBe("quantity_confirmed");
  expect(calls.some(isOrdersUpdateToConfirmed)).toBe(false); // 승격 없음
});

test("loadOrders(R5b): 0012 컬럼이 없으면 기존 목록을 반환하고 정정 UI를 비활성화한다", async () => {
  const { db } = makeFakeDb((c) => {
    if (c.table === "ordermoa_orders" && c.op === "select" && c.selectCols?.includes("corrected_from_order_id")) {
      return { data: null, error: { code: "42703", message: "column corrected_from_order_id does not exist" } };
    }
    if (c.table === "ordermoa_orders" && c.op === "select") {
      return {
        data: [{ id: "o1", order_date: "2026-07-13", customer_id: "c1", status: "confirmed", customer: { name: "가람식당" }, items: [] }],
        error: null,
      };
    }
    if (c.table === "ordermoa_order_imports") return { data: [], error: null };
    return undefined;
  });
  await expect(loadOrders(db, "comp1", [])).resolves.toMatchObject({
    correctionSchemaReady: false,
    orders: [expect.objectContaining({ id: "o1", status: "confirmed" })],
  });
});

test("loadOrders(R5b): PostgREST schema cache의 0012 컬럼 누락도 기존 목록으로 폴백한다", async () => {
  const { db } = makeFakeDb((c) => {
    if (c.table === "ordermoa_orders" && c.op === "select" && c.selectCols?.includes("corrected_from_order_id")) {
      return { data: null, error: { code: "PGRST204", message: "Could not find the 'correction_started_at' column of 'ordermoa_orders' in the schema cache" } };
    }
    if (c.table === "ordermoa_orders" && c.op === "select") {
      return {
        data: [{ id: "o1", order_date: "2026-07-13", customer_id: "c1", status: "confirmed", customer: { name: "가람식당" }, items: [] }],
        error: null,
      };
    }
    if (c.table === "ordermoa_order_imports") return { data: [], error: null };
    return undefined;
  });

  await expect(loadOrders(db, "comp1", [])).resolves.toMatchObject({
    correctionSchemaReady: false,
    orders: [expect.objectContaining({ id: "o1", status: "confirmed" })],
  });
});

test("correctConfirmedOrder: 원주문 취소와 정정 시작 표식을 단일 조건부 UPDATE 후 새 정정본을 저장한다", async () => {
  const { db, calls } = makeFakeDb((c) => {
    if (c.table === "ordermoa_orders" && c.op === "update" && (c.values as { status?: string })?.status === "cancelled") {
      return { data: [{ id: "original-1" }], error: null };
    }
    if (c.table === "ordermoa_orders" && c.op === "insert") {
      return { data: { id: "correction-1", order_date: "2026-07-13", customer_id: "c1", status: "quantity_confirmed", customer: { name: "가람식당" } }, error: null };
    }
    if (c.table === "ordermoa_order_items" && c.op === "insert") {
      return { data: [{ id: "line-1", product_id: "p1", raw_name: "콩나물", quantity: 3, unit: "박스", unit_price: 8000, amount: 24000 }], error: null };
    }
    if (isOrdersUpdateToConfirmed(c)) return { data: [{ id: "correction-1" }], error: null };
    return undefined;
  });

  const corrected = await correctConfirmedOrder(
    db,
    "comp1",
    { ...orderWithLines("original-1"), correctionStartedAt: null },
    "2026-07-13",
    [{ productId: "p1", rawName: "콩나물", quantity: 3, unit: "박스", unitPrice: 8000 }],
    [],
  );

  expect(corrected).toMatchObject({ id: "correction-1", status: "confirmed", correctedFromOrderId: "original-1" });
  const cancel = calls.find((c) => c.table === "ordermoa_orders" && c.op === "update" && (c.values as { status?: string })?.status === "cancelled");
  expect(cancel?.values).toMatchObject({ status: "cancelled", correction_started_at: expect.any(String) });
  expect(cancel?.eqs).toEqual(expect.arrayContaining([["company_id", "comp1"], ["id", "original-1"], ["status", "confirmed"]]));
  const inserted = calls.find((c) => c.table === "ordermoa_orders" && c.op === "insert");
  expect(inserted?.values).toMatchObject({ source: "correction", corrected_from_order_id: "original-1", status: "quantity_confirmed" });
});

test("correctConfirmedOrder: 표식 없는 취소 주문은 재발행하지 않는다", async () => {
  const { db, calls } = makeFakeDb(() => undefined);
  await expect(
    correctConfirmedOrder(
      db,
      "comp1",
      { ...orderWithLines("original-1"), status: "cancelled", correctionStartedAt: null },
      "2026-07-13",
      [{ productId: "p1", rawName: null, quantity: 1, unit: "박스", unitPrice: 8000 }],
      [],
    ),
  ).rejects.toThrow("이미 처리된 주문");
  expect(calls.some((c) => c.op === "insert" || c.op === "update")).toBe(false);
});

test("correctConfirmedOrder: 조건부 취소가 0행이어도 표식 있는 취소 원주문만 재조회 후 재발행한다", async () => {
  const { db, calls } = makeFakeDb((c) => {
    if (c.table === "ordermoa_orders" && c.op === "update" && (c.values as { status?: string })?.status === "cancelled") {
      return { data: [], error: null };
    }
    if (c.table === "ordermoa_orders" && c.op === "select" && c.selectCols === "status,correction_started_at") {
      return { data: { status: "cancelled", correction_started_at: "2026-07-13T12:00:00.000Z" }, error: null };
    }
    if (c.table === "ordermoa_orders" && c.op === "insert") {
      return { data: { id: "correction-2", order_date: "2026-07-13", customer_id: "c1", status: "quantity_confirmed", customer: { name: "가람식당" } }, error: null };
    }
    if (c.table === "ordermoa_order_items" && c.op === "insert") {
      return { data: [{ id: "line-2", product_id: "p1", raw_name: null, quantity: 1, unit: "박스", unit_price: 8000, amount: 8000 }], error: null };
    }
    if (isOrdersUpdateToConfirmed(c)) return { data: [{ id: "correction-2" }], error: null };
    return undefined;
  });
  await expect(
    correctConfirmedOrder(
      db,
      "comp1",
      orderWithLines("original-1"),
      "2026-07-13",
      [{ productId: "p1", rawName: null, quantity: 1, unit: "박스", unitPrice: 8000 }],
      [],
    ),
  ).resolves.toMatchObject({ id: "correction-2", correctedFromOrderId: "original-1" });
  expect(calls.some((c) => c.table === "ordermoa_orders" && c.op === "select" && c.selectCols === "status,correction_started_at")).toBe(true);
});
