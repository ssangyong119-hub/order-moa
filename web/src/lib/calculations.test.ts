import { expect, test } from "vitest";
import {
  estimatedLineMargin,
  estimatedOrderMargin,
  formatMargin,
  lineAmount,
  sumAmounts,
} from "./calculations";

test("lineAmount = round(quantity × unitPrice)", () => {
  expect(lineAmount(2, 8000)).toBe(16000);
  expect(lineAmount(3, 2500)).toBe(7500);
  // 반올림: 1.5 × 3333 = 4999.5 → 5000
  expect(lineAmount(1.5, 3333)).toBe(5000);
});

test("sumAmounts = 라인 금액 합(합산 후 반올림 없음)", () => {
  expect(sumAmounts([16000, 7500, 17500])).toBe(41000);
  expect(sumAmounts([])).toBe(0);
});

test("estimatedLineMargin: 기준 매입단가가 있으면 (판매-매입)×수량", () => {
  expect(estimatedLineMargin(8000, 6500, 2)).toBe(3000);
  expect(estimatedLineMargin(2500, 1800, 3)).toBe(2100);
});

test("estimatedLineMargin: 기준 매입단가 없으면 null", () => {
  expect(estimatedLineMargin(3000, null, 2)).toBe(null);
  expect(estimatedLineMargin(3000, undefined, 2)).toBe(null);
});

test("estimatedOrderMargin: 매입단가 있는 라인만 합, 전부 없으면 null", () => {
  expect(
    estimatedOrderMargin([
      { unitPrice: 8000, basePurchasePrice: 6500, quantity: 2 }, // +3000
      { unitPrice: 2500, basePurchasePrice: 1800, quantity: 3 }, // +2100
      { unitPrice: 3000, basePurchasePrice: null, quantity: 1 }, // 제외
    ]),
  ).toBe(5100);

  expect(
    estimatedOrderMargin([{ unitPrice: 3000, basePurchasePrice: null, quantity: 1 }]),
  ).toBe(null);
});

test("formatMargin: null이면 '-', 양수는 + 부호", () => {
  expect(formatMargin(null)).toBe("-");
  expect(formatMargin(1500)).toBe("+1,500원");
  expect(formatMargin(-500)).toBe("-500원");
});
