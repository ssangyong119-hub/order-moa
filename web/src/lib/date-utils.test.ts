import { expect, test } from "vitest";
import { todayKst } from "./date-utils";

test("todayKst: KST(UTC+9) 벽시계 기준 날짜", () => {
  // UTC 낮 → 같은 날
  expect(todayKst(new Date("2026-07-08T03:00:00Z"))).toBe("2026-07-08");
});

test("todayKst: 한국 새벽(UTC 전날 15~24시)에도 KST 오늘로", () => {
  // UTC 2026-07-07 16:00 = KST 2026-07-08 01:00 → 전날(UTC) 아니라 08일이어야 함
  expect(todayKst(new Date("2026-07-07T16:00:00Z"))).toBe("2026-07-08");
  // UTC 2026-07-07 23:00 = KST 2026-07-08 08:00
  expect(todayKst(new Date("2026-07-07T23:00:00Z"))).toBe("2026-07-08");
});

test("todayKst: KST 자정 경계(UTC 15:00)에서 날짜가 넘어간다", () => {
  // UTC 2026-07-08 14:59 = KST 2026-07-08 23:59
  expect(todayKst(new Date("2026-07-08T14:59:00Z"))).toBe("2026-07-08");
  // UTC 2026-07-08 15:00 = KST 2026-07-09 00:00
  expect(todayKst(new Date("2026-07-08T15:00:00Z"))).toBe("2026-07-09");
});
