import { expect, test } from "vitest";
import {
  friendlySupplierError,
  normalizeSupplierInput,
  toSupplierInsert,
  toSupplierUpdate,
  validateSupplierInput,
} from "./supplier-store";

test("normalizeSupplierInput: 공백 정리", () => {
  expect(normalizeSupplierInput({ name: "  야채매입처 ", memo: " 새벽 배송 " })).toEqual({
    name: "야채매입처",
    memo: "새벽 배송",
  });
  expect(normalizeSupplierInput({ name: "야채매입처" })).toEqual({ name: "야채매입처", memo: "" });
});

test("validateSupplierInput: 이름 필수", () => {
  expect(validateSupplierInput({ name: "  " })).toBe("매입처명을 입력해주세요.");
  expect(validateSupplierInput({ name: "야채매입처" })).toBeNull();
});

test("toSupplierInsert / toSupplierUpdate: 빈 메모는 null", () => {
  expect(toSupplierInsert("co1", { name: "야채매입처", memo: "" })).toEqual({
    company_id: "co1",
    name: "야채매입처",
    memo: null,
  });
  expect(toSupplierUpdate({ name: "야채매입처", memo: "새벽" })).toEqual({
    name: "야채매입처",
    memo: "새벽",
  });
});

test("friendlySupplierError: unique 충돌은 복원 안내로 바꾼다", () => {
  const dup = Object.assign(new Error("duplicate key value"), { code: "23505" });
  expect(friendlySupplierError(dup)).toBe(
    "같은 이름의 매입처가 이미 있습니다. 보관된 매입처라면 아래에서 복원해 주세요.",
  );
  expect(friendlySupplierError(new Error("network down"))).toBe("network down");
  expect(friendlySupplierError("???")).toBe("매입처 저장에 실패했습니다.");
});
