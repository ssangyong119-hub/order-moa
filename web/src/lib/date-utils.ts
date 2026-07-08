// 날짜 유틸 — 주문일은 한국시간(KST, UTC+9) 벽시계 날짜를 기준으로 한다.
// new Date().toISOString()은 UTC라 KST 00~09시에 전날로 저장되던 버그를 막는다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** KST 기준 오늘 날짜(YYYY-MM-DD). now를 주입해 테스트 가능. */
export function todayKst(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}
