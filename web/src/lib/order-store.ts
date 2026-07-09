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
import { PRODUCT_COLS, PRODUCT_COLS_BASE, isMissingCategoryColumn } from "./product-store";
import {
  sampleCustomers,
  sampleCustomerPrices,
  sampleProducts,
  samplePurchaseSuppliers,
} from "./sample-data";

export interface OrderLine {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  basePurchasePrice: number | null;
}

export interface ConfirmedOrder {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  lines: OrderLine[];
  total: number;
  margin: number | null;
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

export function toOrderInsert(companyId: string, customerId: string, orderDate: string) {
  return {
    company_id: companyId,
    customer_id: customerId,
    order_date: orderDate,
    source: "kakao",
    status: "confirmed" as const,
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
  customer: { name: string } | null;
  items: DbItemRow[];
}

/** DB row → 화면 모델. total=Σ라인 amount(저장값 그대로), margin은 표시 시점 계산(참고값). */
export function mapDbOrder(row: DbOrderRow, products: Product[]): ConfirmedOrder {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: OrderLine[] = row.items.map((it) => {
    const p = byId.get(it.product_id);
    return {
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
  };
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

/** 활성 품목 select — 0007(category) 미적용 DB면 category 없이 재시도(앱은 기타 폴백). */
async function selectActiveProducts(db: SupabaseClient, companyId: string) {
  const query = (cols: string) =>
    db
      .from("ordermoa_products")
      .select(cols)
      .eq("company_id", companyId)
      .is("archived_at", null)
      .order("created_at", { ascending: true });
  const res = await query(PRODUCT_COLS);
  if (res.error && isMissingCategoryColumn(res.error)) return query(PRODUCT_COLS_BASE);
  return res;
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
  }>;
  const products: Product[] = productRows.map((p) => ({
    id: p.id,
    name: p.name,
    baseUnit: p.base_unit,
    aliases: aliasByProduct.get(p.id) ?? [],
    purchaseSupplierId: p.purchase_supplier_id ?? null,
    purchaseSupplierName: p.purchase_supplier_id ? supplierById.get(p.purchase_supplier_id) ?? null : null,
    basePurchasePrice: p.base_purchase_price,
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
  "id,order_date,customer_id,customer:ordermoa_customers(name),items:ordermoa_order_items(product_id,raw_name,quantity,unit,unit_price,amount)";

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
    .eq("status", "confirmed")
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
 * 주문 확정 저장: orders insert → items insert(스냅샷 단가, amount 미포함).
 * items 실패 시 주문을 status='cancelled'로 보상(soft) 후 throw.
 */
export async function saveOrder(
  db: SupabaseClient,
  companyId: string,
  customerId: string,
  orderDate: string,
  lines: DraftLine[],
  products: Product[],
  rawText: string | null = null,
): Promise<ConfirmedOrder> {
  const orderRes = await db
    .from("ordermoa_orders")
    .insert(toOrderInsert(companyId, customerId, orderDate))
    .select("id,order_date,customer_id,customer:ordermoa_customers(name)")
    .single();
  if (orderRes.error) throw orderRes.error;
  const orderId = orderRes.data.id as string;

  const itemsRes = await db
    .from("ordermoa_order_items")
    .insert(toItemInserts(companyId, orderId, lines))
    .select("product_id,raw_name,quantity,unit,unit_price,amount");
  if (itemsRes.error) {
    // 보상: orders delete 정책 없음 → cancelled 처리로 목록에서 숨김
    await db.from("ordermoa_orders").update({ status: "cancelled" }).eq("id", orderId);
    throw itemsRes.error;
  }

  const row: DbOrderRow = {
    id: orderId,
    order_date: orderRes.data.order_date as string,
    customer_id: orderRes.data.customer_id as string,
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
