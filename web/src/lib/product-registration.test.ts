import { describe, expect, test } from "vitest";
import { buildNewProductRegistration } from "./product-registration";
import type { ParsedLine } from "./order-parser";

const unmatchedBananaLine: ParsedLine = {
  id: "line_1",
  rawText: "바나나 20kg",
  productId: null,
  productName: "바나나",
  quantity: 20,
  quantityRaw: "20",
  unit: "kg",
  unitPrice: 800,
  priceRegistered: false,
  status: "unmatched",
  wasUnmatched: true,
};

describe("buildNewProductRegistration", () => {
  test("미매칭 줄을 신규 품목으로 저장하면 현재 줄과 고객 단가가 바로 연결된다", () => {
    const result = buildNewProductRegistration(
      unmatchedBananaLine,
      {
        customerId: "c01",
        name: "바나나",
        unit: "kg",
        unitPrice: 800,
        purchaseSupplierName: "야채매입처",
      },
      () => "p_new",
    );

    expect(result.product).toEqual({
      id: "p_new",
      name: "바나나",
      baseUnit: "kg",
      aliases: [],
      purchaseSupplierId: null,
      purchaseSupplierName: "야채매입처",
      basePurchasePrice: null,
    });
    expect(result.customerPrice).toEqual({ customerId: "c01", productId: "p_new", price: 800 });
    expect(result.line).toMatchObject({
      productId: "p_new",
      productName: "바나나",
      unit: "kg",
      unitPrice: 800,
      priceRegistered: true,
      status: "matched",
      needsProductConfirmation: false,
    });
  });
});
