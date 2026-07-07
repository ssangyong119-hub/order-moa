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

export interface PurchaseSupplierProduct {
  id: string;
  purchaseSupplierName?: string | null;
}

export interface SupplierPurchaseSection {
  supplierName: string;
  rows: AggregateRow[];
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

export function buildSupplierPurchaseSections(
  rows: AggregateRow[],
  products: PurchaseSupplierProduct[],
  selectedProductIds: Set<string> = new Set(rows.map((row) => row.productId)),
): SupplierPurchaseSection[] {
  const supplierByProduct = new Map(
    products.map((product) => [product.id, product.purchaseSupplierName || "매입처 미지정"]),
  );
  const sections = new Map<string, AggregateRow[]>();
  for (const row of rows) {
    if (!selectedProductIds.has(row.productId)) continue;
    const supplierName = supplierByProduct.get(row.productId) ?? "매입처 미지정";
    sections.set(supplierName, [...(sections.get(supplierName) ?? []), row]);
  }
  return [...sections.entries()].map(([supplierName, sectionRows]) => ({
    supplierName,
    rows: sectionRows,
  }));
}

export interface SupplierPurchaseTextOptions {
  /** DB=회사명(ordermoa_companies.name), 데모=회사명. 비어 있으면 인사말 줄 생략 */
  companyName?: string | null;
  /** 여러 매입처 구분용 [매입처명] 헤더. 전체 복사=true, 개별 복사=false (기본 true) */
  withSupplierHeader?: boolean;
}

/**
 * 매입처 발주 문장.
 * 형식) "{회사명}입니다\n발주 품목입니다\n1. 콩나물 3박스\n2. 두부 8판"
 * - 회사명 없으면 첫 줄 생략, 품목은 1부터 번호
 * - withSupplierHeader=true면 섹션마다 [매입처명] 헤더, 섹션 사이 빈 줄
 */
export function formatSupplierPurchaseText(
  sections: SupplierPurchaseSection[],
  options: SupplierPurchaseTextOptions = {},
): string {
  const { companyName, withSupplierHeader = true } = options;
  const greeting = companyName?.trim() ? `${companyName.trim()}입니다` : null;
  return sections
    .map((section) => {
      const items = section.rows.map(
        (row, i) => `${i + 1}. ${row.name} ${formatQtyUnit(row.qty, row.unit)}`,
      );
      const lines = [greeting, "발주 품목입니다", ...items].filter(Boolean) as string[];
      if (withSupplierHeader) lines.unshift(`[${section.supplierName}]`);
      return lines.join("\n");
    })
    .join("\n\n");
}

/**
 * 발주 누락 검수 요약 (화면 상태 파생값, DB 변경 없음).
 * - total: 합산 대상 품목 수
 * - included/excluded: 발주 문장에 담김/안 담김 (체크 여부)
 * - unassigned: 매입처 미지정 품목 수 (체크 무관)
 */
export function buildPurchaseChecklistSummary(
  rows: AggregateRow[],
  selectedProductIds: Set<string>,
  products: PurchaseSupplierProduct[],
): { total: number; included: number; excluded: number; unassigned: number } {
  const supplierByProduct = new Map(products.map((p) => [p.id, p.purchaseSupplierName || ""]));
  let included = 0;
  let unassigned = 0;
  for (const row of rows) {
    if (selectedProductIds.has(row.productId)) included += 1;
    if (!supplierByProduct.get(row.productId)) unassigned += 1;
  }
  return { total: rows.length, included, excluded: rows.length - included, unassigned };
}

/** 매입처 이름 → 파스텔 팔레트 인덱스(0..7). 같은 이름은 항상 같은 색. */
export function supplierColorIndex(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 8;
}

/** 거래처별 기여 내역 문장 (예: "가람식당 3박스, 한빛카페 2박스") */
export function buildContributionText(row: AggregateRow): string {
  return row.contributions
    .map((c) => `${c.customerName} ${formatQtyUnit(c.qty, row.unit)}`)
    .join(", ");
}
