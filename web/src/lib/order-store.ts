// 오더모아 8b — 주문 저장/조회 저장소 (Supabase DB 모드 전용).
// 원칙(task-prompt-unit-8):
//  - order_items.unit_price = 확정 시점 스냅샷. amount는 DB generated 컬럼 → insert에 넣지 않는다.
//  - 예상 마진은 저장하지 않고 표시 시점에 products.base_purchase_price로 계산(참고값).
//  - 거래처별 일/월 합계는 orders.order_date + customer_id + Σitems.amount로 쿼리 가능(스키마 보장).
//  - orders에는 delete 정책이 없음 → 저장 보상은 status='cancelled'(soft)로 처리.
// 데모 모드(Supabase 미설정)는 이 파일을 사용하지 않는다(기존 메모리 흐름 유지).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Customer, CustomerPrice, Product, Supplier } from "./domain/types";
import { estimatedOrderMargin, sumAmounts } from "./calculations";
import { normalizeProductCategory } from "./product-category";
import { isMissingCategoryColumn, selectProductsWithFallback } from "./product-store";
import {
  sampleCustomers,
  sampleCustomerPrices,
  sampleProducts,
  samplePurchaseSuppliers,
} from "./sample-data";

export interface OrderLine {
  /** order_items.id — 가격 마감(R3)에서 정확한 한 줄만 UPDATE하기 위한 라인 식별자. 데모 모드는 합성 id. */
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  basePurchasePrice: number | null;
}

/** W23-R2 주문 상태: confirmed=최종 확정(명세서 가능·월합계 포함) / quantity_confirmed=수량 확인·가격 대기(합산·매입처 발주만). */
export type OrderStatus = "confirmed" | "quantity_confirmed";

export interface ConfirmedOrder {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  lines: OrderLine[];
  total: number;
  margin: number | null;
  status: OrderStatus;
  /** 발주 원문(카톡/문자). undefined=미조회, null=없음/삭제됨, string=원문. */
  rawText?: string | null;
}

export interface DraftLine {
  productId: string;
  rawName: string | null;
  quantity: number;
  unit: string;
  unitPrice: number; // 확정 시점 스냅샷
}

// ── 순수 빌더 (단위 테스트 대상) ──

export function toOrderInsert(
  companyId: string,
  customerId: string,
  orderDate: string,
  status: OrderStatus = "confirmed",
) {
  return {
    company_id: companyId,
    customer_id: customerId,
    order_date: orderDate,
    source: "kakao",
    status,
  };
}

/** items insert payload — amount는 generated 컬럼이므로 절대 포함하지 않는다. */
export function toItemInserts(companyId: string, orderId: string, lines: DraftLine[]) {
  return lines.map((l) => ({
    company_id: companyId,
    order_id: orderId,
    product_id: l.productId,
    raw_name: l.rawName,
    quantity: l.quantity,
    unit: l.unit || null,
    unit_price: l.unitPrice,
  }));
}

interface DbItemRow {
  id: string;
  product_id: string;
  raw_name: string | null;
  quantity: number | string;
  unit: string | null;
  unit_price: number;
  amount: number;
}
export interface DbOrderRow {
  id: string;
  order_date: string;
  customer_id: string;
  /** 0010 이전 픽스처/구버전 호환 — 없거나 모르는 값이면 confirmed로 정규화. */
  status?: string;
  customer: { name: string } | null;
  items: DbItemRow[];
}

