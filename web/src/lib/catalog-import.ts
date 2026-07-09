// W21 — 실 카탈로그 초안(order-moa-catalog-real-draft.json) import 순수 로직.
// UI/DB와 분리한 검증·분류·매핑·배치 함수. (미리보기 검수 → 선택분만 반영)
// 원칙: 출고단가(repSalePrice)는 어디에도 저장하지 않는다(기본 판매단가 구조는 Phase 3).
//       입고단가(repPurchasePrice)만 products.base_purchase_price(예상마진 참고값)로 매핑.
import {
  DEFAULT_PRODUCT_CATEGORY,
  PRODUCT_CATEGORIES,
  normalizeProductCategory,
  type ProductCategory,
} from "./product-category";

export interface CatalogDraftItem {
  code: string | null;
  name: string;
  spec: string | null;
  unit: string | null;
  category: string;
  repSalePrice: number | null;
  repPurchasePrice: number | null;
  aliasCandidates: string[];
  needsReview: boolean;
  reviewReasons: string[];
}

export interface ImportRow {
  id: string;
  code: string | null;
  name: string;
  spec: string | null;
  unit: string | null;
  category: ProductCategory;
  repSalePrice: number | null;
  repPurchasePrice: number | null;
  aliasCandidates: string[];
  needsReview: boolean;
  reviewReasons: string[];
  match: "new" | "existing"; // 현재 품목명과 겹치면 existing
  dupInDraft: boolean; // 초안 안에서 같은 이름이 2개 이상
}

/** 검수 화면에서 사용자가 행별로 덮어쓴 값(선택). 없으면 초안값 사용. */
export interface ImportEdit {
  name?: string;
  unit?: string | null;
  category?: ProductCategory;
  purchasePrice?: number | null;
}

type ValidateResult = { ok: true; items: CatalogDraftItem[] } | { ok: false; error: string };

const SIX = [...PRODUCT_CATEGORIES].sort().join(",");

export function validateCatalogDraft(raw: unknown): ValidateResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "JSON 객체 형식이 아닙니다." };
  const d = raw as { meta?: { categories?: unknown }; items?: unknown };
  if (!Array.isArray(d.items)) return { ok: false, error: "items 배열이 없습니다. 카탈로그 초안 JSON이 맞는지 확인해주세요." };
  if (d.meta && Array.isArray(d.meta.categories)) {
    if ([...(d.meta.categories as string[])].sort().join(",") !== SIX) {
      return { ok: false, error: "카테고리 목록이 앱의 6종과 다릅니다(버전 불일치)." };
    }
  }
  const items: CatalogDraftItem[] = [];
  for (const raw of d.items as unknown[]) {
    if (!raw || typeof raw !== "object") return { ok: false, error: "항목 형식 오류가 있습니다." };
    const it = raw as Record<string, unknown>;
    if (typeof it.name !== "string" || !it.name.trim()) {
      return { ok: false, error: "품목명이 없는 항목이 있습니다." };
    }
    items.push({
      code: it.code == null ? null : String(it.code),
      name: it.name.trim(),
      spec: it.spec == null ? null : String(it.spec),
      unit: it.unit == null ? null : String(it.unit),
      category: typeof it.category === "string" ? it.category : DEFAULT_PRODUCT_CATEGORY,
      repSalePrice: typeof it.repSalePrice === "number" ? it.repSalePrice : null,
      repPurchasePrice: typeof it.repPurchasePrice === "number" ? it.repPurchasePrice : null,
      aliasCandidates: Array.isArray(it.aliasCandidates) ? it.aliasCandidates.map(String) : [],
      needsReview: Boolean(it.needsReview),
      reviewReasons: Array.isArray(it.reviewReasons) ? it.reviewReasons.map(String) : [],
    });
  }
  return { ok: true, items };
}

export function buildImportRows(items: CatalogDraftItem[], existingNames: Set<string>): ImportRow[] {
  const nameCount = new Map<string, number>();
  for (const it of items) nameCount.set(it.name, (nameCount.get(it.name) ?? 0) + 1);
  return items.map((it, idx) => ({
    id: it.code ?? `row_${idx}`,
    code: it.code,
    name: it.name,
    spec: it.spec,
    unit: it.unit,
    category: normalizeProductCategory(it.category),
    repSalePrice: it.repSalePrice,
    repPurchasePrice: it.repPurchasePrice,
    aliasCandidates: it.aliasCandidates,
    needsReview: it.needsReview,
    reviewReasons: it.reviewReasons,
    match: existingNames.has(it.name) ? "existing" : "new",
    dupInDraft: (nameCount.get(it.name) ?? 0) > 1,
  }));
}

