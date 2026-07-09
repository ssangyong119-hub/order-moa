// 오더모아 시연/검증용 가명 샘플 데이터 (sample-data-definition.md).
// 개인정보·실거래처명·전화·사업자번호 없음. 모든 값은 가명·테스트용.
import type { Customer, CustomerPrice, Product, Supplier } from "./domain/types";

/** 공급자(회사) 정보 — 거래명세서 상단용. 가짜/공란(민감정보 없음). */
export const sampleCompany = {
  name: "오더모아 샘플상사",
  businessNumber: "", // 공란(샘플)
  phone: "",
  address: "",
};

/** 거래처 (가명 5) — 전화/주소는 공란 */
export const sampleCustomers: Customer[] = [
  { id: "cust_garam", name: "가람식당", memo: "점심 백반, 채소 위주" },
  { id: "cust_hanbit", name: "한빛카페", memo: "계란·소모품 위주" },
  { id: "cust_eutteum", name: "으뜸반찬", memo: "채소·두부 다량" },
  { id: "cust_happy", name: "행복마트", memo: "공산품 포함" },
  { id: "cust_neulbom", name: "늘봄분식", memo: "소량 다품목" },
];

export const samplePurchaseSuppliers: Supplier[] = [
  { id: "sup_veg", name: "야채매입처" },
  { id: "sup_tofu", name: "두부콩나물매입처" },
  { id: "sup_root", name: "뿌리채소매입처" },
  { id: "sup_processed", name: "김치반찬매입처" },
  { id: "sup_goods", name: "공산품매입처" },
];

function supplier(id: string) {
  return samplePurchaseSuppliers.find((s) => s.id === id)?.name ?? "매입처 미지정";
}

/**
 * 품목 (30) — baseUnit / aliases / basePurchasePrice.
 * basePurchasePrice는 §6.1 명시 품목만 설정, 나머지는 null(마진 미표시 테스트).
 */
