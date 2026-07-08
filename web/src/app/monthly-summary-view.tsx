"use client";

// W12 거래처별 월 합계 — 저장된 확정 주문(order.total 스냅샷)만으로 계산하는 조회 화면.
// 세금계산서/회계 기능 아님. 월말 "거래처별 이번 달 얼마 팔았나" 확인용 근거 숫자까지만.
import { useMemo, useState } from "react";
import type { ConfirmedOrder } from "@/lib/order-store";
import { availableMonths, buildMonthlySummary } from "@/lib/monthly-summary";
import { formatKRW } from "@/lib/calculations";
import { downloadCsv } from "@/lib/csv-export";

interface MonthlySummaryViewProps {
  orders: ConfirmedOrder[];
  persisted: boolean; // DB 모드면 true(저장 주문), 데모면 false
}

export function MonthlySummaryView({ orders, persisted }: MonthlySummaryViewProps) {
  const months = useMemo(() => availableMonths(orders), [orders]);
  const [month, setMonth] = useState<string>(months[0] ?? "");

  // 주문이 새로 생겨 최신 달이 바뀌면(선택값이 비어있을 때만) 기본값 보정
  const effectiveMonth = month || months[0] || "";
  const summary = useMemo(
    () => buildMonthlySummary(orders, effectiveMonth),
    [orders, effectiveMonth],
  );

  function exportCsv() {
    downloadCsv(`거래처별월합계_${effectiveMonth}.csv`, [
      ["거래처", "주문 건수", "공급가 합계", "마지막 주문일"],
      ...summary.rows.map((r) => [r.customerName, r.orderCount, r.totalAmount, r.lastOrderDate]),
      ["전체 합계", summary.orderCount, summary.totalAmount, ""],
    ]);
  }

  return (
    <section className="card">
      <h2>거래처별 월 합계</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        저장된 주문 기준입니다. <strong>세금계산서 발행 기능이 아니며</strong>, 월말에 거래처별로 이번
        달 얼마 팔았는지 확인하는 금액입니다. 금액은 확정 당시 단가 그대로입니다.
      </p>

      <div className="row-actions no-print" style={{ marginBottom: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".9rem", fontWeight: 500, margin: 0 }}>
          월 선택
          <input
            type="month"
            value={effectiveMonth}
            onChange={(e) => setMonth(e.target.value)}
            style={{ width: 170 }}
            aria-label="월 선택"
          />
        </label>
        <button onClick={exportCsv} disabled={summary.rows.length === 0}>
          CSV 내보내기
        </button>
        {months.length > 0 && (
          <span className="muted">주문이 있는 달: {months.join(", ")}</span>
        )}
      </div>

      {!persisted && (
        <p className="muted" style={{ marginTop: 0 }}>
          데모 모드 — 지금 세션에 확정한 주문 기준입니다(새로고침 시 초기화).
        </p>
      )}

      {summary.rows.length === 0 ? (
        <div className="empty-state">
          <strong>{effectiveMonth ? `${effectiveMonth}에 저장된 주문이 없습니다.` : "저장된 주문이 없습니다."}</strong>
          <p className="muted">
            {orders.length > 0
              ? "다른 달을 선택해 보세요."
              : "발주를 확정하면 월별 매출이 자동으로 합산됩니다."}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>거래처</th>
                <th className="num">주문 건수</th>
                <th className="num">공급가 합계</th>
                <th>마지막 주문일</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((r) => (
                <tr key={r.customerId}>
                  <td>{r.customerName}</td>
                  <td className="num">{r.orderCount}건</td>
                  <td className="num">
                    <strong>{formatKRW(r.totalAmount)}</strong>
                  </td>
                  <td>{r.lastOrderDate}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="month-total-row">
                <td>
                  전체 합계 <span className="muted">({effectiveMonth})</span>
                </td>
                <td className="num">{summary.orderCount}건</td>
                <td className="num">
                  <strong>{formatKRW(summary.totalAmount)}</strong>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
