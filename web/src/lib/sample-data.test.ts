import { expect, test } from "vitest";
import { sampleOrderExamples } from "./sample-data";

function lineCount(rawText: string): number {
  return rawText.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

test("샘플 발주 예시는 짧은 확인용과 긴 테스트용을 함께 제공한다", () => {
  expect(sampleOrderExamples.length).toBeGreaterThanOrEqual(15);
  expect(sampleOrderExamples.filter((example) => lineCount(example.rawText) >= 6).length).toBeGreaterThanOrEqual(5);
  expect(sampleOrderExamples.some((example) => lineCount(example.rawText) >= 10)).toBe(true);
});