/** DB row → 화면 모델. total=Σ라인 amount(저장값 그대로), margin은 표시 시점 계산(참고값). */
export function mapDbOrder(row: DbOrderRow, products: Product[]): ConfirmedOrder {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: OrderLine[] = row.items.map((it) => {
    const p = byId.get(it.product_id);
    return {
      id: it.id,
      productId: it.product_id,
      productName: p?.name ?? it.raw_name ?? "품목",
      quantity: Number(it.quantity),
      unit: it.unit ?? p?.baseUnit ?? "",
      unitPrice: it.unit_price,
      amount: it.amount,
      basePurchasePrice: p?.basePurchasePrice ?? null,
    };
  });
  return {
    id: row.id,
    date: row.order_date,
    customerId: row.customer_id,
    customerName: row.customer?.name ?? "거래처",
    lines,
    total: sumAmounts(lines.map((l) => l.amount)),
    margin: estimatedOrderMargin(lines),
    status: row.status === "quantity_confirmed" ? "quantity_confirmed" : "confirmed",
  };
}

// ── W23-R3 가격 마감 (순수 계획 + DB 실행 분리) ──

/** 사용자가 입력한 라인별 최종 판매단가. lineId = order_items.id. */
export interface PriceCloseInput {
  lineId: string;
  unitPrice: number;
}

export type CloseOrderPlan =
  | { ok: true; updates: Array<{ lineId: string; unitPrice: number }> }
  | { ok: false; error: string };

/**
 * 가격 마감 계획(순수 · 테스트 대상). DB 라인(id 기준)과 입력을 대조해 확정 전 전량 검증한다.
 *  - 라인 0건 / 누락 / 중복 / 다른 주문 라인 / 라인 수 불일치 / 음수·NaN·무한대 → { ok:false }
 *  - 통과 시 라인 순서대로 정수 단가 updates 반환. product_id가 아니라 **라인 id**로만 매핑한다.
 * DB 실행 함수는 ok=false면 아무것도 UPDATE하지 않는다.
 */
export function planCloseOrderPrices(
  lines: Array<{ id: string }>,
  inputs: PriceCloseInput[],
): CloseOrderPlan {
  if (lines.length === 0) return { ok: false, error: "확정할 품목이 없습니다." };

  const lineIds = new Set(lines.map((l) => l.id));
  const byLine = new Map<string, number>();
  for (const inp of inputs) {
    if (!lineIds.has(inp.lineId)) return { ok: false, error: "이 주문에 없는 품목이 포함됐습니다. 새로고침 후 다시 시도해주세요." };
    if (byLine.has(inp.lineId)) return { ok: false, error: "같은 품목이 중복 입력됐습니다." };
    const v = Number(inp.unitPrice);
    if (!Number.isFinite(v) || v < 0) return { ok: false, error: "판매단가는 0 이상의 숫자여야 합니다." };
    byLine.set(inp.lineId, Math.round(v));
  }
  if (byLine.size !== lines.length) {
    return { ok: false, error: "판매단가를 입력하지 않은 품목이 있습니다." };
  }
  return { ok: true, updates: lines.map((l) => ({ lineId: l.id, unitPrice: byLine.get(l.id)! })) };
}

/**
 * '거래처 기본 단가에도 저장' 계획(순수 · 테스트 대상).
 * 같은 품목이 한 주문에 여러 줄이고 체크된 라인끼리 판매단가가 다르면 — 조용히 마지막 값으로 덮어쓰지 않고
 * 해당 품목을 저장에서 **제외**하고 conflicts에 담는다(판매단가 스냅샷 자체는 상위에서 정상 확정된다).
 * 같은 단가면 1건으로 저장. 체크되지 않은 라인은 판정에서 제외한다.
 */
export function planCustomerPriceSaves(
  lines: Array<{ id: string; productId: string; productName: string }>,
  priceByLine: Record<string, number>,
  saveFlags: Record<string, boolean>,
): { saves: Array<{ productId: string; price: number }>; conflicts: string[] } {
  const byProduct = new Map<string, { name: string; prices: Set<number> }>();
  for (const l of lines) {
    if (!saveFlags[l.id]) continue;
    const price = priceByLine[l.id];
    if (price === undefined || !Number.isFinite(price)) continue;
    const entry = byProduct.get(l.productId) ?? { name: l.productName, prices: new Set<number>() };
    entry.prices.add(Math.round(price));
    byProduct.set(l.productId, entry);
  }
  const saves: Array<{ productId: string; price: number }> = [];
  const conflicts: string[] = [];
  for (const [productId, { name, prices }] of byProduct) {
    if (prices.size > 1) conflicts.push(name); // 서로 다른 단가 → 충돌, 저장 제외
    else saves.push({ productId, price: [...prices][0] });
  }
  return { saves, conflicts };
}

