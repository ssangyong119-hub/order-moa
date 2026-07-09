import { expect, test } from "vitest";
import { buildPriceRows, collectPriceChanges, validatePriceValue } from "./price-store";
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

test("collectPriceChanges: 변경/신규만 추리고 0원·미매칭·동일값 제외", () => {
  // c1 기존: p1=4500. 라인: p1을 5000으로(변경), p2 3000(신규), p3 0원(제외), 품목없음(제외), p1 다시 4500이면 동일(제외 대상이지만 아래 마지막값 규칙)
  const lines = [
    { productId: "p1", productName: "콩나물", unitPrice: 5000 }, // 4500→5000 변경
    { productId: "p2", productName: "두부", unitPrice: 3000 }, // 신규
    { productId: "p3", productName: "숙주", unitPrice: 0 }, // 0원 제외
    { productId: null, productName: "미매칭", unitPrice: 999 }, // productId 없음 제외
  ];
  const { changes, conflicts } = collectPriceChanges(lines, prices, "c1");
  expect(changes).toEqual([
    { customerId: "c1", productId: "p1", productName: "콩나물", price: 5000 },
    { customerId: "c1", productId: "p2", productName: "두부", price: 3000 },
  ]);
  expect(conflicts).toEqual([]);
});

test("collectPriceChanges(W22): 품목 기본 출고단가 fallback 라인(priceSource=base)은 일괄 저장 제외", () => {
  // p2가 거래처 단가 없이 기본가 3000으로 떴을 뿐(사용자 미수정) → customer_prices에 안 넣는다.
  const lines = [
    { productId: "p1", productName: "콩나물", unitPrice: 5000, priceSource: "customer" as const }, // 변경 → 저장
    { productId: "p2", productName: "두부", unitPrice: 3000, priceSource: "base" as const }, // 기본가 fallback → 제외
  ];
  const { changes } = collectPriceChanges(lines, prices, "c1");
  expect(changes).toEqual([{ customerId: "c1", productId: "p1", productName: "콩나물", price: 5000 }]);
  // 사용자가 그 기본가를 직접 고치면(priceSource 지워짐) 다시 저장 대상이 된다.
  const edited = [{ productId: "p2", productName: "두부", unitPrice: 3200 }];
  expect(collectPriceChanges(edited, prices, "c1").changes).toEqual([
    { customerId: "c1", productId: "p2", productName: "두부", price: 3200 },
  ]);
});

test("collectPriceChanges: 기존과 같은 값은 저장 대상 아님", () => {
  const lines = [{ productId: "p1", productName: "콩나물", unitPrice: 4500 }]; // c1 기존 4500과 동일
  expect(collectPriceChanges(lines, prices, "c1").changes).toEqual([]);
});

test("collectPriceChanges: 같은 품목 여러 줄 다른 값 → 마지막 값으로 통일 + conflict 보고", () => {
  const lines = [
    { productId: "p2", productName: "두부", unitPrice: 3000 },
    { productId: "p2", productName: "두부", unitPrice: 3500 }, // 마지막 값
  ];
  const { changes, conflicts } = collectPriceChanges(lines, prices, "c1");
  expect(changes).toEqual([{ customerId: "c1", productId: "p2", productName: "두부", price: 3500 }]);
  expect(conflicts).toEqual(["두부"]);
});

test("validatePriceValue: 0 이상 정수만 허용", () => {
  expect(validatePriceValue("4500")).toBeNull();
  expect(validatePriceValue("0")).toBeNull();
  expect(validatePriceValue("")).toBe("단가를 입력해주세요.");
  expect(validatePriceValue("-100")).toBe("단가는 0 이상 숫자로 입력해주세요.");
  expect(validatePriceValue("abc")).toBe("단가는 0 이상 숫자로 입력해주세요.");
});
