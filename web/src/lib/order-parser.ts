// 오더모아 발주 원문 파서 (규칙 기반, function-specification §6).
// 완전 자동 확정 금지 — 후보(라인)만 생성하고, 최종 확정은 사용자(F9)가 한다.
// 순수 함수: UI/저장소와 분리. 거래처는 호출 전에 선택되어 customerId로 들어온다.
import type { CustomerPrice, Product } from "./domain/types";
import { findCustomerPrice } from "./domain";

export type LineStatus = "matched" | "unmatched" | "qty_uncertain";

export interface ParsedLine {
  id: string;
  /** 원문 토막(해당 라인의 원본 텍스트) */
  rawText: string;
  /** 매칭된 품목 id. 미매칭이면 null */
  productId: string | null;
  /** 표시용 품목명(매칭 시 품목명, 미매칭 시 원문 후보) */
  productName: string;
  /** 수량. 불확실(한글 수사/모호 표현/누락)이면 null */
  quantity: number | null;
  /** 수량 원문 토막(참고) */
  quantityRaw: string;
  /** 단위(입력/추정) */
  unit: string;
  /** 단가(원). 미등록이면 0 */
  unitPrice: number;
  /** 거래처별 단가가 등록되어 있었는지 */
  priceRegistered: boolean;
  status: LineStatus;
  /** 파싱 시점에 자동 매칭에 실패했는지(원문 별칭 등록 후보 판별용). */
  wasUnmatched: boolean;
  /** 사용자가 이 라인의 원문 토큰을 별칭으로 등록했는지. */
  aliasRegistered?: boolean;
}

