import { expect, test } from "vitest";
import { buildPriceRows, validatePriceValue } from "./price-store";
import type { CustomerPrice, Product } from "./domain/types";

const products: Product[] = [
  { id: "p1", name: "콩나물", baseUnit: "박스", aliases: ["콩"] },
  { id: "p2", name: "두부", baseUnit: "판" },
  { id: "p3", name: "숙주", baseUnit: "봉", aliases: ["세척숙주"] },
];
const prices: CustomerPrice[] = [
  { customerId: "c1", productId: "p1", price: 4500 },
  { customerId: "c2", productId: "p2", price: 9999 }, // 다른 거래처 단가는 안 섞여야 함
];

test("buildPriceRows: 선택 거래처의 품목별 단가(미등록은 null)", () => {
  const rows = buildPriceRows(products, prices, "c1");
  expect(rows).toEqual([
    { productId: "p1", name: "콩나물", baseUnit: "박스", price: 4500 },
    { productId: "p2", name: "두부", baseUnit: "판", price: null },
    { productId: "p3", name: "숙주", baseUnit: "봉", price: null },
  ]);
});

test("buildPriceRows: 품목명/별칭 검색", () => {
  expect(buildPriceRows(products, prices, "c1", "세척").map((r) => r.name)).toEqual(["숙주"]);
  expect(buildPriceRows(products, prices, "c1", "두").map((r) => r.name)).toEqual(["두부"]);
});

test("buildPriceRows: 미등록만 보기", () => {
  expect(buildPriceRows(products, prices, "c1", "", true).map((r) => r.name)).toEqual([
    "두부",
    "숙주",
  ]);
});

test("validatePriceValue: 0 이상 정수만 허용", () => {
  expect(validatePriceValue("4500")).toBeNull();
  expect(validatePriceValue("0")).toBeNull();
  expect(validatePriceValue("")).toBe("단가를 입력해주세요.");
  expect(validatePriceValue("-100")).toBe("단가는 0 이상 숫자로 입력해주세요.");
  expect(validatePriceValue("abc")).toBe("단가는 0 이상 숫자로 입력해주세요.");
});
