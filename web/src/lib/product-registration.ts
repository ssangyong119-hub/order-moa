import type { CustomerPrice, Product } from "./domain/types";
import type { ParsedLine } from "./order-parser";

export interface NewProductRegistrationInput {
  customerId: string;
  name: string;
  unit: string;
  unitPrice: number;
  purchaseSupplierName?: string;
}

export interface NewProductRegistrationResult {
  product: Product;
  customerPrice: CustomerPrice | null;
  line: ParsedLine;
}

export function buildNewProductRegistration(
  line: ParsedLine,
  input: NewProductRegistrationInput,
  makeId: () => string = () => crypto.randomUUID(),
): NewProductRegistrationResult {
  const id = makeId();
  const name = input.name.trim();
  const unit = input.unit.trim() || line.unit || "개";
  const unitPrice = Math.max(0, Math.round(input.unitPrice || 0));
  const supplierName = input.purchaseSupplierName?.trim() || null;
  const customerPrice = unitPrice > 0 ? { customerId: input.customerId, productId: id, price: unitPrice } : null;

  return {
    product: {
      id,
      name,
      baseUnit: unit,
      aliases: [],
      purchaseSupplierId: null,
      purchaseSupplierName: supplierName,
      basePurchasePrice: null,
    },
    customerPrice,
    line: {
      ...line,
      productId: id,
      productName: name,
      unit,
      unitPrice,
      priceRegistered: Boolean(customerPrice),
      status: line.quantity == null || line.quantity <= 0 ? "qty_uncertain" : "matched",
      needsProductConfirmation: false,
      candidateProductIds: undefined,
    },
  };
}