export const sampleProducts: Product[] = [
  { id: "p01", name: "콩나물", baseUnit: "박스", aliases: ["콩", "콩박스", "콩나물박스"], purchaseSupplierId: "sup_tofu", purchaseSupplierName: supplier("sup_tofu"), basePurchasePrice: 6500, category: "농산물" },
  { id: "p02", name: "숙주", baseUnit: "박스", aliases: ["숙주나물"], purchaseSupplierId: "sup_tofu", purchaseSupplierName: supplier("sup_tofu"), basePurchasePrice: null, category: "농산물" },
  { id: "p03", name: "두부", baseUnit: "판", aliases: ["두부판"], purchaseSupplierId: "sup_tofu", purchaseSupplierName: supplier("sup_tofu"), basePurchasePrice: 1800, category: "냉식" },
  { id: "p04", name: "미나리", baseUnit: "단", aliases: ["미나리단"], purchaseSupplierId: "sup_veg", purchaseSupplierName: supplier("sup_veg"), basePurchasePrice: 2500, category: "농산물" },
  { id: "p05", name: "깐양파", baseUnit: "10kg", aliases: ["양파"], purchaseSupplierId: "sup_veg", purchaseSupplierName: supplier("sup_veg"), basePurchasePrice: 9000, category: "농산물" },
  { id: "p06", name: "대파", baseUnit: "단", aliases: ["대파단"], purchaseSupplierId: "sup_veg", purchaseSupplierName: supplier("sup_veg"), basePurchasePrice: 3000, category: "농산물" },
  { id: "p07", name: "양배추", baseUnit: "통", aliases: [], purchaseSupplierId: "sup_veg", purchaseSupplierName: supplier("sup_veg"), basePurchasePrice: null, category: "농산물" },
  { id: "p08", name: "무", baseUnit: "개", aliases: [], purchaseSupplierId: "sup_root", purchaseSupplierName: supplier("sup_root"), basePurchasePrice: 1000, category: "농산물" },
  { id: "p09", name: "배추", baseUnit: "포기", aliases: [], purchaseSupplierId: "sup_veg", purchaseSupplierName: supplier("sup_veg"), basePurchasePrice: null, category: "농산물" },
  { id: "p10", name: "감자", baseUnit: "kg", aliases: [], purchaseSupplierId: "sup_root", purchaseSupplierName: supplier("sup_root"), basePurchasePrice: null, category: "농산물" },
  { id: "p11", name: "애호박", baseUnit: "개", aliases: [], purchaseSupplierId: "sup_veg", purchaseSupplierName: supplier("sup_veg"), basePurchasePrice: null, category: "농산물" },
  { id: "p12", name: "팽이버섯", baseUnit: "봉", aliases: ["팽이"], purchaseSupplierId: "sup_veg", purchaseSupplierName: supplier("sup_veg"), basePurchasePrice: null, category: "농산물" },
  { id: "p13", name: "새송이버섯", baseUnit: "팩", aliases: ["새송이"], purchaseSupplierId: "sup_veg", purchaseSupplierName: supplier("sup_veg"), basePurchasePrice: null, category: "농산물" },
  { id: "p14", name: "느타리버섯", baseUnit: "팩", aliases: [], purchaseSupplierId: "sup_veg", purchaseSupplierName: supplier("sup_veg"), basePurchasePrice: null, category: "농산물" },
  { id: "p15", name: "계란", baseUnit: "판", aliases: ["계란판"], purchaseSupplierId: null, purchaseSupplierName: null, basePurchasePrice: 5500, category: "냉식" },
  { id: "p16", name: "상추", baseUnit: "kg", aliases: [], purchaseSupplierId: "sup_veg", purchaseSupplierName: supplier("sup_veg"), basePurchasePrice: null, category: "농산물" },
  { id: "p17", name: "깻잎", baseUnit: "박스", aliases: [], purchaseSupplierId: "sup_veg", purchaseSupplierName: supplier("sup_veg"), basePurchasePrice: null, category: "농산물" },
  { id: "p18", name: "청양고추", baseUnit: "kg", aliases: [], purchaseSupplierId: "sup_veg", purchaseSupplierName: supplier("sup_veg"), basePurchasePrice: null, category: "농산물" },
  { id: "p19", name: "당근", baseUnit: "kg", aliases: [], purchaseSupplierId: "sup_root", purchaseSupplierName: supplier("sup_root"), basePurchasePrice: null, category: "농산물" },
  { id: "p20", name: "오이", baseUnit: "박스", aliases: [], purchaseSupplierId: "sup_veg", purchaseSupplierName: supplier("sup_veg"), basePurchasePrice: null, category: "농산물" },
  { id: "p21", name: "마늘", baseUnit: "kg", aliases: [], purchaseSupplierId: "sup_root", purchaseSupplierName: supplier("sup_root"), basePurchasePrice: null, category: "농산물" },
  { id: "p22", name: "부추", baseUnit: "단", aliases: [], purchaseSupplierId: "sup_veg", purchaseSupplierName: supplier("sup_veg"), basePurchasePrice: null, category: "농산물" },
  { id: "p23", name: "시금치", baseUnit: "단", aliases: [], purchaseSupplierId: "sup_veg", purchaseSupplierName: supplier("sup_veg"), basePurchasePrice: null, category: "농산물" },
  { id: "p24", name: "떡국떡", baseUnit: "kg", aliases: [], purchaseSupplierId: "sup_processed", purchaseSupplierName: supplier("sup_processed"), basePurchasePrice: 3500, category: "냉식" },
  { id: "p25", name: "어묵", baseUnit: "박스", aliases: [], purchaseSupplierId: "sup_processed", purchaseSupplierName: supplier("sup_processed"), basePurchasePrice: 10000, category: "수산" },
  { id: "p26", name: "식용유", baseUnit: "통", aliases: [], purchaseSupplierId: "sup_goods", purchaseSupplierName: supplier("sup_goods"), basePurchasePrice: null, category: "공산품" },
  { id: "p27", name: "식탁보", baseUnit: "BOX", aliases: [], purchaseSupplierId: "sup_goods", purchaseSupplierName: supplier("sup_goods"), basePurchasePrice: 16000, category: "공산품" },
  { id: "p28", name: "위생장갑", baseUnit: "박스", aliases: ["장갑"], purchaseSupplierId: "sup_goods", purchaseSupplierName: supplier("sup_goods"), basePurchasePrice: 3500, category: "공산품" },
  { id: "p29", name: "키친타월", baseUnit: "박스", aliases: ["키친타올"], purchaseSupplierId: "sup_goods", purchaseSupplierName: supplier("sup_goods"), basePurchasePrice: null, category: "공산품" },
  { id: "p30", name: "종이컵", baseUnit: "박스", aliases: [], purchaseSupplierId: "sup_goods", purchaseSupplierName: supplier("sup_goods"), basePurchasePrice: null, category: "공산품" },
  { id: "p31", name: "배추김치", baseUnit: "kg", aliases: ["김치"], purchaseSupplierId: "sup_processed", purchaseSupplierName: supplier("sup_processed"), basePurchasePrice: null, category: "냉식" },
  { id: "p32", name: "총각김치", baseUnit: "kg", aliases: ["알타리김치", "김치"], purchaseSupplierId: "sup_processed", purchaseSupplierName: supplier("sup_processed"), basePurchasePrice: null, category: "냉식" },
  { id: "p33", name: "수세미", baseUnit: "개", aliases: ["주방수세미"], purchaseSupplierId: "sup_goods", purchaseSupplierName: supplier("sup_goods"), basePurchasePrice: null, category: "공산품" },
];

