// 품목·별칭 CRUD (W03) — customer/supplier-store 패턴.
// 테이블: ordermoa_products / ordermoa_product_aliases (기존, 마이그레이션 없음).
// 별칭은 unique(company_id, alias) — 회사 전체에서 중복 불가.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "./domain/types";
import {
  DEFAULT_PRODUCT_CATEGORY,
  normalizeProductCategory,
  type ProductCategory,
} from "./product-category";
import {
  chunk,
  dedupeAliasRows,
  planCatalogDbWrite,
  type CatalogApplyResult,
} from "./catalog-import";

export interface ProductFormInput {
  name: string;
  baseUnit: string;
  /** 폼 입력 그대로(문자열 허용). 빈 값 = 미등록(null) */
  basePurchasePrice?: string | number | null;
  /** 기본 출고단가(W22). 폼 입력 그대로. 빈 값 = 미등록(null) — 파싱 fallback도 미적용. */
  baseSalePrice?: string | number | null;
  /** "" 또는 undefined = 매입처 미지정(null) */
  purchaseSupplierId?: string | null;
  /** 카테고리 6종. 미지정이면 기타(Phase 2). */
  category?: string | null;
}

export interface NormalizedProductInput {
  name: string;
  baseUnit: string;
  basePurchasePrice: number | null;
  baseSalePrice: number | null;
  purchaseSupplierId: string | null;
  category: ProductCategory;
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
  const salePrice = parsePrice(input.baseSalePrice);
  return {
    name: input.name.trim(),
    baseUnit: input.baseUnit.trim(),
    basePurchasePrice: price === "invalid" ? null : price,
    baseSalePrice: salePrice === "invalid" ? null : salePrice,
    purchaseSupplierId: input.purchaseSupplierId ? input.purchaseSupplierId : null,
    category: normalizeProductCategory(input.category),
  };
}

export function validateProductInput(input: ProductFormInput): string | null {
  if (!input.name.trim()) return "품목명을 입력해주세요.";
  if (!input.baseUnit.trim()) return "기본 단위를 입력해주세요.";
  if (parsePrice(input.basePurchasePrice) === "invalid") {
    return "기준 매입단가는 0 이상 숫자로 입력해주세요.";
  }
  if (parsePrice(input.baseSalePrice) === "invalid") {
    return "기본 출고단가는 0 이상 숫자로 입력해주세요.";
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
    base_sale_price: clean.baseSalePrice,
    purchase_supplier_id: clean.purchaseSupplierId,
    category: clean.category,
  };
}

export function toProductUpdate(input: ProductFormInput) {
  const clean = normalizeProductInput(input);
  return {
    name: clean.name,
    base_unit: clean.baseUnit,
    base_purchase_price: clean.basePurchasePrice,
    base_sale_price: clean.baseSalePrice,
    purchase_supplier_id: clean.purchaseSupplierId,
    category: clean.category,
  };
}

/**
 * 0007(category 컬럼) 미적용 DB에서 나오는 "category 컬럼 없음" 오류만 감지.
 * select는 42703(undefined_column), insert/update body는 PGRST204(schema cache).
 * category 값 CHECK 위반(23514)이나 다른 컬럼 오류는 제외 — 컬럼 없이 재시도하면 안 됨.
 */
export function isMissingColumnError(error: unknown, column: string): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: string; message?: string };
  const msg = typeof message === "string" ? message.toLowerCase() : "";
  if (!msg.includes(column.toLowerCase())) return false;
  if (code === "42703" || code === "PGRST204") return true;
  return /does not exist|schema cache|could not find/.test(msg);
}

/** 0007 미적용 DB의 category 컬럼 누락만 감지(값 CHECK 위반·다른 컬럼 오류는 제외). */
export function isMissingCategoryColumn(error: unknown): boolean {
  return isMissingColumnError(error, "category");
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
  /** 0007 미적용 DB에서는 select 폴백으로 빠질 수 있음 → 없으면 기타. */
  category?: string | null;
  /** 0009 미적용 DB에서는 select 폴백으로 빠질 수 있음 → 없으면 null. */
  base_sale_price?: number | null;
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
    baseSalePrice: row.base_sale_price ?? null,
    category: normalizeProductCategory(row.category),
  };
}

/** 마이그레이션 미적용 DB 대비 3벌 — 없는 컬럼은 select에서 빼고 mapProduct가 기본값으로 폴백.
 *  FULL(0007+0009) → CAT(0007만) → BASE(둘 다 미적용). as const로 Supabase 행 타입 추론 유지. */
export const PRODUCT_COLS_BASE = "id,name,base_unit,base_purchase_price,purchase_supplier_id" as const;
export const PRODUCT_COLS_CAT = "id,name,base_unit,base_purchase_price,purchase_supplier_id,category" as const;
export const PRODUCT_COLS = "id,name,base_unit,base_purchase_price,purchase_supplier_id,category,base_sale_price" as const;