export interface NamedRow {
  id: string;
  name: string;
}

export interface ExistingProductRow extends NamedRow {
  purchase_supplier_id?: string | null;
  purchaseSupplierId?: string | null;
}

/**
 * 시드 보정 rows — 부분 시드 상태에서도 안전하게 재시도 가능하도록,
 * 이미 존재하는 거래처/품목(이름 기준)은 재사용하고 **누락분만** insert 대상으로 만든다.
 * aliases/prices는 항상 전체를 반환하되 upsert(ignoreDuplicates)로 넣어 멱등이다.
 * makeId 주입으로 테스트 가능.
 */
export function diffSeedRows(
  companyId: string,
  existingCustomers: NamedRow[],
  existingProducts: ExistingProductRow[],
  existingSuppliers: NamedRow[] = [],
  makeId: () => string = () => crypto.randomUUID(),
) {
  const custByName = new Map(existingCustomers.map((r) => [r.name, r.id]));
  const prodByName = new Map(existingProducts.map((r) => [r.name, r.id]));
  const supplierByName = new Map(existingSuppliers.map((r) => [r.name, r.id]));

  const custId = new Map(
    sampleCustomers.map((c) => [c.id, custByName.get(c.name) ?? makeId()]),
  );
  const supplierId = new Map(
    samplePurchaseSuppliers.map((s) => [s.id, supplierByName.get(s.name) ?? makeId()]),
  );
  const prodId = new Map(
    sampleProducts.map((p) => [p.id, prodByName.get(p.name) ?? makeId()]),
  );

  return {
    // 누락분만 insert (이름 존재 시 기존 row 재사용 → 중복 생성 방지)
    customers: sampleCustomers
      .filter((c) => !custByName.has(c.name))
      .map((c) => ({
        id: custId.get(c.id)!,
        company_id: companyId,
        name: c.name,
        memo: c.memo ?? null,
      })),
    suppliers: samplePurchaseSuppliers
      .filter((s) => !supplierByName.has(s.name))
      .map((s) => ({
        id: supplierId.get(s.id)!,
        company_id: companyId,
        name: s.name,
        memo: s.memo ?? null,
      })),
    products: sampleProducts
      .filter((p) => !prodByName.has(p.name))
      .map((p) => ({
        id: prodId.get(p.id)!,
        company_id: companyId,
        name: p.name,
        base_unit: p.baseUnit,
        base_purchase_price: p.basePurchasePrice ?? null,
        purchase_supplier_id: p.purchaseSupplierId ? supplierId.get(p.purchaseSupplierId) ?? null : null,
        category: normalizeProductCategory(p.category),
      })),
    productSupplierUpdates: sampleProducts.flatMap((p) => {
      const existing = existingProducts.find((row) => row.name === p.name);
      const targetSupplierId = p.purchaseSupplierId ? supplierId.get(p.purchaseSupplierId) ?? null : null;
      const currentSupplierId = existing?.purchase_supplier_id ?? existing?.purchaseSupplierId ?? null;
      if (!existing || !targetSupplierId || currentSupplierId === targetSupplierId) return [];
      return [{ id: existing.id, company_id: companyId, purchase_supplier_id: targetSupplierId }];
    }),
    // 전체 반환 — unique 키 기반 upsert로 멱등 처리(사용자 수정값은 ignoreDuplicates로 보존)
    aliases: sampleProducts.flatMap((p) =>
      (p.aliases ?? []).map((alias) => ({
        company_id: companyId,
        product_id: prodId.get(p.id)!,
        alias,
      })),
    ),
    prices: sampleCustomerPrices.map((cp) => ({
      company_id: companyId,
      customer_id: custId.get(cp.customerId)!,
      product_id: prodId.get(cp.productId)!,
      sale_price: cp.price,
    })),
  };
}

