# Order Moa MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first browser-based MVP of 오더모아: a small static app that manages customers, products, customer-specific prices, daily orders, item aggregation, and delivery-note previews.

**Architecture:** Use a dependency-free static web app so it can run by opening `index.html` directly. Keep business logic in small ES modules under `src/` and test them with Node's built-in test runner. Store prototype data in `localStorage` and keep import/export as JSON so the user can move data between PCs while the product shape is still changing.

**Tech Stack:** HTML, CSS, vanilla JavaScript ES modules, Node.js built-in `node:test`.

---

## File Structure

- Create: `index.html`
  - Main app shell and script entry point.
- Create: `src/styles.css`
  - App layout, table styles, forms, responsive behavior.
- Create: `src/domain.js`
  - Pure functions for IDs, validation, price lookup, order totals, item aggregation, and delivery-note generation.
- Create: `src/storage.js`
  - `localStorage` load/save/export/import helpers.
- Create: `src/sample-data.js`
  - Seed customers, products, prices, and sample orders based on the food delivery use case.
- Create: `src/app.js`
  - UI state, rendering, form handlers, import/export, and calls to domain/storage modules.
- Create: `tests/domain.test.mjs`
  - Node tests for aggregation, price lookup, order totals, and delivery note generation.
- Create: `package.json`
  - Test script only, no dependencies.
- Modify: `docs/order-moa-product-definition.md`
  - Add a section describing MVP 0.1 scope after implementation.

---

### Task 1: Project Skeleton

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/styles.css`
- Create: `src/app.js`

- [ ] **Step 1: Create the package file**

Create `package.json`:

```json
{
  "name": "order-moa-mvp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs"
  }
}
```

- [ ] **Step 2: Create the app shell**

Create `index.html`:

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>오더모아 MVP</title>
  <link rel="stylesheet" href="./src/styles.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./src/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create the initial stylesheet**

Create `src/styles.css`:

```css
:root {
  --bg: #f5f7fa;
  --panel: #ffffff;
  --text: #1d2733;
  --muted: #667085;
  --line: #d8dee8;
  --brand: #0f766e;
  --brand-dark: #115e59;
  --warn: #9a5b00;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: "Malgun Gothic", "Apple SD Gothic Neo", Arial, sans-serif;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  border: 0;
  border-radius: 6px;
  background: var(--brand);
  color: #fff;
  cursor: pointer;
  padding: 9px 12px;
}

button.secondary {
  background: #eef2f6;
  color: var(--text);
}

button.danger {
  background: #b42318;
}

.app-shell {
  min-height: 100vh;
}

.topbar {
  align-items: center;
  background: #ffffff;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  padding: 14px 20px;
}

.brand h1 {
  font-size: 22px;
  line-height: 1.2;
  margin: 0;
}

