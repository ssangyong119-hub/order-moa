// 거래처별 판매단가 관리 (W04) — 테이블: ordermoa_customer_prices(기존, 마이그레이션 없음).
// 과거 주문의 unit_price 스냅샷은 절대 건드리지 않는다(헌장 불변 규칙) — 여기서는 현재 단가표만.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomerPrice, Product } from "./domain/types";

export interface PriceRow {
  productId: string;
  name: string;
  baseUnit: string;
  /** null = 이 거래처에 단가 미등록 */
  price: number | null;
}

/** 선택 거래처의 품목별 단가 목록. query는 품목명+별칭 검색, onlyMissing이면 미등록만. */
export function buildPriceRows(
  products: Product[],
  prices: CustomerPrice[],
  customerId: string,
  query = "",
  onlyMissing = false,
): PriceRow[] {
  const priceByProduct = new Map(
    prices.filter((p) => p.customerId === customerId).map((p) => [p.productId, p.price]),
  );
  const q = query.trim().toLowerCase();
  return products
    .filter(
      (p) =>
        !q ||
        [p.name, ...(p.aliases ?? [])].some((v) => v.toLowerCase().includes(q)),
    )
    .map((p) => ({
      productId: p.id,
      name: p.name,
      baseUnit: p.baseUnit,
      price: priceByProduct.get(p.id) ?? null,
    }))
    .filter((row) => !onlyMissing || row.price === null);
}

export function validatePriceValue(raw: string): string | null {
  const s = raw.trim();
  if (s === "") return "단가를 입력해주세요.";
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return "단가는 0 이상 숫자로 입력해주세요.";
  return null;
}

// ---- 파싱 화면 단가 일괄 저장 (Phase 1) ----

export interface PriceChange {
  customerId: string;
  productId: string;
  productName: string;
  price: number;
}

/** 최소 입력 타입 — ParsedLine이 구조적으로 만족 */
export interface PriceChangeLine {
  productId?: string | null;
  productName: string;
  unitPrice: number;
}

/**
 * 파싱 라인 중 customer_prices에 저장할 변경분만 추린다.
 * - productId 있고 unitPrice>0 인 라인만
 * - 같은 productId 여러 줄이면 마지막 값으로 통일(conflicts에 품목명 보고)
 * - 기존 단가와 같으면 제외(변경/신규만)
 */
export function collectPriceChanges(
  lines: PriceChangeLine[],
  prices: CustomerPrice[],
  customerId: string,
): { changes: PriceChange[]; conflicts: string[] } {
  const existing = new Map(
    prices.filter((p) => p.customerId === customerId).map((p) => [p.productId, p.price]),
  );
  // 마지막 값으로 통일 + 여러 줄 다른 값이면 conflict
  const byProduct = new Map<string, { name: string; price: number; multi: boolean; firstPrice: number }>();
  for (const l of lines) {
    if (!l.productId || !(l.unitPrice > 0)) continue;
    const prev = byProduct.get(l.productId);
    if (prev) {
      byProduct.set(l.productId, {
        name: l.productName,
        price: l.unitPrice, // 마지막 값
        multi: prev.multi || prev.firstPrice !== l.unitPrice,
        firstPrice: prev.firstPrice,
      });
    } else {
      byProduct.set(l.productId, { name: l.productName, price: l.unitPrice, multi: false, firstPrice: l.unitPrice });
    }
  }
  const changes: PriceChange[] = [];
  const conflicts: string[] = [];
  for (const [productId, v] of byProduct) {
    if (v.multi) conflicts.push(v.name);
    if (existing.get(productId) === v.price) continue; // 기존과 동일 → 제외
    changes.push({ customerId, productId, productName: v.name, price: v.price });
  }
  return { changes, conflicts };
}

/** 여러 단가를 한 번의 upsert로 저장(customer_prices만). 과거 order_items는 무관. */
export async function upsertCustomerPricesInDb(
  db: SupabaseClient,
  companyId: string,
  customerId: string,
  changes: Array<{ productId: string; price: number }>,
): Promise<void> {
  if (changes.length === 0) return;
  const res = await db.from("ordermoa_customer_prices").upsert(
    changes.map((c) => ({
      company_id: companyId,
      customer_id: customerId,
      product_id: c.productId,
      sale_price: c.price,
    })),
    { onConflict: "company_id,customer_id,product_id" },
  );
  if (res.error) throw res.error;
}

/** upsert — 파싱 화면의 '이 단가 저장'과 같은 onConflict 규칙 */
export async function upsertCustomerPriceInDb(
  db: SupabaseClient,
  companyId: string,
  customerId: string,
  productId: string,
  price: number,
): Promise<void> {
  const res = await db.from("ordermoa_customer_prices").upsert(
    {
      company_id: companyId,
      customer_id: customerId,
      product_id: productId,
      sale_price: price,
    },
    { onConflict: "company_id,customer_id,product_id" },
  );
  if (res.error) throw res.error;
}
