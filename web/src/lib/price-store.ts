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
