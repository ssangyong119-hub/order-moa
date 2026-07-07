// 품목·별칭 CRUD (W03) — customer/supplier-store 패턴.
// 테이블: ordermoa_products / ordermoa_product_aliases (기존, 마이그레이션 없음).
// 별칭은 unique(company_id, alias) — 회사 전체에서 중복 불가.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "./domain/types";

export interface ProductFormInput {
  name: string;
  baseUnit: string;
  /** 폼 입력 그대로(문자열 허용). 빈 값 = 미등록(null) */
  basePurchasePrice?: string | number | null;
  /** "" 또는 undefined = 매입처 미지정(null) */
  purchaseSupplierId?: string | null;
}

export interface NormalizedProductInput {
  name: string;
  baseUnit: string;
  basePurchasePrice: number | null;
  purchaseSupplierId: string | null;
}

function parsePrice(raw: string | number | null | undefined): number | null | "invalid" {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return Math.round(n);
}

export function normalizeProductInput(input: ProductFormInput): NormalizedProductInput {
  const price = parsePrice(input.basePurchasePrice);
  return {
    name: input.name.trim(),
    baseUnit: input.baseUnit.trim(),
    basePurchasePrice: price === "invalid" ? null : price,
    purchaseSupplierId: input.purchaseSupplierId ? input.purchaseSupplierId : null,
  };
}

export function validateProductInput(input: ProductFormInput): string | null {
  if (!input.name.trim()) return "품목명을 입력해주세요.";
  if (!input.baseUnit.trim()) return "기본 단위를 입력해주세요.";
  if (parsePrice(input.basePurchasePrice) === "invalid") {
    return "기준 매입단가는 0 이상 숫자로 입력해주세요.";
  }
  return null;
}

export function toProductInsert(companyId: string, input: ProductFormInput) {
  const clean = normalizeProductInput(input);
  return {
    company_id: companyId,
    name: clean.name,
    base_unit: clean.baseUnit,
    base_purchase_price: clean.basePurchasePrice,
    purchase_supplier_id: clean.purchaseSupplierId,
  };
}

export function toProductUpdate(input: ProductFormInput) {
  const clean = normalizeProductInput(input);
  return {
    name: clean.name,
    base_unit: clean.baseUnit,
    base_purchase_price: clean.basePurchasePrice,
    purchase_supplier_id: clean.purchaseSupplierId,
  };
}

/** 새 별칭 검증 — DB unique(company_id, alias)와 같은 규칙을 화면에서 먼저 확인 */
export function validateNewAlias(
  alias: string,
  products: Product[],
  productId: string,
): string | null {
  const clean = alias.trim();
  if (!clean) return "별칭을 입력해주세요.";
  for (const p of products) {
    if (p.name === clean) return `'${clean}'은(는) 이미 품목명으로 있습니다.`;
    if ((p.aliases ?? []).includes(clean)) {
      return p.id === productId
        ? `'${clean}'은(는) 이미 이 품목의 별칭입니다.`
        : `'${clean}'은(는) 이미 ${p.name}의 별칭입니다.`;
    }
  }
  return null;
}

export function friendlyAliasError(e: unknown): string {
  if (e && typeof e === "object" && (e as { code?: string }).code === "23505") {
    return "이미 등록된 별칭입니다. 다른 품목에서 쓰고 있는지 확인해주세요.";
  }
  if (e instanceof Error && e.message) return e.message;
  return "별칭 저장에 실패했습니다.";
}

// ---- DB 함수 (RLS는 기존 정책 사용) ----

interface ProductRow {
  id: string;
  name: string;
  base_unit: string;
  base_purchase_price: number | null;
  purchase_supplier_id: string | null;
}

function mapProduct(row: ProductRow, aliases: string[], supplierName: string | null): Product {
  return {
    id: row.id,
    name: row.name,
    baseUnit: row.base_unit,
    aliases,
    purchaseSupplierId: row.purchase_supplier_id,
    purchaseSupplierName: supplierName,
    basePurchasePrice: row.base_purchase_price,
  };
}

const PRODUCT_COLS = "id,name,base_unit,base_purchase_price,purchase_supplier_id";

export async function createProduct(
  db: SupabaseClient,
  companyId: string,
  input: ProductFormInput,
  supplierName: string | null,
): Promise<Product> {
  const error = validateProductInput(input);
  if (error) throw new Error(error);
  const res = await db
    .from("ordermoa_products")
    .insert(toProductInsert(companyId, input))
    .select(PRODUCT_COLS)
    .single();
  if (res.error) throw res.error;
  return mapProduct(res.data, [], supplierName);
}

export async function updateProduct(
  db: SupabaseClient,
  companyId: string,
  productId: string,
  input: ProductFormInput,
  aliases: string[],
  supplierName: string | null,
): Promise<Product> {
  const error = validateProductInput(input);
  if (error) throw new Error(error);
  const res = await db
    .from("ordermoa_products")
    .update(toProductUpdate(input))
    .eq("company_id", companyId)
    .eq("id", productId)
    .select(PRODUCT_COLS)
    .single();
  if (res.error) throw res.error;
  return mapProduct(res.data, aliases, supplierName);
}

export async function archiveProduct(
  db: SupabaseClient,
  companyId: string,
  productId: string,
): Promise<void> {
  const res = await db
    .from("ordermoa_products")
    .update({ archived_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", productId);
  if (res.error) throw res.error;
}

export async function unarchiveProduct(
  db: SupabaseClient,
  companyId: string,
  productId: string,
): Promise<void> {
  const res = await db
    .from("ordermoa_products")
    .update({ archived_at: null })
    .eq("company_id", companyId)
    .eq("id", productId);
  if (res.error) throw res.error;
}

/** 보관 품목 목록 (별칭 포함 — 복원 시 그대로 살아나야 함) */
export async function listArchivedProducts(
  db: SupabaseClient,
  companyId: string,
): Promise<Product[]> {
  const [prod, alias] = await Promise.all([
    db
      .from("ordermoa_products")
      .select(PRODUCT_COLS)
      .eq("company_id", companyId)
      .not("archived_at", "is", null)
      .order("created_at", { ascending: true }),
    db.from("ordermoa_product_aliases").select("product_id,alias").eq("company_id", companyId),
  ]);
  if (prod.error) throw prod.error;
  if (alias.error) throw alias.error;
  const aliasByProduct = new Map<string, string[]>();
  for (const a of alias.data ?? []) {
    aliasByProduct.set(a.product_id, [...(aliasByProduct.get(a.product_id) ?? []), a.alias]);
  }
  return (prod.data ?? []).map((row) => mapProduct(row, aliasByProduct.get(row.id) ?? [], null));
}

export async function addAliasInDb(
  db: SupabaseClient,
  companyId: string,
  productId: string,
  alias: string,
): Promise<void> {
  const res = await db
    .from("ordermoa_product_aliases")
    .insert({ company_id: companyId, product_id: productId, alias: alias.trim() });
  if (res.error) throw res.error;
}

export async function removeAliasInDb(
  db: SupabaseClient,
  companyId: string,
  alias: string,
): Promise<void> {
  // unique(company_id, alias)라 alias만으로 특정됨
  const res = await db
    .from("ordermoa_product_aliases")
    .delete()
    .eq("company_id", companyId)
    .eq("alias", alias);
  if (res.error) throw res.error;
}
