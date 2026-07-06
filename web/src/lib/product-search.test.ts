import { expect, test } from "vitest";
import type { CustomerPrice, Product } from "./domain/types";
import { searchProductsForOrder } from "./product-search";

const products: Product[] = [
  { id: "p1", name: "배추김치", baseUnit: "kg", aliases: ["김치"], purchaseSupplierName: "김치매입처" },
  { id: "p2", name: "총각김치", baseUnit: "kg", aliases: ["알타리김치"], purchaseSupplierName: "김치매입처" },
  { id: "p3", name: "철수세미", baseUnit: "개", aliases: ["수세미"], purchaseSupplierName: "공산품매입처" },
  { id: "p4", name: "콩나물", baseUnit: "박스", aliases: ["콩"], purchaseSupplierName: "두부콩나물매입처" },
];

const prices: CustomerPrice[] = [
  { customerId: "c1", productId: "p1", price: 9000 },
  { customerId: "c1", productId: "p2", price: 8500 },
  { customerId: "c1", productId: "p3", price: 1200 },
];

test("품목 검색: 김치를 입력하면 관련 품목과 단위/단가/매입처 미리보기를 반환한다", () => {
  const result = searchProductsForOrder(products, prices, "c1", "김치");
  expect(result.map((item) => item.product.name)).toEqual(["배추김치", "총각김치"]);
  expect(result.map((item) => [item.unit, item.price, item.supplierName])).toEqual([
    ["kg", 9000, "김치매입처"],
    ["kg", 8500, "김치매입처"],
  ]);
});

test("품목 검색: 별칭으로 찾아도 결과가 나오고 단가 미등록은 null로 표시한다", () => {
  const result = searchProductsForOrder(products, prices, "c2", "수세미");
  expect(result).toHaveLength(1);
  expect(result[0].product.id).toBe("p3");
  expect(result[0].price).toBe(null);
  expect(result[0].unit).toBe("개");
});
