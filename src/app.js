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