.brand p {
  color: var(--muted);
  margin: 3px 0 0;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.layout {
  display: grid;
  gap: 16px;
  grid-template-columns: 320px minmax(0, 1fr);
  padding: 16px;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px;
}

.panel h2 {
  font-size: 18px;
  margin: 0 0 12px;
}

.stack {
  display: grid;
  gap: 12px;
}

.form-grid {
  display: grid;
  gap: 10px;
}

.form-row {
  display: grid;
  gap: 5px;
}

.form-row label {
  color: var(--muted);
  font-size: 13px;
}

.form-row input,
.form-row select,
.form-row textarea {
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 9px 10px;
  width: 100%;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.tab {
  background: #eef2f6;
  color: var(--text);
}

.tab.active {
  background: var(--brand);
  color: #ffffff;
}

.table-wrap {
  overflow-x: auto;
}

table {
  border-collapse: collapse;
  min-width: 680px;
  width: 100%;
}

th,
td {
  border-bottom: 1px solid var(--line);
  padding: 9px 8px;
  text-align: left;
  vertical-align: top;
}

th {
  background: #f8fafc;
  color: #344054;
  font-size: 13px;
}

.muted {
  color: var(--muted);
}

.notice {
  background: #fff7e6;
  border: 1px solid #f1d299;
  border-radius: 8px;
  color: var(--warn);
  padding: 12px;
}

.summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metric {
  background: #f8fafc;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
}

.metric strong {
  display: block;
  font-size: 22px;
  margin-top: 4px;
}

.note-preview {
  background: #fff;
  border: 1px solid #aab3c2;
  color: #111827;
  margin-top: 12px;
  padding: 18px;
}

.note-preview h3 {
  font-size: 24px;
  margin: 0 0 14px;
  text-align: center;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Create a temporary app entry**

Create `src/app.js`:

```js
const root = document.querySelector("#app");

root.innerHTML = `
  <main class="app-shell">
    <header class="topbar">
      <div class="brand">
        <h1>오더모아</h1>
        <p>중간 납품업자 전용 발주 취합 ERP</p>
      </div>
    </header>
    <section class="layout">
      <aside class="panel">
        <h2>작업 시작</h2>
        <p class="muted">MVP 골격이 준비되었습니다.</p>
      </aside>
      <section class="panel">
        <h2>오늘의 목표</h2>
        <p>거래처, 품목, 발주, 합산표, 거래명세서를 하나의 흐름으로 연결합니다.</p>
      </section>
    </section>
  </main>
`;
```

- [ ] **Step 5: Open the app manually**

Open `index.html` in a browser.

Expected: The browser shows the 오더모아 title and "MVP 골격이 준비되었습니다."

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json index.html src/styles.css src/app.js
git commit -m "feat: scaffold order moa static app"
```

---

### Task 2: Domain Logic and Tests

**Files:**
- Create: `src/domain.js`
- Create: `tests/domain.test.mjs`

- [ ] **Step 1: Write failing domain tests**

Create `tests/domain.test.mjs`:

```js
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
  const customers = [{ id: "c1", name: "가람식당", phone: "010-0000-0000" }];
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
    customerName: "가람식당",
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test
```

Expected: FAIL because `src/domain.js` does not exist.

- [ ] **Step 3: Implement domain functions**

Create `src/domain.js`:

```js
export function createId(prefix) {
  const safePrefix = String(prefix).toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `${safePrefix}_${unique}`;
}

export function findById(records, id) {
  return records.find((record) => record.id === id) ?? null;
}

export function findCustomerPrice(prices, customerId, productId) {
  const match = prices.find((price) => (
    price.customerId === customerId && price.productId === productId
  ));
  return match ? Number(match.price) : null;
}

export function getProductLabel(products, productId) {
  const product = findById(products, productId);
  return product ? product.name : "알 수 없는 품목";
}

export function getProductUnit(products, productId) {
  const product = findById(products, productId);
  return product ? product.baseUnit : "";
}

export function getOrderTotal(order, products, prices) {
  return order.items.reduce((total, item) => {
    const unitPrice = findCustomerPrice(prices, order.customerId, item.productId) ?? 0;
    return total + Number(item.quantity) * unitPrice;
  }, 0);
}

export function aggregateItems(orders, products) {
  const grouped = new Map();

  for (const order of orders) {
    for (const item of order.items) {
      const current = grouped.get(item.productId) ?? 0;
      grouped.set(item.productId, current + Number(item.quantity));
    }
  }

  return Array.from(grouped.entries())
    .map(([productId, quantity]) => ({
      productId,
      productName: getProductLabel(products, productId),
      unit: getProductUnit(products, productId),
      quantity
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName, "ko"));
}

export function buildDeliveryNote(order, customers, products, prices) {
  const customer = findById(customers, order.customerId);
  const rows = order.items.map((item) => {
    const unitPrice = findCustomerPrice(prices, order.customerId, item.productId) ?? 0;
    const quantity = Number(item.quantity);

    return {
      productName: getProductLabel(products, item.productId),
      unit: getProductUnit(products, item.productId),
      quantity,
      unitPrice,
      amount: quantity * unitPrice
    };
  });
  const supplyAmount = rows.reduce((sum, row) => sum + row.amount, 0);

  return {
    orderId: order.id,
    date: order.date,
    customerName: customer ? customer.name : "알 수 없는 거래처",
    customerPhone: customer ? customer.phone : "",
    rows,
    supplyAmount,
    vat: 0,
    total: supplyAmount
  };
}

export function formatCurrency(value) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
npm test
```

Expected: PASS for all 5 domain tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/domain.js tests/domain.test.mjs package.json
git commit -m "test: add order domain logic"
```

---

### Task 3: Storage and Sample Data

**Files:**
- Create: `src/storage.js`
- Create: `src/sample-data.js`
- Modify: `src/app.js`

- [ ] **Step 1: Create sample data**

Create `src/sample-data.js`:

```js
export const sampleData = {
  customers: [
    { id: "cust_garam", name: "가람식당", phone: "", memo: "가명 샘플 거래처" },
    { id: "cust_hanbit", name: "한빛식품", phone: "", memo: "가명 샘플 거래처" },
    { id: "cust_neulbom", name: "늘봄분식", phone: "", memo: "가명 샘플 거래처" }
  ],
  products: [
    { id: "prod_minari", name: "미나리", baseUnit: "단", aliases: ["미나리", "미나리 국산"] },
    { id: "prod_bean_sprout", name: "콩나물", baseUnit: "박스", aliases: ["콩나물", "콩"] },
    { id: "prod_tofu", name: "두부", baseUnit: "판", aliases: ["두부", "두부판"] },
    { id: "prod_onion", name: "깐양파", baseUnit: "10kg", aliases: ["양파", "깐양파"] },
    { id: "prod_tablecloth", name: "식탁보", baseUnit: "BOX", aliases: ["식탁보"] }
  ],
  prices: [
    { customerId: "cust_marathon", productId: "prod_minari", price: 3500 },
    { customerId: "cust_marathon", productId: "prod_tablecloth", price: 19500 },
    { customerId: "cust_alddol", productId: "prod_bean_sprout", price: 8000 },
    { customerId: "cust_alddol", productId: "prod_tofu", price: 2000 },
    { customerId: "cust_konabari", productId: "prod_onion", price: 11000 },
    { customerId: "cust_konabari", productId: "prod_tofu", price: 2200 }
  ],
  orders: [
    {
      id: "order_20260526_1",
      date: "2026-05-26",
      customerId: "cust_marathon",
      source: "카톡",
      items: [
        { productId: "prod_minari", quantity: 2 },
        { productId: "prod_tablecloth", quantity: 1 }
      ]
    },
    {
      id: "order_20260526_2",
      date: "2026-05-26",
      customerId: "cust_alddol",
      source: "전화",
      items: [
        { productId: "prod_bean_sprout", quantity: 3 },
        { productId: "prod_tofu", quantity: 4 }
      ]
    }
  ]
};
```

- [ ] **Step 2: Create storage helpers**

Create `src/storage.js`:

```js
const STORAGE_KEY = "order-moa-mvp-data";

export function loadData(fallbackData) {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(fallbackData);
  }

  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(fallbackData);
  }
}

export function saveData(data) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetData(fallbackData) {
  const nextData = structuredClone(fallbackData);
  saveData(nextData);
  return nextData;
}

export function exportData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `order-moa-data-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function importDataFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
```

- [ ] **Step 3: Render sample counts**

Replace `src/app.js` with:

```js
import { sampleData } from "./sample-data.js";
import { loadData, resetData, saveData } from "./storage.js";

let data = loadData(sampleData);

const root = document.querySelector("#app");

function render() {
  root.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div class="brand">
          <h1>오더모아</h1>
          <p>중간 납품업자 전용 발주 취합 ERP</p>
        </div>
        <div class="toolbar">
          <button class="secondary" data-action="reset">샘플 데이터 초기화</button>
        </div>
      </header>
      <section class="layout">
        <aside class="panel stack">
          <h2>기초 데이터</h2>
          <div class="summary-grid">
            <div class="metric">거래처<strong>${data.customers.length}</strong></div>
            <div class="metric">품목<strong>${data.products.length}</strong></div>
            <div class="metric">발주<strong>${data.orders.length}</strong></div>
          </div>
          <p class="muted">샘플 데이터가 브라우저 localStorage에 저장됩니다.</p>
        </aside>
        <section class="panel">
          <h2>오늘의 작업</h2>
          <p>다음 작업에서 거래처, 품목, 발주 화면을 연결합니다.</p>
        </section>
      </section>
    </main>
  `;
}

root.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  if (action === "reset") {
    data = resetData(sampleData);
    render();
  }
});

saveData(data);
render();
```

- [ ] **Step 4: Open app and reset sample data**

Open `index.html`.

Expected:
- 거래처 count is 3.
- 품목 count is 5.
- 발주 count is 2.
- Clicking `샘플 데이터 초기화` keeps those counts.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/storage.js src/sample-data.js src/app.js
git commit -m "feat: add local storage and sample data"
```

---

### Task 4: Master Data Screens

**Files:**
- Modify: `src/app.js`
- Modify: `src/styles.css`

- [ ] **Step 1: Add tabbed master-data UI**

Replace `src/app.js` with an implementation that:

```js
import { createId, formatCurrency } from "./domain.js";
import { sampleData } from "./sample-data.js";
import { exportData, importDataFromFile, loadData, resetData, saveData } from "./storage.js";

let data = loadData(sampleData);
let activeTab = "customers";

const root = document.querySelector("#app");

function options(records, selectedId = "") {
  return records
    .map((record) => `<option value="${record.id}" ${record.id === selectedId ? "selected" : ""}>${record.name}</option>`)
    .join("");
}

function renderCustomers() {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>거래처명</th><th>연락처</th><th>메모</th></tr></thead>
        <tbody>
          ${data.customers.map((customer) => `
            <tr>
              <td>${customer.name}</td>
              <td>${customer.phone || "-"}</td>
              <td>${customer.memo || "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <form class="form-grid" data-form="customer">
      <h3>거래처 추가</h3>
      <div class="form-row"><label>거래처명</label><input name="name" required></div>
      <div class="form-row"><label>연락처</label><input name="phone"></div>
      <div class="form-row"><label>메모</label><input name="memo"></div>
      <button type="submit">거래처 저장</button>
    </form>
  `;
}

function renderProducts() {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>품목명</th><th>기본 단위</th><th>별칭</th></tr></thead>
        <tbody>
          ${data.products.map((product) => `
            <tr>
              <td>${product.name}</td>
              <td>${product.baseUnit}</td>
              <td>${product.aliases.join(", ")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <form class="form-grid" data-form="product">
      <h3>품목 추가</h3>
      <div class="form-row"><label>품목명</label><input name="name" required></div>
      <div class="form-row"><label>기본 단위</label><input name="baseUnit" required></div>
      <div class="form-row"><label>별칭, 쉼표로 구분</label><input name="aliases"></div>
      <button type="submit">품목 저장</button>
    </form>
  `;
}

function renderPrices() {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>거래처</th><th>품목</th><th>판매 단가</th></tr></thead>
        <tbody>
          ${data.prices.map((price) => {
            const customer = data.customers.find((item) => item.id === price.customerId);
            const product = data.products.find((item) => item.id === price.productId);
            return `<tr><td>${customer?.name ?? "-"}</td><td>${product?.name ?? "-"}</td><td>${formatCurrency(price.price)}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
    <form class="form-grid" data-form="price">
      <h3>거래처별 단가 추가</h3>
      <div class="form-row"><label>거래처</label><select name="customerId">${options(data.customers)}</select></div>
      <div class="form-row"><label>품목</label><select name="productId">${options(data.products)}</select></div>
      <div class="form-row"><label>판매 단가</label><input name="price" type="number" min="0" required></div>
      <button type="submit">단가 저장</button>
    </form>
  `;
}

function renderActiveTab() {
  if (activeTab === "customers") return renderCustomers();
  if (activeTab === "products") return renderProducts();
  return renderPrices();
}

function render() {
  root.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div class="brand">
          <h1>오더모아</h1>
          <p>중간 납품업자 전용 발주 취합 ERP</p>
        </div>
        <div class="toolbar">
          <button class="secondary" data-action="export">자료 내보내기</button>
          <label class="button-like secondary">자료 가져오기<input hidden type="file" accept="application/json" data-action="import"></label>
          <button class="secondary" data-action="reset">샘플 초기화</button>
        </div>
      </header>
      <section class="layout">
        <aside class="panel stack">
          <h2>기초 데이터</h2>
          <div class="summary-grid">
            <div class="metric">거래처<strong>${data.customers.length}</strong></div>
            <div class="metric">품목<strong>${data.products.length}</strong></div>
            <div class="metric">단가<strong>${data.prices.length}</strong></div>
          </div>
          <p class="notice">이 화면은 첫 MVP용입니다. 실제 세무/계산서 발행 기능은 아직 포함하지 않습니다.</p>
        </aside>
        <section class="panel">
          <div class="tabs">
            <button class="tab ${activeTab === "customers" ? "active" : ""}" data-tab="customers">거래처</button>
            <button class="tab ${activeTab === "products" ? "active" : ""}" data-tab="products">품목</button>
            <button class="tab ${activeTab === "prices" ? "active" : ""}" data-tab="prices">거래처별 단가</button>
          </div>
          <div class="stack">${renderActiveTab()}</div>
        </section>
      </section>
    </main>
  `;
}

root.addEventListener("click", (event) => {
  const tab = event.target.dataset.tab;
  const action = event.target.dataset.action;

  if (tab) {
    activeTab = tab;
    render();
  }

  if (action === "reset") {
    data = resetData(sampleData);
    activeTab = "customers";
    render();
  }

  if (action === "export") {
    exportData(data);
  }
});

root.addEventListener("change", async (event) => {
  if (event.target.dataset.action === "import" && event.target.files.length > 0) {
    data = await importDataFromFile(event.target.files[0]);
    saveData(data);
    render();
  }
});

root.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const formType = form.dataset.form;

  if (formType === "customer") {
    data.customers.push({
      id: createId("customer"),
      name: String(formData.get("name")).trim(),
      phone: String(formData.get("phone")).trim(),
      memo: String(formData.get("memo")).trim()
    });
  }

  if (formType === "product") {
    const name = String(formData.get("name")).trim();
    const aliases = String(formData.get("aliases"))
      .split(",")
      .map((alias) => alias.trim())
      .filter(Boolean);
    data.products.push({
      id: createId("product"),
      name,
      baseUnit: String(formData.get("baseUnit")).trim(),
      aliases: aliases.length > 0 ? aliases : [name]
    });
  }

  if (formType === "price") {
    const nextPrice = {
      customerId: String(formData.get("customerId")),
      productId: String(formData.get("productId")),
      price: Number(formData.get("price"))
    };
    data.prices = data.prices.filter((price) => !(
      price.customerId === nextPrice.customerId && price.productId === nextPrice.productId
    ));
    data.prices.push(nextPrice);
  }

  saveData(data);
  form.reset();
  render();
});

saveData(data);
render();
```

- [ ] **Step 2: Add file-input label styling**

Append to `src/styles.css`:

```css
.button-like {
  border-radius: 6px;
  cursor: pointer;
  display: inline-block;
  padding: 9px 12px;
}

.button-like.secondary {
  background: #eef2f6;
  color: var(--text);
}

.form-grid h3 {
  margin: 8px 0 0;
}
```

- [ ] **Step 3: Manual verify master data**

Open `index.html`.

Expected:
- Tabs switch between 거래처, 품목, 거래처별 단가.
- Adding a customer increases 거래처 count.
- Adding a product increases 품목 count.
- Adding a price displays formatted currency.
- Export downloads a JSON file.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/app.js src/styles.css
git commit -m "feat: add master data screens"
```

---

### Task 5: Orders, Aggregation, and Delivery Notes

**Files:**
- Modify: `src/app.js`
- Modify: `src/styles.css`

- [ ] **Step 1: Add order rendering helpers**

Modify `src/app.js` to import domain helpers:

```js
import {
  aggregateItems,
  buildDeliveryNote,
  createId,
  formatCurrency,
  getOrderTotal
} from "./domain.js";
```

Add tabs `orders`, `aggregation`, and `deliveryNotes`.

Add these renderer functions:

```js
function renderOrders() {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>일자</th><th>거래처</th><th>접수 방식</th><th>품목 수</th><th>금액</th></tr></thead>
        <tbody>
          ${data.orders.map((order) => {
            const customer = data.customers.find((item) => item.id === order.customerId);
            return `
              <tr>
                <td>${order.date}</td>
                <td>${customer?.name ?? "-"}</td>
                <td>${order.source}</td>
                <td>${order.items.length}</td>
                <td>${formatCurrency(getOrderTotal(order, data.products, data.prices))}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
    <form class="form-grid" data-form="order">
      <h3>발주 추가</h3>
      <div class="form-row"><label>일자</label><input name="date" type="date" required value="${new Date().toISOString().slice(0, 10)}"></div>
      <div class="form-row"><label>거래처</label><select name="customerId">${options(data.customers)}</select></div>
      <div class="form-row"><label>접수 방식</label><select name="source"><option>카톡</option><option>전화</option><option>문자</option><option>사진</option><option>직접입력</option></select></div>
      <div class="form-row"><label>품목</label><select name="productId">${options(data.products)}</select></div>
      <div class="form-row"><label>수량</label><input name="quantity" type="number" min="0.1" step="0.1" required></div>
      <button type="submit">발주 저장</button>
    </form>
  `;
}

function renderAggregation() {
  const rows = aggregateItems(data.orders, data.products);
  return `
    <h3>오늘 전체 물량 합산</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>품목</th><th>총 수량</th><th>단위</th></tr></thead>
        <tbody>
          ${rows.map((row) => `<tr><td>${row.productName}</td><td>${row.quantity}</td><td>${row.unit}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderDeliveryNotes() {
  return data.orders.map((order) => {
    const note = buildDeliveryNote(order, data.customers, data.products, data.prices);
    return `
      <article class="note-preview">
        <h3>거래명세서</h3>
        <p><strong>거래처:</strong> ${note.customerName}</p>
        <p><strong>일자:</strong> ${note.date}</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>품목</th><th>수량</th><th>단위</th><th>단가</th><th>금액</th></tr></thead>
            <tbody>
              ${note.rows.map((row) => `
                <tr>
                  <td>${row.productName}</td>
                  <td>${row.quantity}</td>
                  <td>${row.unit}</td>
                  <td>${formatCurrency(row.unitPrice)}</td>
                  <td>${formatCurrency(row.amount)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <p><strong>합계:</strong> ${formatCurrency(note.total)}</p>
      </article>
    `;
  }).join("");
}
```

- [ ] **Step 2: Wire tab selection**

Update `renderActiveTab()`:

```js
function renderActiveTab() {
  if (activeTab === "customers") return renderCustomers();
  if (activeTab === "products") return renderProducts();
  if (activeTab === "prices") return renderPrices();
  if (activeTab === "orders") return renderOrders();
  if (activeTab === "aggregation") return renderAggregation();
  return renderDeliveryNotes();
}
```

Update the tab HTML:

```html
<button class="tab ${activeTab === "customers" ? "active" : ""}" data-tab="customers">거래처</button>
<button class="tab ${activeTab === "products" ? "active" : ""}" data-tab="products">품목</button>
<button class="tab ${activeTab === "prices" ? "active" : ""}" data-tab="prices">거래처별 단가</button>
<button class="tab ${activeTab === "orders" ? "active" : ""}" data-tab="orders">발주 입력</button>
<button class="tab ${activeTab === "aggregation" ? "active" : ""}" data-tab="aggregation">도매상 발주 합산</button>
<button class="tab ${activeTab === "deliveryNotes" ? "active" : ""}" data-tab="deliveryNotes">거래명세서</button>
```

- [ ] **Step 3: Add order submit behavior**

In the `submit` listener, add:

```js
if (formType === "order") {
  data.orders.push({
    id: createId("order"),
    date: String(formData.get("date")),
    customerId: String(formData.get("customerId")),
    source: String(formData.get("source")),
    items: [
      {
        productId: String(formData.get("productId")),
        quantity: Number(formData.get("quantity"))
      }
    ]
  });
}
```

- [ ] **Step 4: Manual verify order flow**

Open `index.html`.

Expected:
- `발주 입력` tab shows existing sample orders.
- Adding a new order increases order count.
- `도매상 발주 합산` groups quantities by product.
- `거래명세서` shows one preview per order.

- [ ] **Step 5: Run tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app.js src/styles.css
git commit -m "feat: add orders aggregation and delivery notes"
```

---

### Task 6: Prototype Documentation

**Files:**
- Modify: `docs/order-moa-product-definition.md`
- Modify: `docs/erp-discovery-log.md`

- [ ] **Step 1: Document MVP 0.1 scope**

Append to `docs/order-moa-product-definition.md`:

```markdown
## 13. MVP 0.1 구현 범위

첫 구현은 브라우저에서 바로 열 수 있는 정적 프로토타입이다.

포함 기능:

- 거래처 등록
- 품목 등록
- 거래처별 판매 단가 등록
- 거래처별 발주 입력
- 도매상 발주용 상품별 총 물량 합산
- 거래처별 거래명세서 미리보기
- JSON 자료 내보내기/가져오기

제외 기능:

- 실제 세금계산서 발행
- 계좌 입금 자동 매칭
- 카카오톡 자동 읽기
- 사진 OCR 자동 추출
- 이카운트 직접 연동

목적:

- 설문 결과가 도착하기 전까지 제품 흐름을 눈으로 확인한다.
- 친구 업무 흐름을 기준으로 첫 화면과 핵심 데이터를 검증한다.
- 추후 설문 결과에 따라 미수금, 세금계산서, OCR, 거래처 주문 링크 중 우선순위를 정한다.
```

- [ ] **Step 2: Update discovery log**

Append to `docs/erp-discovery-log.md`:

```markdown
## 14. MVP 0.1 작업 시작

작업 시작일: 2026-05-26

첫 구현은 의존성 없는 정적 앱으로 시작한다.

이유:

- 설문 결과가 오기 전이라 요구사항이 바뀔 수 있다.
- 빠르게 화면 흐름을 확인할 수 있다.
- 회사/집에서 파일만 열어도 확인 가능하다.
- Google Drive나 Git으로 자료를 이동하기 쉽다.

첫 목표:

- 거래처, 품목, 단가, 발주, 도매상 발주 합산, 거래명세서 미리보기를 한 흐름으로 만든다.
```

- [ ] **Step 3: Run tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Open app manually**

Open `index.html`.

Expected:
- Master data tabs work.
- Order entry works.
- Aggregation works.
- Delivery notes render.

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/order-moa-product-definition.md docs/erp-discovery-log.md
git commit -m "docs: document order moa mvp scope"
```

---

## Self-Review

Spec coverage:

- Product target is covered by customer/product/price/order data.
- Middle-distributor workflow is covered by order entry, item aggregation, and delivery-note previews.
- Initial replacement scope for the small subset of ECOUNT usage is covered by prices, sales/order totals, and delivery-note previews.
- Deferred areas are explicitly excluded: Kakao automation, OCR, tax invoice issuing, bank matching, ECOUNT integration.

Placeholder scan:

- No TBD/TODO placeholders are present.
- Each implementation step includes exact file paths and code.

Type consistency:

- IDs use string fields: `customerId`, `productId`, `order.id`.
- Order items consistently use `productId` and `quantity`.
- Prices consistently use `customerId`, `productId`, and `price`.
