import { expect, test } from "vitest";
import {
  DEFAULT_PRODUCT_CATEGORY,
  PRODUCT_CATEGORIES,
  isProductCategory,
  normalizeProductCategory,
} from "./product-category";

test("카테고리는 6종 고정(농산물/공산품/냉식/육류/수산/기타)", () => {
  expect(PRODUCT_CATEGORIES).toEqual(["농산물", "공산품", "냉식", "육류", "수산", "기타"]);
  expect(DEFAULT_PRODUCT_CATEGORY).toBe("기타");
});

test("isProductCategory: 6종만 참, 그 외/비문자열은 거짓", () => {
  for (const c of PRODUCT_CATEGORIES) expect(isProductCategory(c)).toBe(true);
  expect(isProductCategory("잡화")).toBe(false);
  expect(isProductCategory("")).toBe(false);
  expect(isProductCategory(null)).toBe(false);
  expect(isProductCategory(undefined)).toBe(false);
  expect(isProductCategory(3)).toBe(false);
});

test("normalizeProductCategory: 유효값은 그대로, 미지정/이상값은 기타로 폴백", () => {
  expect(normalizeProductCategory("육류")).toBe("육류");
  expect(normalizeProductCategory(" 육류 ")).toBe("육류"); // 앞뒤 공백 허용
  expect(normalizeProductCategory("없는분류")).toBe("기타");
  expect(normalizeProductCategory(null)).toBe("기타");
  expect(normalizeProductCategory(undefined)).toBe("기타");
  expect(normalizeProductCategory("")).toBe("기타");
});
