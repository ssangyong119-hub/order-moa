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

/** 원주문이 취소된 자리에 새 정정본만 활성 목록으로 반영한다. */
export function replaceOrderById<T extends { id: string }>(
  orders: T[],
  originalOrderId: string,
  replacement: T,
): T[] {
  return orders.map((order) => (order.id === originalOrderId ? replacement : order));
}
