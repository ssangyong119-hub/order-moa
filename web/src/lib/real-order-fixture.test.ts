// 실제 발주 fixture characterization 테스트
// 데이터: docs/order-moa-real-order-test-data.json (실사용 이카운트 패턴 일반화, 가명·임의단가)
// 목적: 파서의 "현재 동작"을 그대로 고정한다(개선 아님). 아래 CURRENT 표는 2026-07-02 실측값.
// 파서를 개선하면 이 표의 기대값을 의도적으로 바꿔야 하며, 그 diff가 곧 개선 내역이 된다.
// JSON의 expectedStatus는 UX 관점 예상(후보_확인/단가_미등록 등 포함)이라 파서 관찰값과 1:1이 아니다
// — 대조 분석은 docs/order-moa-real-order-test-plan.md 참조.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import type { CustomerPrice, Product } from "./domain/types";
import { canConfirm, confirmBlockReason, parseOrderText, type LineStatus } from "./order-parser";

interface FixtureProduct {
  id: string;
  name: string;
  baseUnit: string;
  aliases: string[];
  salePrice: number;
  basePurchasePrice: number | null;
}
interface FixtureSentence {
  id: string;
  customer: string;
  text: string;
  expectedStatus: string;
}
const raw = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../../docs/order-moa-real-order-test-data.json", import.meta.url)),
    "utf-8",
  ),
) as {
  customers: Array<{ id: string; name: string }>;
  products: FixtureProduct[];
  orderSentences: FixtureSentence[];
};

const products: Product[] = raw.products.map((p) => ({
  id: p.id,
  name: p.name,
  baseUnit: p.baseUnit,
  aliases: p.aliases,
  basePurchasePrice: p.basePurchasePrice,
}));
const customerIdByName = Object.fromEntries(raw.customers.map((c) => [c.name, c.id]));

// 단가: 전 거래처 × 전 품목 = salePrice, 단 priceGaps 재현
//  - rp07(햇감자): 전 거래처 미등록(시세 변동 품목)
//  - (E카페, rp01): 미등록 → 즉석 단가 저장 흐름 대상
const prices: CustomerPrice[] = [];
for (const c of raw.customers) {
  for (const p of raw.products) {
    if (p.id === "rp07") continue;
    if (c.id === "tc_e" && p.id === "rp01") continue;
    prices.push({ customerId: c.id, productId: p.id, price: p.salePrice });
  }
}

function parse(sentence: FixtureSentence) {
  return parseOrderText(sentence.text, customerIdByName[sentence.customer], products, prices);
}

// [productId|null, quantity|null, unit, status, priceRegistered] — 2026-07-02 실측 고정값
type ExpectedLine = [string | null, number | null, string, LineStatus, boolean];
const CURRENT: Record<string, ExpectedLine[]> = {
  t01: [["rp01", 3, "박스", "matched", true], ["rp04", 2, "박스", "matched", true], ["rp05", 5, "봉", "matched", true]],
  t02: [["rp03", 2, "봉", "matched", true], ["rp06", 3, "개", "matched", true]],
  // t03: '숙주' 토큰이 rp01/rp02 양쪽에 포함 → rp01 임시 선택 + 후보 확인으로 확정 차단
  t03: [["rp01", 3, "박스", "matched", true]],
  // t04: 별칭 '무'가 등록된 상태에선 rp16 매칭 성공(별칭으로 해결됨을 검증). 미등록 상태는 아래 전용 테스트.
  t04: [["rp16", 2, "개", "matched", true]],
  t05: [["rp20", 3, "개", "matched", true]],
  // t06: '조금'/'두' → 수량 불확실. 감자(rp07)는 단가 전 거래처 미등록 → priceRegistered=false
  t06: [["rp07", null, "kg", "qty_uncertain", false], ["rp14", null, "단", "qty_uncertain", true]],
  t07: [["rp15", null, "판", "qty_uncertain", true], ["rp09", null, "망", "qty_uncertain", true]],
  t08: [[null, 5, "봉", "unmatched", false]],
  t09: [["rp13", 2, "박스", "matched", true], ["rp18", 1, "박스", "matched", true], ["rp19", 3, "단", "matched", true]],
  t10: [["rp01", 1, "박스", "matched", false]],
  // t11: "청양고추 1kg 2봉" — 규격 숫자(1kg)는 수량에서 제외, 뒤의 수량단위(2봉)를 채택 (개선 1차 적용)
  t11: [["rp23", 2, "봉", "matched", true]],
  // t12: '키로'는 단위 사전에서 kg로 표준화(개선 2차 적용)
  t12: [["rp26", 2, "kg", "matched", true]],
  t13: [["rp17", 2, "봉", "matched", true]],
  // t14: '장' 단위는 사전에서 직접 인식(개선 2차 적용)
  t14: [["rp27", 2, "개", "matched", true], ["rp28", 3, "장", "matched", true]],
  t15: [["rp10", 2, "박스", "matched", true]],
  t16: [["rp24", 2, "봉", "matched", true], ["rp21", 3, "개", "matched", true]],
  t17: [["rp12", 1, "팩", "matched", true]],
  t18: [["rp22", 1, "망", "matched", true]],
};

