import { expect, test } from "vitest";
import { sampleOrderExamples, sampleProducts } from "./sample-data";
import { PRODUCT_CATEGORIES, isProductCategory } from "./product-category";

function lineCount(rawText: string): number {
  return rawText.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

test("모든 샘플 품목은 6종 카테고리 중 하나를 가진다(하드코딩 개수 금지)", () => {
  expect(sampleProducts.length).toBeGreaterThan(0);
  for (const p of sampleProducts) {
    expect(isProductCategory(p.category), `${p.name} category=${p.category}`).toBe(true);
  }
  // 최소 주요 카테고리가 쓰이는지 확인해 배정 누락/전부 기타 회귀를 막는다.
  const used = new Set(sampleProducts.map((p) => p.category));
  for (const must of ["농산물", "공산품"]) expect(used.has(must as (typeof PRODUCT_CATEGORIES)[number])).toBe(true);
});

test("샘플 발주 예시는 짧은 확인용과 긴 테스트용을 함께 제공한다", () => {
  expect(sampleOrderExamples.length).toBeGreaterThanOrEqual(15);
  expect(sampleOrderExamples.filter((example) => lineCount(example.rawText) >= 6).length).toBeGreaterThanOrEqual(5);
  expect(sampleOrderExamples.some((example) => lineCount(example.rawText) >= 10)).toBe(true);
});
