import { expect, test } from "vitest";
import {
  buildImportRows,
  chunk,
  dedupeAliasRows,
  planCatalogDbWrite,
  summarizeImport,
  toCatalogInsert,
  toCatalogUpdatePatch,
  validateCatalogDraft,
  type CatalogApplyResult,
} from "./catalog-import";

const validDraft = {
  meta: { categories: ["농산물", "공산품", "냉식", "육류", "수산", "기타"] },
  items: [
    { code: "10000", name: "콩나물", spec: "1Kg 중국산", unit: "Kg", category: "농산물", repSalePrice: 1000, repPurchasePrice: 800, aliasCandidates: [], needsReview: false, reviewReasons: [] },
    { code: "10001", name: "콩나물", spec: "시루", unit: "시루", category: "농산물", repSalePrice: 13000, repPurchasePrice: 11000, aliasCandidates: [], needsReview: false, reviewReasons: [] },
    { code: "10015", name: "깻잎", spec: null, unit: null, category: "기타", repSalePrice: null, repPurchasePrice: null, aliasCandidates: [], needsReview: true, reviewReasons: ["단위없음", "카테고리미분류"] },
  ],
};

test("validateCatalogDraft: 정상 draft는 items 반환", () => {
  const r = validateCatalogDraft(validDraft);
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.items.length).toBe(3);
});

test("validateCatalogDraft: 형식 오류/누락은 사유와 함께 실패", () => {
  expect(validateCatalogDraft(null).ok).toBe(false);
  expect(validateCatalogDraft("x").ok).toBe(false);
  expect(validateCatalogDraft({}).ok).toBe(false); // items 없음
  expect(validateCatalogDraft({ items: [{ code: "1" }] }).ok).toBe(false); // 품목명 없음
});

test("validateCatalogDraft: meta.categories가 앱 6종과 다르면 실패", () => {
  const bad = { meta: { categories: ["A", "B"] }, items: validDraft.items };
  const r = validateCatalogDraft(bad);
  expect(r.ok).toBe(false);
});

test("buildImportRows: 중복명·기존일치·카테고리 정규화 판정", () => {
  const rows = buildImportRows(validateCatalogDraft(validDraft).ok ? (validateCatalogDraft(validDraft) as any).items : [], new Set(["깻잎"]));
  // 콩나물 2건 → dupInDraft true
  expect(rows.filter((r) => r.name === "콩나물").every((r) => r.dupInDraft)).toBe(true);
  // 깻잎은 기존 품목명에 있음 → existing
  expect(rows.find((r) => r.name === "깻잎")!.match).toBe("existing");
  // 콩나물은 신규
  expect(rows.find((r) => r.code === "10000")!.match).toBe("new");
  // 이상 카테고리 없음(전부 6종) — 정규화 유지
  expect(rows.every((r) => ["농산물", "공산품", "냉식", "육류", "수산", "기타"].includes(r.category))).toBe(true);
});

test("summarizeImport: 선택/신규/기존/검토필요 카운트", () => {
  const rows = buildImportRows((validateCatalogDraft(validDraft) as any).items, new Set(["깻잎"]));
  const s = summarizeImport(rows, new Set(["10000"]));
  expect(s).toEqual({ total: 3, selected: 1, needsReview: 1, newCount: 2, existing: 1 });
});

test("toCatalogInsert: 입고단가→base_purchase_price, 출고단가→base_sale_price(W22), source_code=code", () => {
  const rows = buildImportRows((validateCatalogDraft(validDraft) as any).items, new Set());
  const row = rows.find((r) => r.code === "10001")!;
  const ins = toCatalogInsert("co1", row, {});
  expect(ins).toEqual({
    company_id: "co1",
    name: "콩나물",
    base_unit: "시루",
    base_purchase_price: 11000, // 입고단가
    base_sale_price: 13000, // 출고단가 → 품목 기본 출고단가
    category: "농산물",
    source_code: "10001",
    purchase_supplier_id: null,
  });
  expect("sale_price" in ins).toBe(false); // customer_prices의 sale_price로는 안 감(품목 base_sale_price만)
  // 편집 적용(이름·카테고리·매입단가 오버라이드) — 출고단가는 초안값 유지
  const edited = toCatalogInsert("co1", row, { name: "콩나물(시루)", category: "냉식", purchasePrice: 12000, unit: "봉" });
  expect(edited.name).toBe("콩나물(시루)");
  expect(edited.category).toBe("냉식");
  expect(edited.base_purchase_price).toBe(12000);
  expect(edited.base_sale_price).toBe(13000);
  expect(edited.base_unit).toBe("봉");
});

