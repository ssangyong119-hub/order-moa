// 오더모아 매입처 발주용 품목 합산 (순수 함수, function-spec F11).
// 여러 거래처의 오늘 발주를 품목별로 합산해 "매입처에 보낼 총 발주 수량"을 만든다.
// 이번 단위 범위: 품목별 총합산 + 거래처별 기여 내역 + 복사용 발주 문장.
// (매입처별 분리/매입단가 이력/정확 마진/재고는 2차)

export interface AggregatableLine {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
}
export interface AggregatableOrder {
  customerId: string;
  customerName: string;
  lines: AggregatableLine[];
}

export interface AggregateContribution {
  customerId: string;
  customerName: string;
  qty: number;
}
export interface AggregateRow {
  productId: string;
  name: string;
  unit: string;
  qty: number;
  custCount: number;
  contributions: AggregateContribution[];
}

/**
 * 주문들을 품목별로 합산한다.
 * - qty: 품목 총수량
 * - contributions: 거래처별 기여(수량 내림차순, 동률은 이름순)
 * - 정렬: productOrder(품목 등록 순서) 기준
 */
export function buildAggregateRows(
  orders: AggregatableOrder[],
  productOrder: Array<{ id: string }> = [],
): AggregateRow[] {
  const map = new Map<
    string,
    { name: string; unit: string; qty: number; byCust: Map<string, AggregateContribution> }
  >();

  for (const order of orders) {
    for (const line of order.lines) {
      const row =
        map.get(line.productId) ??
        { name: line.productName, unit: line.unit, qty: 0, byCust: new Map() };
      row.qty += line.quantity;
      const contrib =
        row.byCust.get(order.customerId) ??
        { customerId: order.customerId, customerName: order.customerName, qty: 0 };
      contrib.qty += line.quantity;
      row.byCust.set(order.customerId, contrib);
      map.set(line.productId, row);
    }
  }

  const indexOf = (pid: string) => {
    const i = productOrder.findIndex((p) => p.id === pid);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  return [...map.entries()]
    .map(([productId, v]) => ({
      productId,
      name: v.name,
      unit: v.unit,
      qty: v.qty,
      custCount: v.byCust.size,
      contributions: [...v.byCust.values()].sort(
        (a, b) => b.qty - a.qty || a.customerName.localeCompare(b.customerName, "ko"),
      ),
    }))
    .sort((a, b) => indexOf(a.productId) - indexOf(b.productId));
}

/** 수량+단위 표기 (예: 7 + "박스" → "7박스", 단위 없으면 "7") */
export function formatQtyUnit(qty: number, unit: string): string {
  return unit ? `${qty}${unit}` : `${qty}`;
}

/**
 * 복사용 발주 문장.
 * 예) "오늘 발주 합산\n콩나물 7박스\n양파 3망"
 */
export function formatPurchaseOrderText(rows: AggregateRow[], title = "발주 합산"): string {
  if (rows.length === 0) return title;
  const body = rows.map((r) => `${r.name} ${formatQtyUnit(r.qty, r.unit)}`).join("\n");
  return `${title}\n${body}`;
}

/** 거래처별 기여 내역 문장 (예: "가람식당 3박스, 한빛카페 2박스") */
export function buildContributionText(row: AggregateRow): string {
  return row.contributions
    .map((c) => `${c.customerName} ${formatQtyUnit(c.qty, row.unit)}`)
    .join(", ");
}
