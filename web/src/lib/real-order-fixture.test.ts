// 실제 발주 fixture characterization 테스트
// 데이터: docs/order-moa-real-order-test-data.json (실사용 이카운트 패턴 일반화, 가명·임의단가)
// 목적: 파서의 "현재 동작"을 그대로 고정한다(개선 아님). 아래 CURRENT 표는 2026-07-02 실측값.
// 파서를 개선하면 이 표의 기대값을 의도적으로 바꿔야 하며, 그 diff가 곧 개선 내역이 된다.
// JSON의 expectedStatus는 UX 관점 예상(오매칭_위험/단위_확인 포함)이라 파서 관찰값과 1:1이 아니다
// — 대조 분석은 docs/order-moa-real-order-test-plan.md 참조.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import type { CustomerPrice, Product } from "./domain/types";
import { parseOrderText, type LineStatus } from "./order-parser";

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
  // t03: '숙주' 토큰이 rp01/rp02 양쪽에 포함 → 등록 순서상 rp01(세척숙주) 첫 매칭 (다중 후보 미제시 — 현재 한계)
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
  // t11: "청양고추 1kg 2봉" — 첫 숫자 1(규격)을 수량으로 오인, 단위도 kg (현재 한계 — 개선 1순위)
  t11: [["rp23", 1, "kg", "matched", true]],
  // t12: '키로'는 단위 사전에 없어 baseUnit(kg)으로 조용히 폴백 — "단위 확인" 상태는 파서에 없음
  t12: [["rp26", 2, "kg", "matched", true]],
  t13: [["rp17", 2, "봉", "matched", true]],
  // t14: '장'도 사전에 없지만 rp28 baseUnit이 '장'이라 폴백 결과가 우연히 일치
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

// ── 현재 한계 고정(characterization) — 개선 시 이 3개의 기대값을 바꾸는 것이 목표 ──

test("[한계 고정] t03: 동일 토큰 다중 품목 → 등록 순서 첫 매칭(rp01), 후보 선택 미제공", () => {
  const lines = parse(raw.orderSentences.find((s) => s.id === "t03")!);
  expect(lines[0].productId).toBe("rp01"); // '숙주'가 세척숙주(rp01)·숙주1kg(rp02) 양쪽 포함 — 순서 의존
  expect(lines[0].status).toBe("matched"); // 경고 없이 정상처럼 보임 = 오매칭 위험의 실체
});

test("[한계 고정] t04 변형: 별칭 '무' 미등록이면 1글자 품목은 미매칭(정확일치만 허용)", () => {
  const noAlias = products.map((p) => (p.id === "rp16" ? { ...p, aliases: [] } : p));
  const lines = parseOrderText("무 2개", "tc_a", noAlias, prices);
  expect(lines[0].productId).toBe(null);
  expect(lines[0].status).toBe("unmatched"); // 별칭 등록으로 해결(t04 본 케이스가 증명)
});

test("[한계 고정] t11: 규격 숫자(1kg)를 수량으로 오인 — 의도한 2봉이 아니라 1", () => {
  const lines = parse(raw.orderSentences.find((s) => s.id === "t11")!);
  expect(lines[0].productId).toBe("rp23");
  expect(lines[0].quantity).toBe(1); // 개선 1순위: 숫자+중량단위는 규격으로 강등해야 함
  expect(lines[0].unit).toBe("kg"); // '봉'이 아니라 규격의 kg를 단위로 집음
});