/** 빈 회사 기준 전체 시드 rows (diffSeedRows의 특수형 — 기존 테스트/호출 호환). */
export function buildSeedRows(companyId: string, makeId: () => string = () => crypto.randomUUID()) {
  return diffSeedRows(companyId, [], [], [], makeId);
}

// ── repo (Supabase 호출) ──

export interface CompanyData {
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  customerPrices: CustomerPrice[];
  seeded: boolean;
}

/** 활성 품목 select — 0007(category)/0009(base_sale_price) 미적용 DB면 해당 컬럼 없이 재시도(앱 폴백). */
async function selectActiveProducts(db: SupabaseClient, companyId: string) {
  const query = (cols: string) =>
    db
      .from("ordermoa_products")
      .select(cols)
      .eq("company_id", companyId)
      .is("archived_at", null)
      .order("created_at", { ascending: true });
  return selectProductsWithFallback(query);
}

async function fetchCompanyData(db: SupabaseClient, companyId: string) {
  const [cust, supplier, prod, alias, price] = await Promise.all([
    db
      .from("ordermoa_customers")
      .select("id,name,phone,address,memo")
      .eq("company_id", companyId)
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
    db
      .from("ordermoa_suppliers")
      .select("id,name,phone,address,memo") // phone/address: 0005 적용 필요
      .eq("company_id", companyId)
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
    selectActiveProducts(db, companyId),
    db.from("ordermoa_product_aliases").select("product_id,alias").eq("company_id", companyId),
    db
      .from("ordermoa_customer_prices")
      .select("customer_id,product_id,sale_price")
      .eq("company_id", companyId),
  ]);
  const err = cust.error ?? supplier.error ?? prod.error ?? alias.error ?? price.error;
  if (err) throw err;

  const aliasByProduct = new Map<string, string[]>();
  for (const a of alias.data ?? []) {
    const list = aliasByProduct.get(a.product_id) ?? [];
    list.push(a.alias);
    aliasByProduct.set(a.product_id, list);
  }
  const customers: Customer[] = (cust.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone ?? undefined,
    address: c.address ?? undefined,
    memo: c.memo ?? undefined,
  }));
  const suppliers: Supplier[] = (supplier.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone ?? undefined,
    address: s.address ?? undefined,
    memo: s.memo ?? undefined,
  }));
  const supplierById = new Map(suppliers.map((s) => [s.id, s.name]));
  // select 폴백(category 유무)으로 행 타입이 유동적 → 알려진 형태로 캐스팅.
  const productRows = (prod.data ?? []) as unknown as ReadonlyArray<{
    id: string;
    name: string;
    base_unit: string;
    base_purchase_price: number | null;
    purchase_supplier_id: string | null;
    category?: string | null;
    base_sale_price?: number | null;
  }>;
  const products: Product[] = productRows.map((p) => ({
    id: p.id,
    name: p.name,
    baseUnit: p.base_unit,
    aliases: aliasByProduct.get(p.id) ?? [],
    purchaseSupplierId: p.purchase_supplier_id ?? null,
    purchaseSupplierName: p.purchase_supplier_id ? supplierById.get(p.purchase_supplier_id) ?? null : null,
    basePurchasePrice: p.base_purchase_price,
    baseSalePrice: p.base_sale_price ?? null,
    category: normalizeProductCategory(p.category),
  }));
  const customerPrices: CustomerPrice[] = (price.data ?? []).map((cp) => ({
    customerId: cp.customer_id,
    productId: cp.product_id,
    price: cp.sale_price,
  }));
  return { customers, suppliers, products, customerPrices };
}

