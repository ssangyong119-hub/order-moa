import type { ParsedLine } from "./order-parser";
import type { ConfirmedOrder } from "./order-store";

/** 기존 주문 스냅샷을 새 정정본의 검수표 초깃값으로 바꾼다. 원주문 객체는 변경하지 않는다. */
export function orderToParsedLines(order: ConfirmedOrder): ParsedLine[] {
  return order.lines.map((line) => ({
    id: `correction-${order.id}-${line.id}`,
    rawText: `${line.productName} ${line.quantity}${line.unit}`.trim(),
    productId: line.productId,
    productName: line.productName,
    quantity: line.quantity,
    quantityRaw: String(line.quantity),
    unit: line.unit,
    unitPrice: line.unitPrice,
    priceRegistered: false,
    status: "matched",
    wasUnmatched: false,
    candidateProductIds: [line.productId],
    needsProductConfirmation: false,
  }));
}

/** 최종 확정 주문은 활성 정정본이 하나도 없을 때만 정정 절차에 진입할 수 있다. */
export function canCorrectOrder(
  order: Pick<ConfirmedOrder, "id" | "status">,
  activeOrders: Array<Pick<ConfirmedOrder, "correctedFromOrderId">>,
): boolean {
  return order.status === "confirmed" && !activeOrders.some((candidate) => candidate.correctedFromOrderId === order.id);
}

/**
 * 새 정정본을 활성 목록에 반영한다.
 * - 원주문이 목록에 있으면(일반 정정: confirmed 원주문) 그 자리에서 교체한다.
 * - 원주문이 목록에 없으면(복구 재발행: 원주문이 취소 이력에만 있음) 정정본을 맨 앞에 추가한다.
 *   목록 upsert로 두지 않으면 복구 재발행한 정정본이 활성 목록·월합계·대시보드에서 새로고침 전까지 사라진다.
 */
export function upsertCorrectedOrder<T extends { id: string }>(
  orders: T[],
  originalOrderId: string,
  corrected: T,
): T[] {
  return orders.some((order) => order.id === originalOrderId)
    ? orders.map((order) => (order.id === originalOrderId ? corrected : order))
    : [corrected, ...orders];
}
