import { describe, expect, it } from "vitest";
import { purchaseDraftScopeKey } from "./purchase-draft-scope";

describe("purchaseDraftScopeKey", () => {
  it("거래처나 날짜가 바뀌면 이번 발주 임시 편집 범위도 달라진다", () => {
    const current = purchaseDraftScopeKey("customer-a", "2026-07-11");

    expect(purchaseDraftScopeKey("customer-a", "2026-07-12")).not.toBe(current);
    expect(purchaseDraftScopeKey("customer-b", "2026-07-11")).not.toBe(current);
  });

  it("같은 거래처와 날짜면 같은 발주 임시 편집 범위다", () => {
    expect(purchaseDraftScopeKey("customer-a", "2026-07-11")).toBe(
      purchaseDraftScopeKey("customer-a", "2026-07-11"),
    );
  });
});