async function countRows(db: SupabaseClient, table: string, companyId: string): Promise<number> {
  const res = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  if (res.error) throw res.error;
  return res.count ?? 0;
}

/**
 * 샘플 시드 보장(멱등). 부분 시드 상태여도 이름 기준으로 누락분만 보충한다.
 * - customers/products: 이름 diff 후 누락분만 insert
 * - aliases/prices: unique 키 upsert(ignoreDuplicates) — 사용자 수정값 보존, 재실행 안전
 * 반환: 이번 호출에서 실제로 무언가를 설치했는지.
 */
export async function ensureSeed(db: SupabaseClient, companyId: string): Promise<boolean> {
  const [cust, supplier, prod] = await Promise.all([
    db.from("ordermoa_customers").select("id,name").eq("company_id", companyId),
    db.from("ordermoa_suppliers").select("id,name").eq("company_id", companyId),
    db.from("ordermoa_products").select("id,name,purchase_supplier_id").eq("company_id", companyId),
  ]);
  if (cust.error) throw cust.error;
  if (supplier.error) throw supplier.error;
  if (prod.error) throw prod.error;

  const rows = diffSeedRows(companyId, cust.data ?? [], prod.data ?? [], supplier.data ?? []);

  if (rows.customers.length > 0) {
    const r = await db.from("ordermoa_customers").insert(rows.customers);
    if (r.error) throw r.error;
  }
  if (rows.suppliers.length > 0) {
    const r = await db.from("ordermoa_suppliers").insert(rows.suppliers);
    if (r.error) throw r.error;
  }
  if (rows.products.length > 0) {
    let r = await db.from("ordermoa_products").insert(rows.products);
    if (r.error && isMissingCategoryColumn(r.error)) {
      // 0007 미적용 DB — category 없이 시드(카테고리는 기타로 표시됨). 적용 후 재시드 불필요.
      r = await db.from("ordermoa_products").insert(rows.products.map(({ category: _c, ...rest }) => rest));
    }
    if (r.error) throw r.error;
  }
  for (const patch of rows.productSupplierUpdates) {
    const r = await db
      .from("ordermoa_products")
      .update({ purchase_supplier_id: patch.purchase_supplier_id })
      .eq("company_id", companyId)
      .eq("id", patch.id);
    if (r.error) throw r.error;
  }
  const a = await db
    .from("ordermoa_product_aliases")
    .upsert(rows.aliases, { onConflict: "company_id,alias", ignoreDuplicates: true });
  if (a.error) throw a.error;
  const cp = await db
    .from("ordermoa_customer_prices")
    .upsert(rows.prices, { onConflict: "company_id,customer_id,product_id", ignoreDuplicates: true });
  if (cp.error) throw cp.error;

  return rows.customers.length > 0 || rows.suppliers.length > 0 || rows.products.length > 0 || rows.productSupplierUpdates.length > 0;
}

/**
 * 회사 데이터 로드. 시드 완료 판정은 customers만이 아니라
 * customers/products/customer_prices **세 테이블 모두**로 확인한다(부분 시드 오판 방지).
 * 하나라도 비어 있으면 ensureSeed로 누락분을 안전하게 보충(멱등 → 실패 시 재시도 가능).
 */
export async function loadCompanyData(db: SupabaseClient, companyId: string): Promise<CompanyData> {
  const [nCust, nSupplier, nProd, nPrice] = await Promise.all([
    countRows(db, "ordermoa_customers", companyId),
    countRows(db, "ordermoa_suppliers", companyId),
    countRows(db, "ordermoa_products", companyId),
    countRows(db, "ordermoa_customer_prices", companyId),
  ]);
  let seeded = false;
  if (nCust === 0 || nSupplier === 0 || nProd === 0 || nPrice === 0) {
    seeded = await ensureSeed(db, companyId);
  }
  const data = await fetchCompanyData(db, companyId);
  return { ...data, seeded };
}