test("toCatalogUpdatePatch: 기존일치는 이름 불변, source_code·매입/출고단가·카테고리만", () => {
  const rows = buildImportRows((validateCatalogDraft(validDraft) as any).items, new Set(["깻잎"]));
  const row = rows.find((r) => r.name === "깻잎")!;
  const patch = toCatalogUpdatePatch(row, {});
  expect("name" in patch).toBe(false); // 이름은 안 바꿈
  expect("sale_price" in patch).toBe(false); // customer_prices로 안 감
  expect(patch).toEqual({ base_purchase_price: null, base_sale_price: null, category: "기타", source_code: "10015" });
});

test("chunk: 배치 분할(200단위 등)", () => {
  const arr = Array.from({ length: 450 }, (_, i) => i);
  const batches = chunk(arr, 200);
  expect(batches.map((b) => b.length)).toEqual([200, 200, 50]);
  expect(chunk([], 200)).toEqual([]);
});

const applyResult: CatalogApplyResult = {
  inserts: [
    { name: "콩나물", baseUnit: "Kg", category: "농산물", basePurchasePrice: 800, baseSalePrice: 1000, sourceCode: "10000", aliases: ["콩나물세척"] },
    { name: "깻잎", baseUnit: "봉", category: "기타", basePurchasePrice: null, baseSalePrice: null, sourceCode: "10015", aliases: [] },
    { name: "손두부", baseUnit: "판", category: "공산품", basePurchasePrice: 1500, baseSalePrice: 2000, sourceCode: null, aliases: ["두부"] },
  ],
  updates: [{ productId: "p-old", category: "육류", basePurchasePrice: 9000, baseSalePrice: 11000, sourceCode: "20001" }],
};

test("planCatalogDbWrite: 이미 저장된 source_code는 insert가 아니라 update로(멱등)", () => {
  // 10000은 이미 존재 → update로 이동. 10015/코드없음은 신규 유지.
  const plan = planCatalogDbWrite(applyResult, new Map([["10000", "p-exists"]]));
  expect(plan.inserts.map((i) => i.sourceCode)).toEqual(["10015", null]);
  // 기존일치 update(p-old) + 재분류 update(p-exists) = 2건
  const ids = plan.updates.map((u) => u.productId).sort();
  expect(ids).toEqual(["p-exists", "p-old"]);
  // 재분류된 건은 초안 별칭을 그대로 들고 감(재import 시에도 별칭 반영)
  const reclassified = plan.updates.find((u) => u.productId === "p-exists")!;
  expect(reclassified.aliases).toEqual(["콩나물세척"]);
  // 재분류 update도 기본 출고단가를 그대로 들고 감(재import 시 기존 품목 base_sale_price 갱신)
  expect(reclassified.baseSalePrice).toBe(1000);
  // 이름매칭 update는 별칭 없음(빈 배열 보정)
  expect(plan.updates.find((u) => u.productId === "p-old")!.aliases).toEqual([]);
});

test("planCatalogDbWrite: 코드 미존재면 전부 신규 insert", () => {
  const plan = planCatalogDbWrite(applyResult, new Map());
  expect(plan.inserts).toHaveLength(3);
  expect(plan.updates).toHaveLength(1); // 기존일치만
});

test("dedupeAliasRows: 회사 내 alias 중복/공백 제거(배치 in-batch 충돌 예방)", () => {
  const rows = dedupeAliasRows([
    { product_id: "a", alias: "콩" },
    { product_id: "b", alias: "콩" }, // 회사 내 중복 → 제거
    { product_id: "c", alias: " 숙주 " }, // trim 후 저장
    { product_id: "d", alias: "  " }, // 빈값 제거
  ]);
  expect(rows).toEqual([
    { product_id: "a", alias: "콩" },
    { product_id: "c", alias: "숙주" },
  ]);
});
