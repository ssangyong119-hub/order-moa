"use client";

// W04 단가 관리 — 거래처 선택 → 품목별 판매단가 표에서 바로 추가/수정.
// 여기서 고치는 건 "현재 단가표"뿐 — 과거 주문의 unit_price 스냅샷은 절대 안 바뀐다(헌장).
import { useMemo, useState } from "react";
import type { Customer, CustomerPrice, Product } from "@/lib/domain/types";
import { buildPriceRows, validatePriceValue } from "@/lib/price-store";
import { formatKRW } from "@/lib/calculations";

interface PriceManagementViewProps {
  customers: Customer[];
  products: Product[];
  prices: CustomerPrice[];
  onSave: (customerId: string, productId: string, price: number) => Promise<void>;
}

export function PriceManagementView({ customers, products, prices, onSave }: PriceManagementViewProps) {
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(
    () => buildPriceRows(products, prices, customerId, query, onlyMissing),
    [products, prices, customerId, query, onlyMissing],
  );
  const allRows = useMemo(
    () => buildPriceRows(products, prices, customerId),
    [products, prices, customerId],
  );
  const missingCount = allRows.filter((r) => r.price === null).length;

  function switchCustomer(id: string) {
    setCustomerId(id);
    setDrafts({});
    setError(null);
  }

  async function save(productId: string) {
    const raw = drafts[productId] ?? "";
    const validation = validatePriceValue(raw);
    if (validation) {
      setError(validation);
      return;
    }
    setBusyId(productId);
    setError(null);
    try {
      await onSave(customerId, productId, Math.round(Number(raw.trim())));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "단가 저장에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card master-page">
      <div className="section-head">
        <div>
          <h2>단가 관리</h2>
          <p>
            거래처마다 다른 판매 단가표입니다. 여기 등록하면 발주 붙여넣기에서 금액이 자동
            완성됩니다. 이미 확정된 주문·명세서 금액은 바뀌지 않습니다.
          </p>
        </div>
      </div>

      <div className="row-actions" style={{ marginBottom: 10 }}>
        <select value={customerId} onChange={(e) => switchCustomer(e.target.value)} style={{ maxWidth: 220 }}>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="품목명, 별칭 검색"
          style={{ maxWidth: 220 }}
        />
        <label className="checkline" style={{ fontSize: ".85rem" }}>
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          <span>미등록만 보기</span>
        </label>
      </div>

      <p className="purchase-counter">
        품목 <strong>{allRows.length}</strong>개 · 단가 등록{" "}
        <strong>{allRows.length - missingCount}</strong>개 ·{" "}
        <span className={missingCount > 0 ? "count-warn" : ""}>
          미등록 <strong>{missingCount}</strong>개
        </span>
      </p>

      {error ? <div className="notice warn" style={{ marginBottom: 8 }}>{error}</div> : null}

      {rows.length === 0 ? (
        <div className="empty-state compact">
          <strong>{onlyMissing ? "미등록 품목이 없습니다." : "표시할 품목이 없습니다."}</strong>
          <p className="muted">
            {onlyMissing ? "이 거래처는 모든 품목에 단가가 있습니다." : "검색어를 바꾸거나 품목을 먼저 등록하세요."}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>품목</th>
                <th>단위</th>
                <th className="num">현재 단가</th>
                <th>새 단가</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.productId}>
                  <td>{row.name}</td>
                  <td className="muted">{row.baseUnit}</td>
                  <td className="num">
                    {row.price === null ? (
                      <span className="badge amber">미등록</span>
                    ) : (
                      <strong>{formatKRW(row.price)}</strong>
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={drafts[row.productId] ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [row.productId]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void save(row.productId);
                        }
                      }}
                      placeholder={row.price === null ? "원 단위 입력" : String(row.price)}
                      style={{ maxWidth: 140 }}
                      aria-label={`${row.name} 새 단가`}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="link"
                      disabled={busyId === row.productId || !(drafts[row.productId] ?? "").trim()}
                      onClick={() => void save(row.productId)}
                    >
                      {busyId === row.productId ? "저장 중…" : "저장"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