const ORDER_SELECT =
  "id,order_date,customer_id,status,customer:ordermoa_customers(name),items:ordermoa_order_items(id,product_id,raw_name,quantity,unit,unit_price,amount)";

/** 확정 주문 목록(최신순). 거래처별/기간 합계는 이 데이터(order_date·customer_id·amount)로 산출 가능. */
/** 발주 원문(order_imports)을 주문에 병합 — order_id 기준. 순수 함수(테스트 대상). */
export function attachRawText(
  orders: ConfirmedOrder[],
  imports: Array<{ order_id: string | null; raw_text: string | null }>,
): ConfirmedOrder[] {
  const byOrder = new Map<string, string | null>();
  for (const r of imports) if (r.order_id) byOrder.set(r.order_id, r.raw_text);
  return orders.map((o) => (byOrder.has(o.id) ? { ...o, rawText: byOrder.get(o.id) ?? null } : o));
}

/** 특정 주문의 rawText만 null로 비운다 — lines/total 등 주문 내역은 그대로. 순수 함수(테스트 대상). */
export function withRawTextCleared(orders: ConfirmedOrder[], orderId: string): ConfirmedOrder[] {
  return orders.map((o) => (o.id === orderId ? { ...o, rawText: null } : o));
}

export async function loadOrders(
  db: SupabaseClient,
  companyId: string,
  products: Product[],
): Promise<ConfirmedOrder[]> {
  const res = await db
    .from("ordermoa_orders")
    .select(ORDER_SELECT)
    .eq("company_id", companyId)
    // W23-R2: 가격 대기(quantity_confirmed) 주문도 목록·합산에 포함. 명세서·월합계는 화면에서 status로 거른다.
    .in("status", ["confirmed", "quantity_confirmed"])
    .order("order_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (res.error) throw res.error;
  const orders = (res.data as unknown as DbOrderRow[]).map((row) => mapDbOrder(row, products));

  // 발주 원문 병합(best-effort): order_id 링크(0006) 미적용이면 조용히 건너뜀 → 주문 목록은 유지.
  try {
    const imp = await db
      .from("ordermoa_order_imports")
      .select("order_id,raw_text")
      .eq("company_id", companyId)
      .not("order_id", "is", null);
    if (!imp.error && imp.data) {
      return attachRawText(orders, imp.data as Array<{ order_id: string | null; raw_text: string | null }>);
    }
  } catch {
    // 원문 병합 실패는 주문 목록 로딩을 막지 않는다.
  }
  return orders;
}

/**
 * 주문 저장: orders insert(quantity_confirmed) → items insert → 목표가 confirmed면 status 승격.
 *
 * 왜 항상 quantity_confirmed로 생성하나: 0011 가드가 **confirmed 주문에 order_items INSERT를 차단**하므로,
 * 경로 A(가격 포함 바로 확정)도 라인을 먼저 넣을 수 있는 quantity_confirmed에서 삽입하고,
 * 삽입이 끝난 뒤 quantity_confirmed→confirmed(허용 전이)로 승격한다. 사용자 관점 동작은 동일.
 * items 실패 시 status='cancelled'로 보상(soft). 승격 실패 시 주문은 quantity_confirmed로 남아
 * '가격 마감'으로 재확정 가능(스냅샷 유실 없음).
 */
export async function saveOrder(
  db: SupabaseClient,
  companyId: string,
  customerId: string,
  orderDate: string,
  lines: DraftLine[],
  products: Product[],
  rawText: string | null = null,
  status: OrderStatus = "confirmed",
): Promise<ConfirmedOrder> {
  const orderRes = await db
    .from("ordermoa_orders")
    .insert(toOrderInsert(companyId, customerId, orderDate, "quantity_confirmed"))
    .select("id,order_date,customer_id,status,customer:ordermoa_customers(name)")
    .single();
  if (orderRes.error) throw orderRes.error;
  const orderId = orderRes.data.id as string;

  const itemsRes = await db
    .from("ordermoa_order_items")
    .insert(toItemInserts(companyId, orderId, lines))
    .select("id,product_id,raw_name,quantity,unit,unit_price,amount");
  if (itemsRes.error) {
    // 보상: orders delete 정책 없음 → cancelled 처리로 목록에서 숨김
    await db.from("ordermoa_orders").update({ status: "cancelled" }).eq("id", orderId);
    throw itemsRes.error;
  }

  // 목표가 confirmed면 승격(qc→confirmed는 0010/0011 전이 규칙상 허용). qc면 그대로 둔다.
  let finalStatus: OrderStatus = "quantity_confirmed";
  if (status === "confirmed") {
    const flip = await db
      .from("ordermoa_orders")
      .update({ status: "confirmed" })
      .eq("company_id", companyId)
      .eq("id", orderId)
      .eq("status", "quantity_confirmed")
      .select("id");
    if (flip.error) throw flip.error; // 라인은 이미 저장됨(qc) → 재시도(가격 마감) 가능, 스냅샷 유실 없음
    if (!flip.data || flip.data.length !== 1) {
      throw new Error("주문 확정 전환에 실패했습니다. 주문 목록에서 가격 대기 상태를 확인해주세요.");
    }
    finalStatus = "confirmed";
  }

  const row: DbOrderRow = {
    id: orderId,
    order_date: orderRes.data.order_date as string,
    customer_id: orderRes.data.customer_id as string,
    status: finalStatus,
    customer: (orderRes.data as unknown as DbOrderRow).customer,
    items: itemsRes.data as unknown as DbItemRow[],
  };
  const order = mapDbOrder(row, products);

  // 발주 원문 저장(best-effort): order/items가 이미 확정된 뒤라, 여기서 실패해도 주문은 유지한다.
  // order_id 링크(0006) 미적용이면 조용히 건너뜀 → order.rawText는 undefined로 남고 UI는 "원문 없음".
  if (rawText && rawText.trim()) {
    try {
      const { data: userData } = await db.auth.getUser();
      const userId = userData.user?.id;
      if (userId) {
        const now = new Date().toISOString();
        const impRes = await db.from("ordermoa_order_imports").insert({
          company_id: companyId,
          customer_id: customerId,
          order_id: orderId,
          source: "kakao",
          raw_text: rawText,
          parsed_at: now,
          confirmed_at: now,
          created_by: userId,
        });
        if (!impRes.error) order.rawText = rawText;
      }
    } catch {
      // 원문 저장 실패는 주문 확정을 막지 않는다.
    }
  }
  return order;
}

/**
 * 가격 마감(R3): 가격 대기(quantity_confirmed) 주문의 라인별 단가를 확정하고 최종 확정으로 전환한다.
 *
 * 순서(불변 — 실패 복구 전략):
 *   ① 주문이 quantity_confirmed인지 + 실제 order_items.id 목록 재조회 (드리프트 방지).
 *   ② planCloseOrderPrices로 입력 전량 검증 — 실패면 아무것도 UPDATE하지 않고 throw.
 *   ③ 라인별 unit_price UPDATE (company_id+order_id+id 3중 조건 → 정확히 한 줄, amount 자동 재계산).
 *   ④ orders.status='confirmed' UPDATE (…AND status='quantity_confirmed' 조건 → 동시 마감 경합 차단).
 *
 * 부분 실패 복구: ③ 도중/직후 실패해도 주문은 quantity_confirmed로 남아(0010 가드는 confirmed에서만 라인
 *   잠금 → qc 재-UPDATE는 멱등) 재시도가 안전하다. ④가 0행이면 이미 확정/취소된 것 → 새로고침 안내.
 */
export async function closeOrderPrices(
  db: SupabaseClient,
  companyId: string,
  orderId: string,
  inputs: PriceCloseInput[],
  products: Product[],
): Promise<ConfirmedOrder> {
  // ① 상태 + 실제 라인 재조회
  const ord = await db
    .from("ordermoa_orders")
    .select("status")
    .eq("company_id", companyId)
    .eq("id", orderId)
    .single();
  if (ord.error) throw ord.error;
  if ((ord.data as { status: string }).status !== "quantity_confirmed") {
    throw new Error("가격 대기 상태의 주문만 가격 마감할 수 있습니다. 목록을 새로고침해주세요.");
  }
  const itemRes = await db
    .from("ordermoa_order_items")
    .select("id")
    .eq("company_id", companyId)
    .eq("order_id", orderId);
  if (itemRes.error) throw itemRes.error;

  // ② 전량 검증 (실제 DB 라인 기준 — 로드 이후 라인이 추가/삭제됐으면 여기서 걸린다)
  const plan = planCloseOrderPrices((itemRes.data ?? []) as Array<{ id: string }>, inputs);
  if (!plan.ok) throw new Error(plan.error);

  // ③ 라인별 단가 UPDATE — 정확한 한 줄만. .select("id")로 영향 행을 확인해 0행/2행 이상이면
  //    status 승격(④) 전에 중단 → 주문은 qc로 남아 재시도 안전(부분 실패 복구 전략 유지).
  for (const u of plan.updates) {
    const r = await db
      .from("ordermoa_order_items")
      .update({ unit_price: u.unitPrice })
      .eq("company_id", companyId)
      .eq("order_id", orderId)
      .eq("id", u.lineId)
      .select("id");
    if (r.error) throw r.error; // 주문은 아직 qc → 재시도 안전
    if (!r.data || r.data.length !== 1) {
      // 0행=라인이 사라졌거나 조건 불일치, 2행 이상=비정상(pk라 발생 불가하나 방어). 승격하지 않는다.
      throw new Error("가격 마감 중 일부 품목을 정확히 찾지 못했습니다(변경 0건). 목록을 새로고침 후 다시 시도해주세요.");
    }
  }

  // ④ 최종 확정 전환 (경합 차단 조건)
  const flip = await db
    .from("ordermoa_orders")
    .update({ status: "confirmed" })
    .eq("company_id", companyId)
    .eq("id", orderId)
    .eq("status", "quantity_confirmed")
    .select("id");
  if (flip.error) throw flip.error;
  if (!flip.data || flip.data.length === 0) {
    throw new Error("이미 처리된 주문입니다. 목록을 새로고침해주세요.");
  }

  // 확정된 주문 재조회 → 화면 모델
  const res = await db
    .from("ordermoa_orders")
    .select(ORDER_SELECT)
    .eq("company_id", companyId)
    .eq("id", orderId)
    .single();
  if (res.error) throw res.error;
  const order = mapDbOrder(res.data as unknown as DbOrderRow, products);
  return await attachRawTextFromDb(db, companyId, order);
}

/** loadOrders의 원문 병합 로직을 단건에 재사용(best-effort). */
async function attachRawTextFromDb(
  db: SupabaseClient,
  companyId: string,
  order: ConfirmedOrder,
): Promise<ConfirmedOrder> {
  try {
    const imp = await db
      .from("ordermoa_order_imports")
      .select("order_id,raw_text")
      .eq("company_id", companyId)
      .eq("order_id", order.id);
    if (!imp.error && imp.data) {
      return attachRawText([order], imp.data as Array<{ order_id: string | null; raw_text: string | null }>)[0];
    }
  } catch {
    // 원문 병합 실패는 마감 결과를 막지 않는다.
  }
  return order;
}

/** 발주 원문 삭제: 해당 주문의 import raw_text만 null 처리(주문/품목은 건드리지 않음). */
export async function deleteOrderRawText(
  db: SupabaseClient,
  companyId: string,
  orderId: string,
): Promise<void> {
  const res = await db
    .from("ordermoa_order_imports")
    .update({ raw_text: null })
    .eq("company_id", companyId)
    .eq("order_id", orderId);
  if (res.error) throw res.error;
}
