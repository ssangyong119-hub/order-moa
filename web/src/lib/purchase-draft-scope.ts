// 합산표의 임시 매입처 지정·문장 편집은 선택한 거래처와 날짜에만 유효하다.
export function purchaseDraftScopeKey(customerId: string, orderDate: string): string {
  return `${customerId}\u0000${orderDate}`;
}
