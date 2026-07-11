import { expect, test } from "vitest";
import { normalizePriceInput } from "./price-input";

test("normalizePriceInput: 선행 0 제거(05 → 5)", () => {
  expect(normalizePriceInput("05")).toBe("5");
  expect(normalizePriceInput("008000")).toBe("8000");
});

test("normalizePriceInput: 정상 정수는 그대로", () => {
  expect(normalizePriceInput("8000")).toBe("8000");
  expect(normalizePriceInput("0")).toBe("0");
});

test("normalizePriceInput: 소수는 원 단위 정수로 반올림", () => {
  expect(normalizePriceInput("2500.4")).toBe("2500");
  expect(normalizePriceInput("2500.6")).toBe("2501");
});

test("normalizePriceInput: 빈 값은 빈 값 유지(저장 차단은 상위 규칙)", () => {
  expect(normalizePriceInput("")).toBe("");
  expect(normalizePriceInput("   ")).toBe("");
});

test("normalizePriceInput: 음수·NaN·무한대는 원본 유지(상위 검증이 차단)", () => {
  expect(normalizePriceInput("-1")).toBe("-1");
  expect(normalizePriceInput("abc")).toBe("abc");
  expect(normalizePriceInput("Infinity")).toBe("Infinity");
});
