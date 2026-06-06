import { expect, test } from "vitest";
import {
  aggregateItems,
  buildDeliveryNote,
  createId,
  findCustomerPrice,
  getOrderTotal,
} from "./index";
import type { Customer, CustomerPrice, Order, Product } from "./types";

// 기존 tests/domain.test.mjs 의 5개 테스트를 TypeScript + Vitest 로 동일 재현.

test("createId returns stable lowercase prefixes", () => {
  expect(createId("customer")).toMatch(/^customer_[a-z0-9]+$/);
});

test("findCustomerPrice prefers customer-specific prices", () => {
  const prices: CustomerPrice[] = [
    { customerId: "c1", productId: "p1", price: 3000 },
    { customerId: "c2", productId: "p1", price: 3500 },
  ];

  expect(findCustomerPrice(prices, "c2", "p1")).toBe(3500);
  expect(findCustomerPrice(prices, "missing", "p1")).toBe(null);
});

test("getOrderTotal calculates line totals with customer prices", () => {
  const order: Order = {
    id: "o1",
    customerId: "c1",
    items: [
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 3 },
    ],
  };
  const products: Product[] = [
    { id: "p1", name: "콩나물", baseUnit: "박스" },
    { id: "p2", name: "두부", baseUnit: "판" },
  ];
  const prices: CustomerPrice[] = [
    { customerId: "c1", productId: "p1", price: 5000 },
    { customerId: "c1", productId: "p2", price: 2500 },
  ];

  expect(getOrderTotal(order, products, prices)).toBe(17500);
});

test("aggregateItems groups all order items by product", () => {
  const orders: Order[] = [
    {
      id: "o1",
      customerId: "c1",
      items: [
        { productId: "p1", quantity: 2 },
        { productId: "p2", quantity: 1 },
      ],
    },
    {
      id: "o2",
      customerId: "c2",
      items: [{ productId: "p1", quantity: 3 }],
    },
  ];
  const products: Product[] = [
    { id: "p1", name: "콩나물", baseUnit: "박스" },
    { id: "p2", name: "두부", baseUnit: "판" },
  ];

  expect(aggregateItems(orders, products)).toEqual([
    { productId: "p1", productName: "콩나물", unit: "박스", quantity: 5 },
    { productId: "p2", productName: "두부", unit: "판", quantity: 1 },
  ]);
});

test("buildDeliveryNote creates customer-facing rows and totals", () => {
  const customers: Customer[] = [{ id: "c1", name: "마라톤 홀", phone: "010-0000-0000" }];
  const products: Product[] = [
    { id: "p1", name: "미나리", baseUnit: "단" },
    { id: "p2", name: "식탁보", baseUnit: "BOX" },
  ];
  const prices: CustomerPrice[] = [
    { customerId: "c1", productId: "p1", price: 3500 },
    { customerId: "c1", productId: "p2", price: 19500 },
  ];
  const order: Order = {
    id: "o1",
    date: "2026-05-26",
    customerId: "c1",
    items: [
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 1 },
    ],
  };

  expect(buildDeliveryNote(order, customers, products, prices)).toEqual({
    orderId: "o1",
    date: "2026-05-26",
    customerName: "마라톤 홀",
    customerPhone: "010-0000-0000",
    rows: [
      { productName: "미나리", unit: "단", quantity: 2, unitPrice: 3500, amount: 7000 },
      { productName: "식탁보", unit: "BOX", quantity: 1, unitPrice: 19500, amount: 19500 },
    ],
    supplyAmount: 26500,
    vat: 0,
    total: 26500,
  });
});
