"use client";

// Next.js App Router 네이티브 에러 경계 — 렌더 오류를 사용자에게 노출하지 않고
// 친화적 메시지 + 다시 시도 버튼만 보여준다 (task-prompt-unit-6: 오류 비노출).
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="app">
      <div className="card" style={{ textAlign: "center" }}>
        <h2>잠시 문제가 발생했어요</h2>
        <p className="muted">화면을 다시 불러오면 계속 사용할 수 있습니다.</p>
        <button className="primary" onClick={() => reset()} style={{ marginTop: 8 }}>
          다시 시도
        </button>
      </div>
    </main>
  );
}
