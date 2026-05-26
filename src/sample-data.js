export const sampleData = {
  customers: [
    { id: "cust_marathon", name: "마라톤 홀", phone: "010-9151-5109", memo: "부산 사상구" },
    { id: "cust_alddol", name: "알뜰식품", phone: "", memo: "채소류 주문 많음" },
    { id: "cust_konabari", name: "코나바리", phone: "", memo: "반찬 납품" }
  ],
  products: [
    { id: "prod_minari", name: "미나리", baseUnit: "단", aliases: ["미나리", "미나리 국산"] },
    { id: "prod_bean_sprout", name: "콩나물", baseUnit: "박스", aliases: ["콩나물", "콩"] },
    { id: "prod_tofu", name: "두부", baseUnit: "판", aliases: ["두부", "두부판"] },
    { id: "prod_onion", name: "깐양파", baseUnit: "10kg", aliases: ["양파", "깐양파"] },
    { id: "prod_tablecloth", name: "식탁보", baseUnit: "BOX", aliases: ["식탁보"] }
  ],
  prices: [
    { customerId: "cust_marathon", productId: "prod_minari", price: 3500 },
    { customerId: "cust_marathon", productId: "prod_tablecloth", price: 19500 },
    { customerId: "cust_alddol", productId: "prod_bean_sprout", price: 8000 },
    { customerId: "cust_alddol", productId: "prod_tofu", price: 2000 },
    { customerId: "cust_konabari", productId: "prod_onion", price: 11000 },
    { customerId: "cust_konabari", productId: "prod_tofu", price: 2200 }
  ],
  orders: [
    {
      id: "order_20260526_1",
      date: "2026-05-26",
      customerId: "cust_marathon",
      source: "카톡",
      items: [
        { productId: "prod_minari", quantity: 2 },
        { productId: "prod_tablecloth", quantity: 1 }
      ]
    },
    {
      id: "order_20260526_2",
      date: "2026-05-26",
      customerId: "cust_alddol",
      source: "전화",
      items: [
        { productId: "prod_bean_sprout", quantity: 3 },
        { productId: "prod_tofu", quantity: 4 }
      ]
    }
  ]
};
