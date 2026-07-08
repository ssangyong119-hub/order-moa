// 거래처별 월 매출 합계 (W12, 8c) — 저장된 확정 주문의 스냅샷 금액(order.total)만으로 계산.
// 세금계산서 발행/회계 기능 아님. customer_prices(현재 단가표)를 절대 재조회하지 않는다(스냅샷 불변).
// raw_text 유무와 무관.

/** 계산에 필요한 최소 필드만 — ConfirmedOrder가 구조적으로 만족한다. */
export interface MonthlyOrderInput {
  date: string; // YYYY-MM-DD
  customerId: string;
  customerName: string;
  total: number; // 확정 시점 스냅샷 합계(Σ order_items.amount)
}

export interface MonthlySummaryRow {
  customerId: string;
  customerName: string;
  orderCount: number;
  totalAmount: number;
  lastOrderDate: string; // YYYY-MM-DD
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  rows: MonthlySummaryRow[]; // 금액 내림차순(동률은 거래처명순)
  totalAmount: number; // 전체 거래처 합계
  orderCount: number; // 해당 월 주문 건수
}

const monthOf = (date: string) => date.slice(0, 7);

/** month(YYYY-MM)의 거래처별 월 합계. */
export function buildMonthlySummary(orders: MonthlyOrderInput[], month: string): MonthlySummary {
  const byCustomer = new Map<string, MonthlySummaryRow>();
  let orderCount = 0;

  for (const o of orders) {
    if (monthOf(o.date) !== month) continue;
    orderCount += 1;
    const row =
      byCustomer.get(o.customerId) ??
      { customerId: o.customerId, customerName: o.customerName, orderCount: 0, totalAmount: 0, lastOrderDate: "" };
    row.orderCount += 1;
    row.totalAmount += o.total;
    if (o.date >= row.lastOrderDate) {
      row.lastOrderDate = o.date;
      row.customerName = o.customerName; // 가장 최근 주문의 거래처명 사용(이름 변경 대비)
    }
    byCustomer.set(o.customerId, row);
  }

  const rows = [...byCustomer.values()].sort(
    (a, b) => b.totalAmount - a.totalAmount || a.customerName.localeCompare(b.customerName, "ko"),
  );
  return {
    month,
    rows,
    totalAmount: rows.reduce((sum, r) => sum + r.totalAmount, 0),
    orderCount,
  };
}

/** 주문에 존재하는 달(YYYY-MM)들, 최신순. 월 선택 기본값/목록용. */
export function availableMonths(orders: MonthlyOrderInput[]): string[] {
  return [...new Set(orders.map((o) => monthOf(o.date)))].sort().reverse();
}
