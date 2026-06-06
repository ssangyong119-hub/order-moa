export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>
      <h1>오더모아</h1>
      <p>웹 MVP 스캐폴드 (작업 단위 1).</p>
      <p>도메인 로직(발주 합산 / 거래명세서 / 단가)을 TypeScript로 이전했습니다.</p>
      <p>다음 단위에서 Supabase 인증 · 회사별 데이터 격리(RLS)를 붙입니다.</p>
    </main>
  );
}
