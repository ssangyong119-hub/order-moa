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
