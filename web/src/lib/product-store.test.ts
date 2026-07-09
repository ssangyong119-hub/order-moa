import { expect, test } from "vitest";
import {
  friendlyAliasError,
  isMissingCategoryColumn,
  normalizeProductInput,
  toProductInsert,
  toProductUpdate,
  validateNewAlias,
  validateProductInput,
} from "./product-store";
import type { Product } from "./domain/types";

test("normalizeProductInput: 공백 정리 + 단가/매입처/카테고리 정규화", () => {
  expect(
    normalizeProductInput({ name: " 콩나물 ", baseUnit: " 박스 ", basePurchasePrice: "3500", purchaseSupplierId: "s1", category: "농산물" }),
  ).toEqual({ name: "콩나물", baseUnit: "박스", basePurchasePrice: 3500, purchaseSupplierId: "s1", category: "농산물" });
  // 빈 단가·미지정 매입처는 null, 카테고리 미지정은 기타
  expect(normalizeProductInput({ name: "두부", baseUnit: "판", basePurchasePrice: "", purchaseSupplierId: "" })).toEqual({
    name: "두부",
    baseUnit: "판",
    basePurchasePrice: null,
    purchaseSupplierId: null,
    category: "기타",
  });
  // 이상 카테고리 값은 기타로 폴백
  expect(normalizeProductInput({ name: "락스", baseUnit: "개", category: "없는분류" }).category).toBe("기타");
});

test("validateProductInput: 이름/단위 필수, 단가는 0 이상 정수", () => {
  expect(validateProductInput({ name: " ", baseUnit: "박스" })).toBe("품목명을 입력해주세요.");
  expect(validateProductInput({ name: "콩나물", baseUnit: "" })).toBe("기본 단위를 입력해주세요.");
  expect(validateProductInput({ name: "콩나물", baseUnit: "박스", basePurchasePrice: "-100" })).toBe(
    "기준 매입단가는 0 이상 숫자로 입력해주세요.",
  );
  expect(validateProductInput({ name: "콩나물", baseUnit: "박스", basePurchasePrice: "abc" })).toBe(
    "기준 매입단가는 0 이상 숫자로 입력해주세요.",
  );
  expect(validateProductInput({ name: "콩나물", baseUnit: "박스", basePurchasePrice: "3500" })).toBeNull();
  expect(validateProductInput({ name: "콩나물", baseUnit: "박스" })).toBeNull();
});

test("toProductInsert / toProductUpdate: DB 컬럼 형태(category 포함)", () => {
  expect(toProductInsert("co1", { name: "콩나물", baseUnit: "박스", basePurchasePrice: "3500", purchaseSupplierId: "s1", category: "농산물" })).toEqual({
    company_id: "co1",
    name: "콩나물",
    base_unit: "박스",
    base_purchase_price: 3500,
    purchase_supplier_id: "s1",
    category: "농산물",
  });
  expect(toProductUpdate({ name: "두부", baseUnit: "판" })).toEqual({
    name: "두부",
    base_unit: "판",
    base_purchase_price: null,
    purchase_supplier_id: null,
    category: "기타",
  });
});

test("isMissingCategoryColumn: 0007 미적용 시 category 누락 오류만 감지", () => {
  // PostgREST select 미존재 컬럼(42703)
  expect(isMissingCategoryColumn({ code: "42703", message: 'column ordermoa_products.category does not exist' })).toBe(true);
  // insert/update body 미존재 컬럼(PGRST204 schema cache)
  expect(isMissingCategoryColumn({ code: "PGRST204", message: "Could not find the 'category' column of 'ordermoa_products' in the schema cache" })).toBe(true);
  // 코드 없이도 명시적 미존재 메시지는 감지
  expect(isMissingCategoryColumn({ message: 'column "category" does not exist' })).toBe(true);
  // 무관한 오류는 거짓(다른 컬럼/네트워크/중복키)
  expect(isMissingCategoryColumn({ code: "23505", message: "duplicate key" })).toBe(false);
  expect(isMissingCategoryColumn({ code: "42703", message: "column ordermoa_products.base_unit does not exist" })).toBe(false);
  // category 값 CHECK 위반은 컬럼 누락이 아니므로 거짓(정규화로 실제로 발생하지도 않음)
  expect(isMissingCategoryColumn({ code: "23514", message: 'new row violates check constraint "ordermoa_products_category_check"' })).toBe(false);
  expect(isMissingCategoryColumn(null)).toBe(false);
  expect(isMissingCategoryColumn(new Error("network"))).toBe(false);
});

const productsForAlias: Product[] = [
  { id: "p1", name: "콩나물", baseUnit: "박스", aliases: ["콩", "콩박스"] },
  { id: "p2", name: "숙주", baseUnit: "봉", aliases: ["세척숙주"] },
];

test("validateNewAlias: 빈 값/중복(다른 품목 별칭·품목명) 차단", () => {
  expect(validateNewAlias("  ", productsForAlias, "p1")).toBe("별칭을 입력해주세요.");
  expect(validateNewAlias("세척숙주", productsForAlias, "p1")).toBe(
    "'세척숙주'은(는) 이미 숙주의 별칭입니다.",
  );
  expect(validateNewAlias("콩", productsForAlias, "p1")).toBe("'콩'은(는) 이미 이 품목의 별칭입니다.");
  expect(validateNewAlias("숙주", productsForAlias, "p1")).toBe("'숙주'은(는) 이미 품목명으로 있습니다.");
  expect(validateNewAlias("숙주박스", productsForAlias, "p2")).toBeNull();
});

test("friendlyAliasError: unique 충돌은 중복 안내로", () => {
  const dup = Object.assign(new Error("duplicate key"), { code: "23505" });
  expect(friendlyAliasError(dup)).toBe("이미 등록된 별칭입니다. 다른 품목에서 쓰고 있는지 확인해주세요.");
  expect(friendlyAliasError(new Error("boom"))).toBe("boom");
});
