import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateItems,
  buildDeliveryNote,
  createId,
  findCustomerPrice,
  getOrderTotal
} from "../src/domain.js";

test("createId returns stable lowercase prefixes", () => {
  assert.match(createId("customer"), /^customer_[a-z0-9]+$/);
});

test("findCustomerPrice prefers customer-specific prices", () => {
  const prices = [
    { customerId: "c1", productId: "p1", price: 3000 },
    { customerId: "c2", productId: "p1", price: 3500 }
  ];

  assert.equal(findCustomerPrice(prices, "c2", "p1"), 3500);
  assert.equal(findCustomerPrice(prices, "missing", "p1"), null);
});

test("getOrderTotal calculates line totals with customer prices", () => {
  const order = {
    customerId: "c1",
    items: [
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 3 }
    ]
  };
  const products = [
    { id: "p1", name: "콩나물", baseUnit: "박스" },
    { id: "p2", name: "두부", baseUnit: "판" }
  ];
  const prices = [
    { customerId: "c1", productId: "p1", price: 5000 },
    { customerId: "c1", productId: "p2", price: 2500 }
  ];

  assert.equal(getOrderTotal(order, products, prices), 17500);
});

test("aggregateItems groups all order items by product", () => {
  const orders = [
    {
      customerId: "c1",
      items: [
        { productId: "p1", quantity: 2 },
        { productId: "p2", quantity: 1 }
      ]
    },
    {
      customerId: "c2",
      items: [
        { productId: "p1", quantity: 3 }
      ]
    }
  ];
  const products = [
    { id: "p1", name: "콩나물", baseUnit: "박스" },
    { id: "p2", name: "두부", baseUnit: "판" }
  ];

  assert.deepEqual(aggregateItems(orders, products), [
    { productId: "p1", productName: "콩나물", unit: "박스", quantity: 5 },
    { productId: "p2", productName: "두부", unit: "판", quantity: 1 }
  ]);
});

test("buildDeliveryNote creates customer-facing rows and totals", () => {
  const customers = [{ id: "c1", name: "마라톤 홀", phone: "010-0000-0000" }];
  const products = [
    { id: "p1", name: "미나리", baseUnit: "단" },
    { id: "p2", name: "식탁보", baseUnit: "BOX" }
  ];
  const prices = [
    { customerId: "c1", productId: "p1", price: 3500 },
    { customerId: "c1", productId: "p2", price: 19500 }
  ];
  const order = {
    id: "o1",
    date: "2026-05-26",
    customerId: "c1",
    items: [
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 1 }
    ]
  };

  assert.deepEqual(buildDeliveryNote(order, customers, products, prices), {
    orderId: "o1",
    date: "2026-05-26",
    customerName: "마라톤 홀",
    customerPhone: "010-0000-0000",
    rows: [
      { productName: "미나리", unit: "단", quantity: 2, unitPrice: 3500, amount: 7000 },
      { productName: "식탁보", unit: "BOX", quantity: 1, unitPrice: 19500, amount: 19500 }
    ],
    supplyAmount: 26500,
    vat: 0,
    total: 26500
  });
});
