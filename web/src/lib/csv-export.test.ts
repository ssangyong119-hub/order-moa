import { expect, test } from "vitest";
import { toCsv } from "./csv-export";

test("toCsv: 기본 행/열을 콤마·개행으로 잇는다", () => {
  expect(toCsv([["a", "b"], ["c", "d"]])).toBe("a,b\nc,d");
  expect(toCsv([["품목", "수량"], ["콩나물", 7]])).toBe("품목,수량\n콩나물,7");
});

test("toCsv: 콤마·따옴표·개행 포함 셀은 큰따옴표로 감싸고 내부 따옴표는 2배", () => {
  expect(toCsv([["가람, 식당"]])).toBe('"가람, 식당"');
  expect(toCsv([['그는 "왕"이다']])).toBe('"그는 ""왕""이다"');
  expect(toCsv([["줄1\n줄2"]])).toBe('"줄1\n줄2"');
});

test("toCsv: CSV 수식 인젝션 방어 — =,+,-,@ 로 시작하면 앞에 작은따옴표", () => {
  expect(toCsv([["=1+1"]])).toBe("'=1+1");
  expect(toCsv([["@SUM(A1)"]])).toBe("'@SUM(A1)");
  // 방어 후 콤마가 있으면 따옴표로도 감싼다
  expect(toCsv([["-a,b"]])).toBe(`"'-a,b"`);
});

test("toCsv: 숫자/빈 값 처리", () => {
  expect(toCsv([[0, "", 1000]])).toBe("0,,1000");
  expect(toCsv([])).toBe("");
});
