// 품목 카테고리 (Phase 2) — 6종 고정, 사용자 정의 없음.
// 단일 소스: UI select / sample-data / store 매핑 / 검증이 전부 이 상수를 쓴다(문자열 중복 방지).
// DB는 ordermoa_products.category(text, NOT NULL DEFAULT '기타', CHECK in 6종) — 0007 마이그레이션.

export const PRODUCT_CATEGORIES = ["농산물", "공산품", "냉식", "육류", "수산", "기타"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** 미지정/이상값의 폴백 카테고리. DB DEFAULT와 동일해야 한다. */
export const DEFAULT_PRODUCT_CATEGORY: ProductCategory = "기타";

export function isProductCategory(value: unknown): value is ProductCategory {
  return typeof value === "string" && (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

/** 어떤 입력이든 유효한 6종 중 하나로 정규화(앞뒤 공백 허용, 그 외는 기타). */
export function normalizeProductCategory(value: unknown): ProductCategory {
  const trimmed = typeof value === "string" ? value.trim() : value;
  return isProductCategory(trimmed) ? trimmed : DEFAULT_PRODUCT_CATEGORY;
}