/** 거래처별 판매단가 (일부만 등록 — 미등록 경고 테스트) */
export const sampleCustomerPrices: CustomerPrice[] = [
  // 가람식당 (양배추 미등록)
  { customerId: "cust_garam", productId: "p01", price: 8000 },
  { customerId: "cust_garam", productId: "p03", price: 2500 },
  { customerId: "cust_garam", productId: "p04", price: 3500 },
  { customerId: "cust_garam", productId: "p06", price: 4000 },
  { customerId: "cust_garam", productId: "p15", price: 6500 },
  // 으뜸반찬
  { customerId: "cust_eutteum", productId: "p01", price: 7500 },
  { customerId: "cust_eutteum", productId: "p03", price: 2300 },
  { customerId: "cust_eutteum", productId: "p05", price: 11000 },
  { customerId: "cust_eutteum", productId: "p08", price: 1500 },
  { customerId: "cust_eutteum", productId: "p22", price: 3000 },
  // 한빛카페
  { customerId: "cust_hanbit", productId: "p15", price: 6800 },
  { customerId: "cust_hanbit", productId: "p29", price: 9000 },
  { customerId: "cust_hanbit", productId: "p26", price: 5500 },
  // 행복마트
  { customerId: "cust_happy", productId: "p28", price: 4500 },
  { customerId: "cust_happy", productId: "p27", price: 19500 },
  { customerId: "cust_happy", productId: "p29", price: 8500 },
  { customerId: "cust_happy", productId: "p25", price: 12000 },
  { customerId: "cust_happy", productId: "p33", price: 1200 },
  // 늘봄분식 (콩나물 미등록)
  { customerId: "cust_neulbom", productId: "p25", price: 12500 },
  { customerId: "cust_neulbom", productId: "p24", price: 4500 },
  { customerId: "cust_neulbom", productId: "p07", price: 3000 },
  { customerId: "cust_neulbom", productId: "p06", price: 4200 },
  { customerId: "cust_neulbom", productId: "p31", price: 6000 },
  { customerId: "cust_neulbom", productId: "p32", price: 6500 },
];

export interface SampleOrderExample {
  id: string;
  customerId: string;
  label: string;
  rawText: string;
  purpose: string;
}