export function summarizeImport(rows: ImportRow[], selectedIds: Set<string>) {
  return {
    total: rows.length,
    selected: rows.filter((r) => selectedIds.has(r.id)).length,
    needsReview: rows.filter((r) => r.needsReview).length,
    newCount: rows.filter((r) => r.match === "new").length,
    existing: rows.filter((r) => r.match === "existing").length,
  };
}

/** 신규 품목 insert 본문. 입고단가→base_purchase_price, 출고단가→base_sale_price(W22). */
export function toCatalogInsert(companyId: string, row: ImportRow, edit: ImportEdit) {
  return {
    company_id: companyId,
    name: (edit.name ?? row.name).trim(),
    base_unit: (edit.unit ?? row.unit ?? "").trim() || "개",
    base_purchase_price: edit.purchasePrice !== undefined ? edit.purchasePrice : row.repPurchasePrice,
    base_sale_price: row.repSalePrice,
    category: edit.category ?? row.category,
    source_code: row.code,
    purchase_supplier_id: null,
  };
}

/** 기존일치 품목 update 패치. 이름은 안 바꿈(source_code·매입/출고단가·카테고리만). */
export function toCatalogUpdatePatch(row: ImportRow, edit: ImportEdit) {
  return {
    base_purchase_price: edit.purchasePrice !== undefined ? edit.purchasePrice : row.repPurchasePrice,
    base_sale_price: row.repSalePrice,
    category: edit.category ?? row.category,
    source_code: row.code,
  };
}

export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── 반영 결과(검수 화면 → 반영). DB/데모 공통 입력. ──
// 출고단가는 어디에도 없다(원칙). aliases는 신규(insert) 행에만 붙는다(초안 후보).
export interface CatalogInsert {
  name: string;
  baseUnit: string;
  category: ProductCategory;
  basePurchasePrice: number | null;
  /** 기본 출고단가(W22). 엑셀 출고단가(repSalePrice)를 여기 저장 — customer_prices 아님. */
  baseSalePrice: number | null;
  sourceCode: string | null;
  aliases: string[];
}
export interface CatalogUpdate {
  productId: string;
  category: ProductCategory;
  basePurchasePrice: number | null;
  /** 기본 출고단가(W22). 재import 시 기존 품목도 갱신. */
  baseSalePrice: number | null;
  sourceCode: string | null;
  /** 재분류로 붙는 별칭(이름매칭 update엔 없음, source_code 재import엔 초안 후보가 붙음). */
  aliases?: string[];
}
export interface CatalogApplyResult {
  inserts: CatalogInsert[];
  updates: CatalogUpdate[];
}

/**
 * DB 반영 계획(멱등 핵심): 신규 insert 후보 중 이미 같은 source_code로 저장된 품목은
 * insert가 아니라 update로 돌린다 — 품목명을 바꿨거나 재import여도 새 행을 만들지 않는다.
 * 순수 함수(테스트 대상). IO(코드 조회/배치)는 product-store가 담당.
 */
export function planCatalogDbWrite(
  result: CatalogApplyResult,
  existingCodeToId: Map<string, string>,
): { inserts: CatalogInsert[]; updates: Required<CatalogUpdate>[] } {
  const inserts: CatalogInsert[] = [];
  const updates: Required<CatalogUpdate>[] = result.updates.map((u) => ({
    ...u,
    aliases: u.aliases ?? [],
  }));
  for (const ins of result.inserts) {
    const id = ins.sourceCode ? existingCodeToId.get(ins.sourceCode) : undefined;
    if (id) {
      updates.push({
        productId: id,
        category: ins.category,
        basePurchasePrice: ins.basePurchasePrice,
        baseSalePrice: ins.baseSalePrice,
        sourceCode: ins.sourceCode,
        aliases: ins.aliases,
      });
    } else {
      inserts.push(ins);
    }
  }
  return { inserts, updates };
}

/** 별칭 행 중복 제거 — 회사 내 unique(alias) 기준. 배치 안 in-batch 충돌 예방(회사 id는 고정). */
export function dedupeAliasRows<T extends { alias: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const a = r.alias.trim();
    if (!a || seen.has(a)) continue;
    seen.add(a);
    out.push({ ...r, alias: a });
  }
  return out;
}
