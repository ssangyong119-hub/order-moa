import { expect, test } from "vitest";
import {
  canConfirm,
  canRegisterAlias,
  extractNameCandidate,
  parseOrderText,
} from "./order-parser";
import { sampleCustomerPrices, sampleProducts } from "./sample-data";

const products = sampleProducts;
const prices = sampleCustomerPrices;

test("예시1 정형: 전부 매칭 + 거래처 단가 자동 적용", () => {
  const lines = parseOrderText("콩나물 2박스\n두부 3판\n미나리 5단", "cust_garam", products, prices);
  expect(lines.map((l) => l.status)).toEqual(["matched", "matched", "matched"]);
  expect(lines.map((l) => l.productId)).toEqual(["p01", "p03", "p04"]);
  expect(lines.map((l) => l.quantity)).toEqual([2, 3, 5]);
  expect(lines.map((l) => l.unitPrice)).toEqual([8000, 2500, 3500]);
  expect(canConfirm(lines)).toBe(true);
});

test("예시2 별칭 매칭 (콩→콩나물, 두부판→두부, 양파→깐양파)", () => {
  const lines = parseOrderText("콩 1박스\n두부판 2\n양파 1", "cust_eutteum", products, prices);
  expect(lines.map((l) => l.productId)).toEqual(["p01", "p03", "p05"]);
  expect(lines.map((l) => l.unitPrice)).toEqual([7500, 2300, 11000]);
  expect(lines.every((l) => l.status === "matched")).toBe(true);
});

test("예시3 수량 불확실: 한글 수사/모호 표현 → qty null, 확정 차단", () => {
  const lines = parseOrderText("어묵 세 박스\n떡국떡 조금\n대파 큰거로", "cust_neulbom", products, prices);
  expect(lines.map((l) => l.productId)).toEqual(["p25", "p24", "p06"]);
  expect(lines.every((l) => l.quantity === null)).toBe(true);
  expect(lines.every((l) => l.status === "qty_uncertain")).toBe(true);
  expect(canConfirm(lines)).toBe(false);
});

test("예시4 단가 미등록: 양배추 matched지만 0원 + priceRegistered=false", () => {
  const lines = parseOrderText("콩나물 1박스\n양배추 2통", "cust_garam", products, prices);
  expect(lines[0].priceRegistered).toBe(true);
  expect(lines[1].productId).toBe("p07");
  expect(lines[1].status).toBe("matched");
  expect(lines[1].unitPrice).toBe(0);
  expect(lines[1].priceRegistered).toBe(false);
  // 단가 미등록은 확정을 막지 않는다(0원 경고만)
  expect(canConfirm(lines)).toBe(true);
});

test("W22 기본 출고단가 fallback: 거래처 단가 없으면 base_sale_price 적용(priceSource=base)", () => {
  const custom = [
    { id: "px", name: "테스트품목", baseUnit: "개", aliases: [], baseSalePrice: 4200 },
  ];
  // 거래처 단가 없음 → 기본 출고단가 4200 적용, priceRegistered=false(거래처 단가는 아님), priceSource=base
  const [line] = parseOrderText("테스트품목 2개", "cust_none", custom, []);
  expect(line.productId).toBe("px");
  expect(line.unitPrice).toBe(4200);
  expect(line.priceRegistered).toBe(false);
  expect(line.priceSource).toBe("base");
  // 거래처 단가가 있으면 그것이 우선(기본가 무시)
  const [line2] = parseOrderText("테스트품목 2개", "cust_none", custom, [
    { customerId: "cust_none", productId: "px", price: 3000 },
  ]);
  expect(line2.unitPrice).toBe(3000);
  expect(line2.priceSource).toBe("customer");
});

test("예시5 미매칭: '랩' 미매칭 → 확정 차단", () => {
  const lines = parseOrderText("위생장갑 2박스\n랩 3개", "cust_happy", products, prices);
  expect(lines[0].productId).toBe("p28");
  expect(lines[1].productId).toBe(null);
  expect(lines[1].status).toBe("unmatched");
  expect(canConfirm(lines)).toBe(false);
});

