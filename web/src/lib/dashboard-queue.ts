// W23-R4 오늘 업무 대시보드 — 실제 주문 상태의 읽기 전용 집계(순수 함수, 저장값 없음).
// 집계 기준(재설계 §10·화면 §16.1):
//  · 가격 대기 = quantity_confirmed 전부(날짜 무관 — 어제 못 마감한 주문도 오늘 처리할 일). 오래된 것 먼저.
//  · 명세서 준비 = 오늘(KST) confirmed만.
//  · 매입처 발주 = 오늘(confirmed+quantity_confirmed) 주문에서 파생한 품목 종류·매입처 그룹 수(미지정=1그룹).
//  · cancelled(또는 알 수 없는 상태)는 어떤 카드에도 포함하지 않는다.
//  · 미처리 = 가격 대기 건수(마감 전 주문만이 "처리 남은 일"로 계산 가능한 상태).

export interface QueueOrderLine {
  productId: string;
  productName: string;
}

export interface QueueOrder {
  id: string;
  date: string; // YYYY-MM-DD
  customerId: string;
  customerName: string;
  /** confirmed | quantity_confirmed 외(cancelled 등)는 전부 집계 제외 */
  status: string;
  lines: QueueOrderLine[];
}

export interface QueueProduct {
  id: string;
  purchaseSupplierName?: string | null;
}

export interface PricePendingRow {
  id: string;
  customerName: string;
  date: string;
  lineCount: number;
}

export interface TodayWorkQueue {
  today: string;
  /** 가격 대기 주문(전체 날짜, 오래된 것 먼저) */
  pricePendingOrders: PricePendingRow[];
  pricePendingCount: number;
  /** 오늘 활성(confirmed+quantity_confirmed) 주문 수 */
  todayOrderCount: number;
  /** 오늘 주문 라인의 품목 종류 수 */
  todayItemKinds: number;
  /** 오늘 주문 품목의 매입처 그룹 수(미지정은 1그룹) */
  todaySupplierGroups: number;
  /** 오늘 confirmed 주문 수 = 명세서 준비 */
  todayConfirmedCount: number;
  /** 미처리 = 가격 대기 건수 */
  unhandledCount: number;
}

export function buildTodayWorkQueue(
  orders: QueueOrder[],
  products: QueueProduct[],
  today: string,
): TodayWorkQueue {
  const active = orders.filter(
    (o) => o.status === "confirmed" || o.status === "quantity_confirmed",
  );

  const pricePendingOrders = active
    .filter((o) => o.status === "quantity_confirmed")
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((o) => ({ id: o.id, customerName: o.customerName, date: o.date, lineCount: o.lines.length }));

  const todayActive = active.filter((o) => o.date === today);
  const todayConfirmedCount = todayActive.filter((o) => o.status === "confirmed").length;

  const supplierByProduct = new Map(
    products.map((p) => [p.id, p.purchaseSupplierName || "매입처 미지정"]),
  );
  const itemKinds = new Set<string>();
  const supplierGroups = new Set<string>();
  for (const o of todayActive) {
    for (const l of o.lines) {
      itemKinds.add(l.productId);
      supplierGroups.add(supplierByProduct.get(l.productId) ?? "매입처 미지정");
    }
  }

  return {
    today,
    pricePendingOrders,
    pricePendingCount: pricePendingOrders.length,
    todayOrderCount: todayActive.length,
    todayItemKinds: itemKinds.size,
    todaySupplierGroups: supplierGroups.size,
    todayConfirmedCount,
    unhandledCount: pricePendingOrders.length,
  };
}
