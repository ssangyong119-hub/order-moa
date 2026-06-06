// 오더모아 도메인 로직 (순수 함수, UI/저장소와 분리).
// 기존 정적 MVP src/domain.js 를 TypeScript 로 이전한 것. 동작은 동일하게 유지한다.
import type {
  AggregatedItem,
  Customer,
  CustomerPrice,
  DeliveryNote,
  DeliveryNoteRow,
  Order,
  Product,
} from "./types";

export function createId(prefix: string): string {
  const safePrefix = String(prefix).toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `${safePrefix}_${unique}`;
}

export function findById<T extends { id: string }>(records: T[], id: string): T | null {
  return records.find((record) => record.id === id) ?? null;
}

export function findCustomerPrice(
  prices: CustomerPrice[],
  customerId: string,
  productId: string,
): number | null {
  const match = prices.find(
    (price) => price.customerId === customerId && price.productId === productId,
  );
  return match ? Number(match.price) : null;
}

export function getProductLabel(products: Product[], productId: string): string {
  const product = findById(products, productId);
  return product ? product.name : "알 수 없는 품목";
}

export function getProductUnit(products: Product[], productId: string): string {
  const product = findById(products, productId);
  return product ? product.baseUnit : "";
}

export function getOrderTotal(
  order: Order,
  _products: Product[],
  prices: CustomerPrice[],
): number {
  return order.items.reduce((total, item) => {
    const unitPrice = findCustomerPrice(prices, order.customerId, item.productId) ?? 0;
    return total + Number(item.quantity) * unitPrice;
  }, 0);
}

export function aggregateItems(orders: Order[], products: Product[]): AggregatedItem[] {
  const grouped = new Map<string, number>();

  for (const order of orders) {
    for (const item of order.items) {
      const current = grouped.get(item.productId) ?? 0;
      grouped.set(item.productId, current + Number(item.quantity));
    }
  }

  return Array.from(grouped.entries())
    .map(([productId, quantity]) => ({
      productId,
      productName: getProductLabel(products, productId),
      unit: getProductUnit(products, productId),
      quantity,
    }))
    .sort(
      (a, b) =>
        products.findIndex((product) => product.id === a.productId) -
        products.findIndex((product) => product.id === b.productId),
    );
}

export function buildDeliveryNote(
  order: Order,
  customers: Customer[],
  products: Product[],
  prices: CustomerPrice[],
): DeliveryNote {
  const customer = findById(customers, order.customerId);
  const rows: DeliveryNoteRow[] = order.items.map((item) => {
    const unitPrice = findCustomerPrice(prices, order.customerId, item.productId) ?? 0;
    const quantity = Number(item.quantity);

    return {
      productName: getProductLabel(products, item.productId),
      unit: getProductUnit(products, item.productId),
      quantity,
      unitPrice,
      amount: quantity * unitPrice,
    };
  });
  const supplyAmount = rows.reduce((sum, row) => sum + row.amount, 0);

  return {
    orderId: order.id,
    date: order.date,
    customerName: customer ? customer.name : "알 수 없는 거래처",
    customerPhone: customer?.phone ?? "",
    rows,
    supplyAmount,
    vat: 0,
    total: supplyAmount,
  };
}

export function formatCurrency(value: number): string {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

export * from "./types";
