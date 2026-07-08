import { expect, test } from "vitest";
import { availableMonths, buildMonthlySummary, type MonthlyOrderInput } from "./monthly-summary";

// total은 확정 시점 스냅샷 합계(order.total)만 쓴다 — 단가표(customer_prices) 입력이 아예 없음(구조로 보장).
const orders: MonthlyOrderInput[] = [
  { date: "2026-07-02", customerId: "c1", customerName: "가람식당", total: 30000 },
  { date: "2026-07-20", customerId: "c1", customerName: "가람식당", total: 20000 },
  { date: "2026-07-10", customerId: "c2", customerName: "한빛카페", total: 80000 },
  { date: "2026-06-30", customerId: "c1", customerName: "가람식당", total: 999999 }, // 지난달 → 제외
  { date: "2026-07-15", customerId: "c3", customerName: "으뜸반찬", total: 80000 },
];

test("buildMonthlySummary: 같은 달 거래처별 합산 + 금액 내림차순(동률은 이름순)", () => {
  const s = buildMonthlySummary(orders, "2026-07");
  expect(s.rows.map((r) => [r.customerName, r.orderCount, r.totalAmount, r.lastOrderDate])).toEqual([
    ["한빛카페", 1, 80000, "2026-07-10"],
    ["으뜸반찬", 1, 80000, "2026-07-15"], // 80000 동률 → 이름순 으뜸<한빛? "으뜸" < "한빛"
    ["가람식당", 2, 50000, "2026-07-20"], // 30000+20000, 마지막 주문일=20일
  ].sort((a, b) => (b[2] as number) - (a[2] as number) || String(a[0]).localeCompare(String(b[0]), "ko")));
});

test("buildMonthlySummary: 다른 달은 제외(지난달 999999 안 들어감)", () => {
  const s = buildMonthlySummary(orders, "2026-07");
  expect(s.rows.every((r) => r.totalAmount !== 999999)).toBe(true);
  expect(s.totalAmount).toBe(30000 + 20000 + 80000 + 80000); // 210000
  expect(s.orderCount).toBe(4);
  expect(s.month).toBe("2026-07");
});

test("buildMonthlySummary: 해당 월 주문 없으면 빈 rows·0 합계", () => {
  const s = buildMonthlySummary(orders, "2026-01");
  expect(s.rows).toEqual([]);
  expect(s.totalAmount).toBe(0);
  expect(s.orderCount).toBe(0);
});

test("availableMonths: 주문에 존재하는 YYYY-MM 최신순, 중복 제거", () => {
  expect(availableMonths(orders)).toEqual(["2026-07", "2026-06"]);
  expect(availableMonths([])).toEqual([]);
});