/** select 폴백: FULL → (base_sale_price 없음)CAT → (category 없음)BASE. 어느 컬럼이 없어도 앱은 안 깨진다. */
export async function selectProductsWithFallback<T>(
  query: (cols: string) => Promise<{ data: unknown; error: unknown }> | { data: unknown; error: unknown } | T,
) {
  let res = (await query(PRODUCT_COLS)) as { data: unknown; error: unknown };
  if (res.error && isMissingColumnError(res.error, "base_sale_price")) res = (await query(PRODUCT_COLS_CAT)) as typeof res;
  if (res.error && isMissingCategoryColumn(res.error)) res = (await query(PRODUCT_COLS_BASE)) as typeof res;
  return res;
}

/** insert/update body에서 category 키만 제거(0007 미적용 폴백용). */
function stripCategory<T extends { category?: unknown }>(row: T): Omit<T, "category"> {
  const { category: _omit, ...rest } = row;
  return rest;
}

/** insert/update body에서 base_sale_price 키만 제거(0009 미적용 폴백용). */
function stripBaseSalePrice<T extends { base_sale_price?: unknown }>(row: T): Omit<T, "base_sale_price"> {
  const { base_sale_price: _omit, ...rest } = row;
  return rest;
}

export async function createProduct(
  db: SupabaseClient,
  companyId: string,
  input: ProductFormInput,
  supplierName: string | null,
): Promise<Product> {
  const error = validateProductInput(input);
  if (error) throw new Error(error);
  const row = toProductInsert(companyId, input);
  let res = await db.from("ordermoa_products").insert(row).select(PRODUCT_COLS).single();
  if (res.error && isMissingColumnError(res.error, "base_sale_price")) {
    // 0009 미적용 DB — base_sale_price 제외하고 재시도(품목·카테고리는 저장).
    res = await db.from("ordermoa_products").insert(stripBaseSalePrice(row)).select(PRODUCT_COLS_CAT).single();
  }
  if (res.error && isMissingCategoryColumn(res.error)) {
    // 0007 미적용 DB — category(+base_sale_price)까지 제외하고 재시도(품목 자체는 저장).
    res = await db.from("ordermoa_products").insert(stripCategory(stripBaseSalePrice(row))).select(PRODUCT_COLS_BASE).single();
  }
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
  const patch = toProductUpdate(input);
  let res = await db
    .from("ordermoa_products")
    .update(patch)
    .eq("company_id", companyId)
    .eq("id", productId)
    .select(PRODUCT_COLS)
    .single();
  if (res.error && isMissingColumnError(res.error, "base_sale_price")) {
    // 0009 미적용 DB — base_sale_price 제외하고 재시도.
    res = await db
      .from("ordermoa_products")
      .update(stripBaseSalePrice(patch))
      .eq("company_id", companyId)
      .eq("id", productId)
      .select(PRODUCT_COLS_CAT)
      .single();
  }
  if (res.error && isMissingCategoryColumn(res.error)) {
    // 0007 미적용 DB — category(+base_sale_price)까지 제외하고 재시도.
    res = await db
      .from("ordermoa_products")
      .update(stripCategory(stripBaseSalePrice(patch)))
      .eq("company_id", companyId)
      .eq("id", productId)
      .select(PRODUCT_COLS_BASE)
      .single();
  }
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
  const archived = (cols: string) =>
    db
      .from("ordermoa_products")
      .select(cols)
      .eq("company_id", companyId)
      .not("archived_at", "is", null)
      .order("created_at", { ascending: true });
  const prod = await selectProductsWithFallback(archived);
  const alias = await db
    .from("ordermoa_product_aliases")
    .select("product_id,alias")
    .eq("company_id", companyId);
  if (prod.error) throw prod.error;
  if (alias.error) throw alias.error;
  const aliasByProduct = new Map<string, string[]>();
  for (const a of alias.data ?? []) {
    aliasByProduct.set(a.product_id, [...(aliasByProduct.get(a.product_id) ?? []), a.alias]);
  }
  // select 폴백으로 행 타입이 유동적(cols가 string) → 알려진 형태로 캐스팅.
  const rows = (prod.data ?? []) as unknown as ProductRow[];
  return rows.map((row) => mapProduct(row, aliasByProduct.get(row.id) ?? [], null));
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

// ── W21-B 카탈로그 import DB 영구 반영 ──
// 원칙 재확인: 출고단가 미저장, customer_prices 무관, source_code 멱등, category·매입단가만 저장.
// 0007/0008 적용 전제(사용자 확인). 컬럼 누락 시 배치 전체가 실패 요약에 잡힌다(조용히 넘어가지 않음).

const CATALOG_BATCH = 200;

export interface CatalogImportDbSummary {
  inserted: number;
  updated: number;
  aliasAttempted: number; // unique 충돌 무시 upsert라 실제 신규수는 근사(시도 건수)
  failedBatches: number;
  errors: string[];
}

/** 선택분(inserts/updates)만 DB에 반영. source_code로 재import 멱등, 별칭은 충돌 무시 insert. */
export async function applyCatalogImportToDb(
  db: SupabaseClient,
  companyId: string,
  result: CatalogApplyResult,
): Promise<CatalogImportDbSummary> {
  const summary: CatalogImportDbSummary = { inserted: 0, updated: 0, aliasAttempted: 0, failedBatches: 0, errors: [] };

  // 1) 이미 같은 source_code로 저장된 품목 조회 → 멱등 재분류용 맵.
  const codes = result.inserts.map((i) => i.sourceCode).filter((c): c is string => Boolean(c));
  const codeToId = new Map<string, string>();
  for (const part of chunk(codes, CATALOG_BATCH)) {
    const res = await db
      .from("ordermoa_products")
      .select("id,source_code")
      .eq("company_id", companyId)
      .in("source_code", part);
    if (res.error) {
      summary.errors.push(`기존 코드 조회 실패: ${res.error.message}`);
      continue;
    }
    for (const r of (res.data ?? []) as Array<{ id: string; source_code: string | null }>) {
      if (r.source_code) codeToId.set(r.source_code, r.id);
    }
  }

  const plan = planCatalogDbWrite(result, codeToId);
  const aliasRows: Array<{ company_id: string; product_id: string; alias: string }> = [];

  // 2) 신규 insert(200 배치) — 반환 id로 별칭 연결. source_code 우선, 없으면 이름으로 매핑.
  for (const part of chunk(plan.inserts, CATALOG_BATCH)) {
    const rows = part.map((i) => ({
      company_id: companyId,
      name: i.name,
      base_unit: i.baseUnit,
      base_purchase_price: i.basePurchasePrice,
      base_sale_price: i.baseSalePrice, // W22: 출고단가는 여기(품목 기본가). customer_prices 아님.
      category: i.category,
      source_code: i.sourceCode,
      purchase_supplier_id: null as string | null,
    }));
    const res = await db.from("ordermoa_products").insert(rows).select("id,name,source_code");
    if (res.error) {
      summary.failedBatches += 1;
      summary.errors.push(`품목 추가 배치 실패(${part.length}건): ${res.error.message}`);
      continue;
    }
    const saved = (res.data ?? []) as Array<{ id: string; name: string; source_code: string | null }>;
    summary.inserted += saved.length;
    const bySource = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const r of saved) {
      if (r.source_code) bySource.set(r.source_code, r.id);
      else if (!byName.has(r.name)) byName.set(r.name, r.id);
    }
    for (const i of part) {
      // ponytail: code 없는 신규가 한 배치에 동명이면 첫 행에만 별칭이 붙는다(초안 별칭은 실무상 비어 있음).
      const pid = i.sourceCode ? bySource.get(i.sourceCode) : byName.get(i.name);
      if (pid) for (const a of i.aliases) aliasRows.push({ company_id: companyId, product_id: pid, alias: a });
    }
  }

  // 3) update(id별) — 이름매칭 기존일치 + source_code 재import. 재import 별칭도 여기서 수집.
  for (const u of plan.updates) {
    const res = await db
      .from("ordermoa_products")
      // W22: 재import(source_code 멱등) 시 기존 품목의 base_sale_price도 갱신.
      .update({ base_purchase_price: u.basePurchasePrice, base_sale_price: u.baseSalePrice, category: u.category, source_code: u.sourceCode })
      .eq("company_id", companyId)
      .eq("id", u.productId);
    if (res.error) {
      summary.failedBatches += 1;
      summary.errors.push(`품목 갱신 실패(id ${u.productId.slice(0, 8)}): ${res.error.message}`);
      continue;
    }
    summary.updated += 1;
    for (const a of u.aliases) aliasRows.push({ company_id: companyId, product_id: u.productId, alias: a });
  }

  // 4) 별칭 insert(200 배치) — unique(company_id, alias) 충돌은 무시(ON CONFLICT DO NOTHING).
  const uniqAliases = dedupeAliasRows(aliasRows);
  for (const part of chunk(uniqAliases, CATALOG_BATCH)) {
    const res = await db
      .from("ordermoa_product_aliases")
      .upsert(part, { onConflict: "company_id,alias", ignoreDuplicates: true });
    if (res.error) {
      summary.errors.push(`별칭 저장 배치 실패(${part.length}건): ${res.error.message}`);
      continue;
    }
    summary.aliasAttempted += part.length;
  }

  return summary;
}