test("예시6 한 줄 다품목(쉼표) 분리 → 3라인", () => {
  const lines = parseOrderText("계란 2판, 키친타월 1박스, 식용유 1통", "cust_hanbit", products, prices);
  expect(lines.length).toBe(3);
  expect(lines.map((l) => l.productId)).toEqual(["p15", "p29", "p26"]);
  expect(lines.map((l) => l.unitPrice)).toEqual([6800, 9000, 5500]);
});

test("예시9 별칭+미매칭: 단무지 미매칭(단일글자 '무' 오매칭 안 됨)", () => {
  const lines = parseOrderText("팽이 5봉\n새송이 3팩\n단무지 2개", "cust_neulbom", products, prices);
  expect(lines.map((l) => l.productId)).toEqual(["p12", "p13", null]);
  expect(lines[2].status).toBe("unmatched");
});

test("미매칭 라인은 wasUnmatched=true, 자동매칭 라인은 false", () => {
  const lines = parseOrderText("위생장갑 2박스\n랩 3개", "cust_happy", products, prices);
  expect(lines[0].wasUnmatched).toBe(false); // 위생장갑 자동매칭
  expect(lines[1].wasUnmatched).toBe(true); // 랩 미매칭
});

test("자동 매칭된 정상 라인은 별칭 등록 대상 아님", () => {
  const lines = parseOrderText("콩나물 2박스", "cust_garam", products, prices);
  expect(canRegisterAlias(lines[0])).toBe(false);
});

test("미매칭→품목 수동 지정 후 별칭 등록 가능, 재파싱 시 매칭", () => {
  // 1) '랩'은 최초 미매칭
  const lines = parseOrderText("랩 3개", "cust_happy", products, prices);
  expect(lines[0].status).toBe("unmatched");
  expect(lines[0].wasUnmatched).toBe(true);

  // 2) 사용자가 품목(종이컵 p30) 수동 지정 → 별칭 등록 가능
  const assigned = { ...lines[0], productId: "p30" };
  expect(canRegisterAlias(assigned)).toBe(true);

  // 3) 원문 토큰 추출
  const token = extractNameCandidate(assigned.rawText);
  expect(token).toBe("랩");

  // 4) 별칭 등록 후 → 별칭 등록 가능 상태 해제
  expect(canRegisterAlias({ ...assigned, aliasRegistered: true })).toBe(false);

  // 5) 별칭을 품목에 추가한 목록으로 재파싱 → 해당 품목으로 매칭
  const updated = products.map((p) =>
    p.id === "p30" ? { ...p, aliases: [...(p.aliases ?? []), token] } : p,
  );
  const reparsed = parseOrderText("랩 3개", "cust_happy", updated, prices);
  expect(reparsed[0].productId).toBe("p30");
  expect(reparsed[0].status).toBe("matched");
});

test("예시8 비정형: 연결어 '랑' 분리 + 일부 수량 불확실", () => {
  const lines = parseOrderText("두부 세개랑 미나리 5단, 대파도 2단 부탁해요", "cust_garam", products, prices);
  // 두부(세개=불확실) / 미나리 5단 / 대파 2단
  expect(lines.map((l) => l.productId)).toEqual(["p03", "p04", "p06"]);
  expect(lines[0].quantity).toBe(null);
  expect(lines[1].quantity).toBe(5);
  expect(lines[2].quantity).toBe(2);
  expect(canConfirm(lines)).toBe(false);
});

test("단위 사전 확장: 모/봉지를 수량 단위로 인식하고 품목명 후보에서 제거", () => {
  const lines = parseOrderText("두부 4모\n팽이 2봉지", "cust_garam", products, prices);
  expect(lines.map((l) => l.productId)).toEqual(["p03", "p12"]);
  expect(lines.map((l) => l.quantity)).toEqual([4, 2]);
  expect(lines.map((l) => l.unit)).toEqual(["모", "봉지"]);
  expect(extractNameCandidate("두부 4모")).toBe("두부");
  expect(extractNameCandidate("팽이 2봉지")).toBe("팽이");
});
