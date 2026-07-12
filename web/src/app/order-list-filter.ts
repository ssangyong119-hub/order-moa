// 주문 목록 날짜·상태 필터 (R4 보정 — 순수 함수).
// page.tsx에서 export하면 Next.js App Router 타입 검사가 막아서 전용 모듈로 분리(테스트 대상).
// cancelled는 loadOrders에서 이미 제외 — 여기서 새로 포함하지 않는다.
import type { ConfirmedOrder } from "@/lib/order-store";

export type OrderListStatusFilter = "all" | "quantity_confirmed" | "confirmed";

/** 날짜(""=전체)와 상태("all"=전체) 필터를 함께 적용한 주문 목록. */
export function filterOrdersForList(
  orders: ConfirmedOrder[],
  date: string,
  status: OrderListStatusFilter,
): ConfirmedOrder[] {
  return orders.filter(
    (o) => (date === "" || o.date === date) && (status === "all" || o.status === status),
  );
}
