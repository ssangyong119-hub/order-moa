export function createId(prefix) {
  const safePrefix = String(prefix).toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `${safePrefix}_${unique}`;
}

export function findById(records, id) {
  return records.find((record) => record.id === id) ?? null;
}

export function findCustomerPrice(prices, customerId, productId) {
  const match = prices.find((price) => (
    price.customerId === customerId && price.productId === productId
  ));
  return match ? Number(match.price) : null;
}

export function getProductLabel(products, productId) {
  const product = findById(products, productId);
  return product ? product.name : "알 수 없는 품목";
}

export function getProductUnit(products, productId) {
  const product = findById(products, productId);
  return product ? product.baseUnit : "";
}

export function getOrderTotal(order, products, prices) {
  return order.items.reduce((total, item) => {
    const unitPrice = findCustomerPrice(prices, order.customerId, item.productId) ?? 0;
    return total + Number(item.quantity) * unitPrice;
  }, 0);
}

export function aggregateItems(orders, products) {
  const grouped = new Map();

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
      quantity
    }))
    .sort((a, b) => (
      products.findIndex((product) => product.id === a.productId)
      - products.findIndex((product) => product.id === b.productId)
    ));
}

export function buildDeliveryNote(order, customers, products, prices) {
  const customer = findById(customers, order.customerId);
  const rows = order.items.map((item) => {
    const unitPrice = findCustomerPrice(prices, order.customerId, item.productId) ?? 0;
    const quantity = Number(item.quantity);

    return {
      productName: getProductLabel(products, item.productId),
      unit: getProductUnit(products, item.productId),
      quantity,
      unitPrice,
      amount: quantity * unitPrice
    };
  });
  const supplyAmount = rows.reduce((sum, row) => sum + row.amount, 0);

  return {
    orderId: order.id,
    date: order.date,
    customerName: customer ? customer.name : "알 수 없는 거래처",
    customerPhone: customer ? customer.phone : "",
    rows,
    supplyAmount,
    vat: 0,
    total: supplyAmount
  };
}

export function formatCurrency(value) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}