test("fixture 무결성: 문장 18건 · 품목 28종 · CURRENT 표 커버리지 일치", () => {
  expect(raw.orderSentences.length).toBe(18);
  expect(raw.products.length).toBe(28);
  expect(Object.keys(CURRENT).sort()).toEqual(raw.orderSentences.map((s) => s.id).sort());
});

for (const sentence of raw.orderSentences) {
  test(`[현재 동작] ${sentence.id} (${sentence.customer}) — JSON 예상: ${sentence.expectedStatus}`, () => {
    const lines = parse(sentence);
    const observed: ExpectedLine[] = lines.map((l) => [
      l.productId,
      l.quantity,
      l.unit,
      l.status,
      l.priceRegistered,
    ]);
    expect(observed).toEqual(CURRENT[sentence.id]);
  });
}

// ── 현재 한계/개선 고정(characterization) — 개선 시 기대값을 의도적으로 바꾼다 ──

test("[개선 3차] t03: 동일 토큰 다중 품목 → 첫 후보 임시 선택 + 후보 목록 제공", () => {
  const lines = parse(raw.orderSentences.find((s) => s.id === "t03")!);
  expect(lines[0].productId).toBe("rp01"); // '숙주'가 세척숙주(rp01)·숙주1kg(rp02) 양쪽 포함 — 순서 의존
  expect(lines[0].status).toBe("matched");
  expect(lines[0].candidateProductIds).toEqual(["rp01", "rp02"]);
});

test("[개선 3차] t03: 동일 토큰 다중 품목은 후보 확인 전까지 확정 차단", () => {
  const lines = parse(raw.orderSentences.find((s) => s.id === "t03")!);
  expect(lines[0].productId).toBe("rp01");
  expect(lines[0].candidateProductIds).toEqual(["rp01", "rp02"]);
  expect(lines[0].needsProductConfirmation).toBe(true);
  expect(canConfirm(lines)).toBe(false);
  expect(confirmBlockReason(lines)).toContain("품목 후보 확인");
});

test("[한계 고정] t04 변형: 별칭 '무' 미등록이면 1글자 품목은 미매칭(정확일치만 허용)", () => {
  const noAlias = products.map((p) => (p.id === "rp16" ? { ...p, aliases: [] } : p));
  const lines = parseOrderText("무 2개", "tc_a", noAlias, prices);
  expect(lines[0].productId).toBe(null);
  expect(lines[0].status).toBe("unmatched"); // 별칭 등록으로 해결(t04 본 케이스가 증명)
});

test("[개선 1차] t11: 규격 숫자(1kg)는 수량에서 제외, 수량단위(2봉) 채택", () => {
  const lines = parse(raw.orderSentences.find((s) => s.id === "t11")!);
  expect(lines[0].productId).toBe("rp23");
  expect(lines[0].quantity).toBe(2); // 1kg의 1이 아니라 2봉의 2
  expect(lines[0].unit).toBe("봉");
});

test("[개선 1차] 비닐 100L 3장 → 규격 100L 제외, 수량 3(단위는 baseUnit 폴백 '장')", () => {
  const lines = parseOrderText("비닐 100L 3장", "tc_d", products, prices);
  expect(lines[0].productId).toBe("rp28");
  expect(lines[0].quantity).toBe(3);
  expect(lines[0].unit).toBe("장"); // '장'은 단위 사전에 없어 baseUnit 폴백(사전 확장은 3순위 과제)
});

test("[개선 1차 회귀] 측정단위 숫자만 있으면 그대로 수량 — 감자 3kg → 수량 3, 단위 kg", () => {
  const lines = parseOrderText("감자 3kg", "tc_a", products, prices);
  expect(lines[0].productId).toBe("rp07");
  expect(lines[0].quantity).toBe(3);
  expect(lines[0].unit).toBe("kg");
});

test("[개선 2차] 키로는 kg로 표준화하고 품목명 후보에서 제거", () => {
  const lines = parseOrderText("소불고기 2키로", "tc_d", products, prices);
  expect(lines[0].productId).toBe("rp26");
  expect(lines[0].quantity).toBe(2);
  expect(lines[0].unit).toBe("kg");
});

test("[개선 2차] 장 단위는 baseUnit 우연 폴백이 아니라 원문 단위로 인식", () => {
  const lines = parseOrderText("비닐 3장", "tc_d", products, prices);
  expect(lines[0].productId).toBe("rp28");
  expect(lines[0].quantity).toBe(3);
  expect(lines[0].unit).toBe("장");
});

// ══════════════════════════════════════════════════════════════════════════
// W13 현장 발주 라운드 (2026-07-08) — 실제 카톡/문자식 문장 검증.
// 관찰(스크래치)에서 나온 파싱 문제를 테스트로 고정한 뒤 order-parser를 최소 수정한다.
// 개선 대상: (A) 한 줄 공백 다품목 분리, (B) 종결어미 '이요'/조사 '는·은' 제거.
// ══════════════════════════════════════════════════════════════════════════

