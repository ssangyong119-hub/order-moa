import { expect, test } from "vitest";
import {
  normalizeCustomerInput,
  toCustomerInsert,
  toCustomerUpdate,
  validateCustomerInput,
} from "./customer-store";

test("normalizeCustomerInput: 거래처 입력값을 저장 가능한 형태로 정리", () => {
  expect(
    normalizeCustomerInput({
      name: "  새 거래처  ",
      phone: " 010-0000-0000 ",
      address: " 부산 ",
      memo: "  오전 배송 ",
    }),
  ).toEqual({
    name: "새 거래처",
    phone: "010-0000-0000",
    address: "부산",
    memo: "오전 배송",
  });
});

test("validateCustomerInput: 거래처명은 필수", () => {
  expect(validateCustomerInput({ name: "" })).toBe("거래처명을 입력해주세요.");
  expect(validateCustomerInput({ name: "가람식당" })).toBeNull();
});

test("toCustomerInsert: 회사 범위와 nullable 필드를 명확히 만든다", () => {
  expect(toCustomerInsert("comp1", { name: "  가람식당 ", phone: "", address: "  ", memo: "메모" })).toEqual({
    company_id: "comp1",
    name: "가람식당",
    phone: null,
    address: null,
    memo: "메모",
  });
});

test("toCustomerUpdate: 수정 payload에는 company_id를 넣지 않는다", () => {
  const row = toCustomerUpdate({ name: "한빛카페", phone: "051", address: "", memo: "" });
  expect(row).toEqual({
    name: "한빛카페",
    phone: "051",
    address: null,
    memo: null,
  });
  expect("company_id" in row).toBe(false);
});