/** 발주 원문 예시 — 짧은 확인용 + 긴 테스트용 */
export const sampleOrderExamples: SampleOrderExample[] = [
  {
    id: "ex1",
    customerId: "cust_garam",
    label: "① 정형 (가람식당)",
    rawText: "콩나물 2박스\n두부 3판\n미나리 5단",
    purpose: "기본 정형 파싱 + 단가 자동 적용",
  },
  {
    id: "ex2",
    customerId: "cust_eutteum",
    label: "② 별칭 (으뜸반찬)",
    rawText: "콩 1박스\n두부판 2\n양파 1",
    purpose: "별칭 매칭",
  },
  {
    id: "ex3",
    customerId: "cust_neulbom",
    label: "③ 수량 불확실 (늘봄분식)",
    rawText: "어묵 세 박스\n떡국떡 조금\n대파 큰거로",
    purpose: "수량 불확실 → 확정 차단",
  },
  {
    id: "ex4",
    customerId: "cust_garam",
    label: "④ 단가 미등록 (가람식당)",
    rawText: "콩나물 1박스\n양배추 2통",
    purpose: "단가 미등록 0원 + 경고",
  },
  {
    id: "ex5",
    customerId: "cust_happy",
    label: "⑤ 미매칭 (행복마트)",
    rawText: "위생장갑 2박스\n랩 3개",
    purpose: "미매칭 → 확정 차단 / 별칭 등록 유도",
  },
  {
    id: "ex6",
    customerId: "cust_hanbit",
    label: "⑥ 한 줄 다품목 (한빛카페)",
    rawText: "계란 2판, 키친타월 1박스, 식용유 1통",
    purpose: "한 줄 다품목(쉼표) 분리",
  },
  {
    id: "ex7",
    customerId: "cust_eutteum",
    label: "⑦ 정형 다수 (으뜸반찬)",
    rawText: "무 5개\n부추 3단\n깐양파 1\n두부 4판",
    purpose: "합산표 물량 확보",
  },
  {
    id: "ex8",
    customerId: "cust_garam",
    label: "⑧ 비정형 (가람식당)",
    rawText: "두부 세개랑 미나리 5단, 대파도 2단 부탁해요",
    purpose: "비정형 문장 + 수량 불확실 혼합",
  },
  {
    id: "ex9",
    customerId: "cust_neulbom",
    label: "⑨ 별칭+미매칭 (늘봄분식)",
    rawText: "팽이 5봉\n새송이 3팩\n단무지 2개",
    purpose: "별칭 + 미매칭 혼합",
  },
  {
    id: "ex10",
    customerId: "cust_happy",
    label: "⑩ 공산품 정형 (행복마트)",
    rawText: "식탁보 1BOX\n위생장갑 3박스\n키친타월 2박스",
    purpose: "공산품 / 거래명세서 미리보기",
  },
  {
    id: "ex11",
    customerId: "cust_garam",
    label: "⑪ 6줄 채소 발주 (가람식당)",
    rawText: "콩나물 3박스\n두부 4판\n미나리 6단\n대파 2단\n계란 2판\n양배추 1통",
    purpose: "6줄 이상 정형 발주 + 단가 미등록 포함",
  },
  {
    id: "ex12",
    customerId: "cust_eutteum",
    label: "⑫ 7줄 반찬집 발주 (으뜸반찬)",
    rawText: "콩 2박스\n두부판 5\n양파 2\n무 3개\n부추 4단\n팽이 6봉\n새송이 2팩",
    purpose: "별칭 다수 + 긴 거래명세서 확인",
  },
  {
    id: "ex13",
    customerId: "cust_hanbit",
    label: "⑬ 카페+소모품 6줄 (한빛카페)",
    rawText: "계란 3판\n키친타올 2박스\n식용유 2통\n종이컵 1박스\n위생장갑 1박스\n콩나물 1박스",
    purpose: "식자재+소모품 혼합, 일부 단가 미등록 확인",
  },
  {
    id: "ex14",
    customerId: "cust_neulbom",
    label: "⑭ 분식집 긴 발주 10줄 (늘봄분식)",
    rawText:
      "어묵 2박스\n떡국떡 3kg\n대파 4단\n양배추 2통\n콩나물 2박스\n팽이 5봉\n새송이 3팩\n두부 4판\n계란 2판\n식용유 1통",
    purpose: "10줄 장문 발주, 명세서 빈 행 없이 긴 문서 확인",
  },
  {
    id: "ex15",
    customerId: "cust_happy",
    label: "⑮ 마트 혼합 8줄 (행복마트)",
    rawText:
      "위생장갑 4박스\n식탁보 2BOX\n키친타월 3박스\n어묵 1박스\n종이컵 2박스\n식용유 1통\n감자 5kg\n오이 2박스",
    purpose: "공산품+식자재 혼합, 주문 목록/합산표 물량 확보",
  },
  {
    id: "ex16",
    customerId: "cust_garam",
    label: "⑯ 비정형 장문 (가람식당)",
    rawText: "콩 2박스랑 두부 3판, 미나리 4단\n대파도 2단 주세요\n계란 1판\n양배추 큰거 2통",
    purpose: "연결어/군말/모호 표현 혼합",
  },
];

/** 깊은 복사한 초기 데이터 묶음 (UI에서 가변 상태로 사용) */
export function loadSampleData() {
  return {
    company: { ...sampleCompany },
    customers: sampleCustomers.map((c) => ({ ...c })),
    suppliers: samplePurchaseSuppliers.map((s) => ({ ...s })),
    products: sampleProducts.map((p) => ({ ...p, aliases: [...(p.aliases ?? [])] })),
    customerPrices: sampleCustomerPrices.map((cp) => ({ ...cp })),
    orderExamples: sampleOrderExamples.map((e) => ({ ...e })),
  };
}
