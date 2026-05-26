import {
  aggregateItems,
  buildDeliveryNote,
  createId,
  formatCurrency,
  getOrderTotal
} from "./domain.js";
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

function renderActiveTab() {
  if (activeTab === "customers") return renderCustomers();
  if (activeTab === "products") return renderProducts();
  if (activeTab === "prices") return renderPrices();
  if (activeTab === "orders") return renderOrders();
  if (activeTab === "aggregation") return renderAggregation();
  return renderDeliveryNotes();
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
            <button class="tab ${activeTab === "orders" ? "active" : ""}" data-tab="orders">발주 입력</button>
            <button class="tab ${activeTab === "aggregation" ? "active" : ""}" data-tab="aggregation">도매상 발주 합산</button>
            <button class="tab ${activeTab === "deliveryNotes" ? "active" : ""}" data-tab="deliveryNotes">거래명세서</button>
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

  saveData(data);
  form.reset();
  render();
});

saveData(data);
render();
