// 오더모아 금액/마진 계산 (순수 함수).
// 확정 규칙 (function-specification §5.1, §7 / db-schema §2):
//  - 라인 금액 = round(quantity × unit_price)  (원 단위 반올림, integer)
//  - 주문/명세서 합계 = 라인 금액의 합 (합산 후 반올림 없음)
//  - 예상 마진 = round((판매단가 − 기준 매입단가) × 수량)  ← 참고값
//  - 기준 매입단가가 없으면(null/undefined) 예상 마진은 null("-" 표시)

/** 라인 금액 = round(수량 × 단가). KRW 정수. */
export function lineAmount(quantity: number, unitPrice: number): number {
  return Math.round(Number(quantity) * Number(unitPrice));
}

/** 합계 = 라인 금액들의 합 (이미 정수인 라인 금액을 더하므로 추가 반올림 없음). */
export function sumAmounts(amounts: number[]): number {
  return amounts.reduce((sum, value) => sum + value, 0);
}

/**
 * 라인 예상 마진(참고값) = round((판매단가 − 기준 매입단가) × 수량).
 * 기준 매입단가가 null/undefined면 null 반환(마진 미표시).
 */
export function estimatedLineMargin(
  unitPrice: number,
  basePurchasePrice: number | null | undefined,
  quantity: number,
): number | null {
  if (basePurchasePrice === null || basePurchasePrice === undefined) {
    return null;
  }
  return Math.round((Number(unitPrice) - Number(basePurchasePrice)) * Number(quantity));
}

/**
 * 주문 예상 마진(참고값) = 기준 매입단가가 있는 라인들의 마진 합.
 * 마진을 계산할 수 있는 라인이 하나도 없으면 null 반환.
 */
export function estimatedOrderMargin(
  lines: Array<{
    unitPrice: number;
    basePurchasePrice: number | null | undefined;
    quantity: number;
  }>,
): number | null {
  const margins = lines
    .map((line) => estimatedLineMargin(line.unitPrice, line.basePurchasePrice, line.quantity))
    .filter((margin): margin is number => margin !== null);
  if (margins.length === 0) {
    return null;
  }
  return margins.reduce((sum, value) => sum + value, 0);
}

/** 표시용 통화 포맷 (원). */
export function formatKRW(value: number): string {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

/** 예상 마진 표시 ("-" 또는 "+1,500원"/"-500원"). */
export function formatMargin(margin: number | null): string {
  if (margin === null) {
    return "-";
  }
  const sign = margin > 0 ? "+" : "";
  return `${sign}${Number(margin).toLocaleString("ko-KR")}원`;
}
