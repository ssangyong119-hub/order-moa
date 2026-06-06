// 오더모아 도메인 타입
// 기존 정적 MVP(src/domain.js, src/sample-data.js)의 데이터 형태를 TypeScript로 정리한 것.
// 금액은 KRW 원 단위 정수(integer)로 다룬다 (Codex 승인).

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  memo?: string;
}

export interface Product {
  id: string;
  name: string;
  baseUnit: string;
  aliases?: string[];
}

export interface CustomerPrice {
  customerId: string;
  productId: string;
  /** 거래처별 판매 단가 (원, 정수) */
  price: number;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  date?: string;
  customerId: string;
  source?: string;
  items: OrderItem[];
}

export interface AggregatedItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
}

export interface DeliveryNoteRow {
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface DeliveryNote {
  orderId: string;
  date?: string;
  customerName: string;
  customerPhone: string;
  rows: DeliveryNoteRow[];
  supplyAmount: number;
  vat: number;
  total: number;
}