// 단위 사전 (sample-data-definition §10.2)
const UNITS = [
  "박스", "box", "kg", "키로", "킬로", "키로그람", "킬로그람", "ea", "개", "봉지", "봉", "단", "판", "팩", "망", "통",
  "포기", "장", "마리", "모", "l", "ml", "입", "매",
];
// 한글 수사(단독 토큰) — 아라비아 숫자 없으면 수량 불확실 처리
const KOR_NUM = ["한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
// 모호 수량 표현 — 수량 불확실
const VAGUE = ["조금", "조큼", "약간", "많이", "적당", "대충", "큰거", "작은거", "큰 거", "작은 거", "큰걸", "큰거로"];
// 연결어 — 한 줄 다품목 분리 보조
const CONNECTORS = /(이랑|랑|하고|그리고|및)/g;
// 후행 군말/조사/존댓말
const POLITE = ["부탁해요", "부탁드려요", "부탁", "주세요", "해주세요", "주라", "요"];
const TRAILING_PARTICLES = ["으로", "로", "도"];

// 측정(규격성) 단위 — "1kg", "100L"처럼 숫자와 붙으면 수량이 아니라 규격일 가능성이 높다.
// 수량 선택 시 우선순위를 낮춘다(개선 1차: t11 규격 숫자 오인).
const MEASURE_UNITS = ["kg", "g", "l", "ml"];

const UNIT_ALIASES: Record<string, string> = {
  키로: "kg",
  킬로: "kg",
  키로그람: "kg",
  킬로그람: "kg",
};

function normalizeUnit(unit: string): string {
  return UNIT_ALIASES[unit.toLowerCase()] ?? unit;
}

const unitAlt = [...UNITS]
  .sort((a, b) => b.length - a.length)
  .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
// 숫자(+선택 단위) 클러스터
const numUnitReGlobal = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${unitAlt})?`, "gi");
// 단독 단위(경계)
const standaloneUnitRe = new RegExp(`(^|\\s)(${unitAlt})(?=\\s|$)`, "gi");
const korNumRe = new RegExp(`(^|\\s)(${KOR_NUM.join("|")})(?=\\s|$)`, "g");

function normalize(text: string): string {
  return text.replace(/\s+/g, "");
}

function matchProduct(candidate: string, products: Product[]): Product | null {
  const norm = normalize(candidate);
  if (!norm) return null;
  // 1) 정확 일치 (품목명/별칭)
  for (const product of products) {
    if (normalize(product.name) === norm) return product;
    for (const alias of product.aliases ?? []) {
      if (normalize(alias) === norm) return product;
    }
  }
  // 2) 포함 매칭 (후보 ⊇ 별칭/품목명 또는 그 반대)
  //    1글자 토큰은 오매칭 위험(예: "무"가 "단무지"에 포함)이라 정확 일치에서만 허용.
  const contains = (a: string, b: string) =>
    a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a));
  for (const product of products) {
    if (contains(norm, normalize(product.name))) return product;
    for (const alias of product.aliases ?? []) {
      if (contains(norm, normalize(alias))) return product;
    }
  }
  return null;
}

export function extractNameCandidate(segment: string): string {
  let text = ` ${segment} `;
  // 숫자(+단위) 클러스터 제거
  text = text.replace(numUnitReGlobal, " ");
  // 단독 단위 제거
  text = text.replace(standaloneUnitRe, " ");
  // 한글 수사 제거
  text = text.replace(korNumRe, " ");
  // 모호 표현 제거
  for (const vague of VAGUE) text = text.split(vague).join(" ");
  // 연결어 제거
  text = text.replace(CONNECTORS, " ");
  // 존댓말/군말 제거
  for (const word of POLITE) text = text.split(word).join(" ");
  text = text.trim();
  // 후행 조사 제거
  for (const particle of TRAILING_PARTICLES) {
    if (text.endsWith(particle)) text = text.slice(0, -particle.length).trim();
  }
  return text.replace(/\s+/g, " ").trim();
}

interface QuantityCluster {
  raw: string;
  unit: string | null;
}

/**
 * 세그먼트의 숫자(+단위) 클러스터 중 "수량"으로 쓸 것을 고른다.
 * 우선순위: ① 수량단위 결합(2봉/3박스) → ② 단독 숫자(두부판 2) → ③ 측정단위 결합(3kg — 규격일 수도, 수량일 수도).
 * "청양고추 1kg 2봉"에서 1kg(규격)이 아니라 2봉을 채택하기 위함. 측정단위 숫자만 있으면 그대로 수량("감자 3kg").
 */
function pickQuantityCluster(segment: string): QuantityCluster | null {
  const clusters: QuantityCluster[] = [...segment.matchAll(numUnitReGlobal)].map((m) => ({
    raw: m[1],
    unit: m[2] ? normalizeUnit(m[2]) : null,
  }));
  const isMeasure = (u: string | null) => u !== null && MEASURE_UNITS.includes(u.toLowerCase());
  const countUnit = clusters.find((c) => c.unit !== null && !isMeasure(c.unit));
  const bare = clusters.find((c) => c.unit === null);
  const measure = clusters.find((c) => isMeasure(c.unit));
  return countUnit ?? bare ?? measure ?? null;
}

function extractUnit(segment: string, fallback: string, clusterUnit: string | null): string {
  if (clusterUnit) return clusterUnit;
  const standalone = standaloneUnitRe.exec(` ${segment} `);
  standaloneUnitRe.lastIndex = 0;
  if (standalone && standalone[2]) return normalizeUnit(standalone[2]);
  return fallback;
}

function splitSegments(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .flatMap((line) => line.replace(CONNECTORS, ",").split(/[,，]/))
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

export function parseOrderText(
  rawText: string,
  customerId: string,
  products: Product[],
  prices: CustomerPrice[],
): ParsedLine[] {
  const segments = splitSegments(rawText);

  return segments.map((segment, index) => {
    const cluster = pickQuantityCluster(segment);
    const quantity = cluster ? Number(cluster.raw) : null;

    const product = matchProduct(extractNameCandidate(segment), products);
    const unit = extractUnit(segment, product ? product.baseUnit : "", cluster?.unit ?? null);

    let unitPrice = 0;
    let priceRegistered = false;
    if (product) {
      const price = findCustomerPrice(prices, customerId, product.id);
      if (price !== null) {
        unitPrice = price;
        priceRegistered = true;
      }
    }

    let status: LineStatus;
    if (!product) {
      status = "unmatched";
    } else if (quantity === null) {
      status = "qty_uncertain";
    } else {
      status = "matched";
    }

    return {
      id: `line_${index}`,
      rawText: segment,
      productId: product ? product.id : null,
      productName: product ? product.name : segment,
      quantity,
      quantityRaw: cluster ? cluster.raw : "",
      unit,
      unitPrice,
      priceRegistered,
      status,
      wasUnmatched: !product,
    };
  });
}

/** 미매칭이었던 라인에 사용자가 품목을 지정했으면 별칭 등록 가능. */
export function canRegisterAlias(
  line: Pick<ParsedLine, "wasUnmatched" | "productId" | "aliasRegistered">,
): boolean {
  return Boolean(line.wasUnmatched && line.productId && !line.aliasRegistered);
}

/** 미매칭 또는 수량 불확실 라인이 있으면 확정 차단 (F9). */
export function canConfirm(lines: ParsedLine[]): boolean {
  return (
    lines.length > 0 &&
    lines.every((line) => line.productId !== null && line.quantity !== null && line.quantity > 0)
  );
}

/** 확정 차단 사유 메시지(사용자 친화). */
export function confirmBlockReason(lines: ParsedLine[]): string | null {
  if (lines.length === 0) return "파싱된 항목이 없습니다.";
  const unmatched = lines.filter((line) => line.productId === null).length;
  const uncertain = lines.filter(
    (line) => line.productId !== null && (line.quantity === null || line.quantity <= 0),
  ).length;
  const parts: string[] = [];
  if (unmatched > 0) parts.push(`미매칭 ${unmatched}건(품목을 지정하거나 별칭 등록)`);
  if (uncertain > 0) parts.push(`수량 확인 필요 ${uncertain}건`);
  return parts.length > 0 ? `확정 불가: ${parts.join(", ")}` : null;
}
