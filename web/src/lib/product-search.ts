import { findCustomerPrice } from "./domain";
import type { CustomerPrice, Product } from "./domain/types";

export interface ProductSearchResult {
  product: Product;
  unit: string;
  price: number | null;
  supplierName: string;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase();
}

function scoreProduct(product: Product, query: string): number {
  const q = normalize(query);
  if (!q) return 0;
  const tokens = [product.name, ...(product.aliases ?? [])].map(normalize);
  if (tokens.some((token) => token === q)) return 100;
  if (tokens.some((token) => token.startsWith(q))) return 80;
  if (tokens.some((token) => token.includes(q) || q.includes(token))) return 60;
  return 0;
}

export function searchProductsForOrder(
  products: Product[],
  prices: CustomerPrice[],
  customerId: string,
  query: string,
  limit = 8,
): ProductSearchResult[] {
  const q = query.trim();
  if (!q) return [];
  return products
    .map((product) => ({ product, score: scoreProduct(product, q) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, "ko"))
    .slice(0, limit)
    .map(({ product }) => ({
      product,
      unit: product.baseUnit,
      price: findCustomerPrice(prices, customerId, product.id),
      supplierName: product.purchaseSupplierName ?? "매입처 미지정",
    }));
}