// ── (A) 한 줄 공백/붙여쓰기 다품목: 수량단위가 2개 이상이면 라인 분리 ──
// 가장 위험했던 케이스: 뒤 품목을 조용히 버리고 경고 없이 확정되던 문제.

test("[W13-A] '세척숙주 3박스 청경채 2박스' — 공백 다품목을 2라인으로 분리", () => {
  const lines = parseOrderText("세척숙주 3박스 청경채 2박스", "tc_a", products, prices);
  expect(lines.map((l) => [l.productId, l.quantity, l.unit, l.status])).toEqual([
    ["rp01", 3, "박스", "matched"],
    ["rp04", 2, "박스", "matched"],
  ]);
  expect(canConfirm(lines)).toBe(true);
});

test("[W13-A] '두부3판 콩나물2박스' — 붙여쓰기 다품목 분리(뒤 품목 미등록은 미매칭 노출)", () => {
  const lines = parseOrderText("두부3판 콩나물2박스", "tc_a", products, prices);
  expect(lines).toHaveLength(2);
  expect(lines[0].productId).toBe("rp21"); // 팩두부(별칭 두부)
  expect(lines[0].quantity).toBe(3);
  expect(lines[1].productId).toBe(null); // 콩나물은 fixture에 없음 → 미매칭(조용히 버리지 않음)
  expect(canConfirm(lines)).toBe(false);
});

test("[W13-A] '취나물2봉 단무지3개' — 별칭 다품목 분리(둘 다 매칭)", () => {
  const lines = parseOrderText("취나물2봉 단무지3개", "tc_c", products, prices);
  expect(lines.map((l) => [l.productId, l.quantity])).toEqual([
    ["rp03", 2],
    ["rp06", 3],
  ]);
  expect(canConfirm(lines)).toBe(true);
});

test("[W13-A] '계란 10판 배추 2망' — 품목·수량이 교차 오염되지 않는다", () => {
  const lines = parseOrderText("계란 10판 배추 2망", "tc_d", products, prices);
  expect(lines.map((l) => [l.productId, l.quantity, l.unit])).toEqual([
    ["rp15", 10, "판"],
    ["rp09", 2, "망"],
  ]);
});

test("[W13-A] '락스2개비닐3장' — 완전 붙여쓰기 공산품 다품목 분리", () => {
  const lines = parseOrderText("락스2개비닐3장", "tc_d", products, prices);
  expect(lines.map((l) => [l.productId, l.quantity, l.unit])).toEqual([
    ["rp27", 2, "개"],
    ["rp28", 3, "장"],
  ]);
});

test("[W13-A 회귀] 규격 숫자+수량은 분리하지 않는다 — '청양고추 1kg 2봉'은 1라인 유지", () => {
  const lines = parseOrderText("청양고추 1kg 2봉", "tc_b", products, prices);
  expect(lines).toHaveLength(1);
  expect(lines[0].productId).toBe("rp23");
  expect(lines[0].quantity).toBe(2);
  expect(lines[0].unit).toBe("봉");
});

test("[W13-A 회귀] 규격 숫자만(측정단위)인 단품은 분리하지 않는다 — '소불고기 2키로 반'", () => {
  const lines = parseOrderText("소불고기 2키로 반", "tc_d", products, prices);
  expect(lines).toHaveLength(1);
  expect(lines[0].productId).toBe("rp26");
});

// ── (B) 종결어미/조사 제거 ──

test("[W13-B] 종결어미 '이요' 제거 후 매칭 — '대파 2단이요'", () => {
  const lines = parseOrderText("대파 2단이요", "tc_a", products, prices);
  expect(lines[0].productId).toBe("rp14");
  expect(lines[0].quantity).toBe(2);
  expect(lines[0].status).toBe("matched");
});

test("[W13-B] 조사 '는' 제거 → '숙주는 3박스'는 미매칭이 아니라 후보 확인으로", () => {
  const lines = parseOrderText("숙주는 3박스", "tc_b", products, prices);
  expect(lines[0].productId).toBe("rp01");
  expect(lines[0].candidateProductIds).toEqual(["rp01", "rp02"]);
  expect(lines[0].needsProductConfirmation).toBe(true);
  expect(confirmBlockReason(lines)).toContain("품목 후보 확인");
});

// ── 애매 수량은 그대로 안전 차단(현재 동작 고정 — 개선 아님) ──

test("[W13 고정] '감자 반박스' — '반'은 수량 불확실로 확정 차단", () => {
  const lines = parseOrderText("감자 반박스", "tc_a", products, prices);
  expect(lines[0].productId).toBe("rp07");
  expect(lines[0].quantity).toBe(null);
  expect(lines[0].status).toBe("qty_uncertain");
});

test("[W13 고정] '팽이버섯다섯봉' — 붙여쓴 한글 수사는 수량 불확실", () => {
  const lines = parseOrderText("팽이버섯다섯봉", "tc_a", products, prices);
  expect(lines[0].productId).toBe("rp05");
  expect(lines[0].quantity).toBe(null);
  expect(lines[0].status).toBe("qty_uncertain");
});
