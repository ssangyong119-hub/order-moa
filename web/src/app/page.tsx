"use client";

// 오더모아 단위 6 데모 — 샘플 데이터 기반 핵심 흐름.
// 클라이언트 메모리 상태만 사용(새로고침 시 초기화). Supabase/DB/로그인/PDF 없음.
import { useMemo, useState } from "react";
import type { Customer, CustomerPrice, Product } from "@/lib/domain/types";
import {
  canConfirm,
  canRegisterAlias,
  confirmBlockReason,
  extractNameCandidate,
  parseOrderText,
  type ParsedLine,
} from "@/lib/order-parser";
import {
  estimatedLineMargin,
  estimatedOrderMargin,
  formatKRW,
  formatMargin,
  lineAmount,
  sumAmounts,
} from "@/lib/calculations";
import { loadSampleData, type SampleOrderExample } from "@/lib/sample-data";
import {
  buildAggregateRows,
  buildContributionText,
  formatPurchaseOrderText,
} from "@/lib/aggregate";

type View = "dashboard" | "paste" | "review" | "aggregate" | "orders" | "note";

interface OrderLine {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  basePurchasePrice: number | null;
}
interface ConfirmedOrder {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  lines: OrderLine[];
  total: number;
  margin: number | null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function HomePage() {
  const [data, setData] = useState<ReturnType<typeof loadSampleData> | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerPrices, setCustomerPrices] = useState<CustomerPrice[]>([]);
  const [examples, setExamples] = useState<SampleOrderExample[]>([]);

  const [view, setView] = useState<View>("dashboard");
  const [message, setMessage] = useState<string>("");

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [rawText, setRawText] = useState<string>("");
  const [lines, setLines] = useState<ParsedLine[]>([]);

  const [orders, setOrders] = useState<ConfirmedOrder[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [aggCustomer, setAggCustomer] = useState<string>("all");
  const [aggDate, setAggDate] = useState<string>(""); // "" = 전체 날짜

  function flash(text: string) {
    setMessage(text);
  }

  function handleLoadSample() {
    const loaded = loadSampleData();
    setData(loaded);
    setProducts(loaded.products);
    setCustomers(loaded.customers);
    setCustomerPrices(loaded.customerPrices);
    setExamples(loaded.orderExamples);
    setSelectedCustomerId(loaded.customers[0]?.id ?? "");
    setOrders([]);
    setView("dashboard");
    flash("샘플 데이터를 불러왔습니다. (가명·테스트용)");
  }

  // ---- 파싱 ----
  function handleParse() {
    if (!selectedCustomerId || rawText.trim() === "") return;
    const parsed = parseOrderText(rawText, selectedCustomerId, products, customerPrices);
    setLines(parsed);
    setView("review");
    flash("");
  }

  function pickExample(id: string) {
    const ex = examples.find((e) => e.id === id);
    if (!ex) return;
    setSelectedCustomerId(ex.customerId);
    setRawText(ex.rawText);
  }

  // ---- 라인 편집 ----
  function updateLine(id: string, patch: Partial<ParsedLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function statusFor(productId: string | null, quantity: number | null): ParsedLine["status"] {
    if (!productId) return "unmatched";
    if (quantity === null || quantity <= 0) return "qty_uncertain";
    return "matched";
  }
  function assignProduct(line: ParsedLine, productId: string) {
    if (!productId) {
      updateLine(line.id, {
        productId: null,
        productName: line.rawText,
        status: "unmatched",
        unitPrice: 0,
        priceRegistered: false,
      });
      return;
    }
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const saved = customerPrices.find(
      (cp) => cp.customerId === selectedCustomerId && cp.productId === productId,
    );
    updateLine(line.id, {
      productId,
      productName: product.name,
      unit: line.unit || product.baseUnit,
      unitPrice: saved ? saved.price : 0,
      priceRegistered: Boolean(saved),
      status: statusFor(productId, line.quantity),
    });
  }
  function setQty(line: ParsedLine, value: string) {
    const q = value === "" ? null : Number(value);
    updateLine(line.id, { quantity: q, status: statusFor(line.productId, q) });
  }
  function setPrice(line: ParsedLine, value: string) {
    const p = value === "" ? 0 : Number(value);
    updateLine(line.id, { unitPrice: p < 0 ? 0 : p });
  }
  function savePrice(line: ParsedLine) {
    if (!line.productId) return;
    const pid = line.productId;
    setCustomerPrices((prev) => [
      ...prev.filter((cp) => !(cp.customerId === selectedCustomerId && cp.productId === pid)),
      { customerId: selectedCustomerId, productId: pid, price: line.unitPrice },
    ]);
    updateLine(line.id, { priceRegistered: true });
    flash(`${line.productName} 단가를 저장했습니다(다음 주문부터 자동 적용).`);
  }
  function registerAlias(line: ParsedLine) {
    if (!line.productId) return;
    const pid = line.productId;
    const token = extractNameCandidate(line.rawText);
    if (!token) return;
    const product = products.find((p) => p.id === pid);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === pid && !(p.aliases ?? []).includes(token)
          ? { ...p, aliases: [...(p.aliases ?? []), token] }
          : p,
      ),
    );
    updateLine(line.id, { aliasRegistered: true });
    flash(`'${token}' 을(를) ${product ? product.name : "선택 품목"} 별칭으로 등록했습니다. 다음부터 자동 매칭됩니다.`);
  }

  function confirmOrder() {
    if (!canConfirm(lines)) return;
    const customer = customers.find((c) => c.id === selectedCustomerId);
    const olines: OrderLine[] = lines.map((l) => {
      const product = products.find((p) => p.id === l.productId);
      const qty = l.quantity as number;
      return {
        productId: l.productId as string,
        productName: l.productName,
        quantity: qty,
        unit: l.unit,
        unitPrice: l.unitPrice,
        amount: lineAmount(qty, l.unitPrice),
        basePurchasePrice: product?.basePurchasePrice ?? null,
      };
    });
    const total = sumAmounts(olines.map((o) => o.amount));
    const margin = estimatedOrderMargin(olines);
    const order: ConfirmedOrder = {
      id: `order_${orders.length + 1}`,
      date: today(),
      customerId: selectedCustomerId,
      customerName: customer ? customer.name : "거래처",
      lines: olines,
      total,
      margin,
    };
    setOrders((prev) => [...prev, order]);
    setLines([]);
    setRawText("");
    setCurrentOrderId(order.id);
    setView("orders");
    flash("주문이 확정되었습니다.");
  }

  // ---- 합산표 (매입처 발주용) ----
  const aggregate = useMemo(() => {
    const filtered = orders.filter(
      (o) =>
        (aggCustomer === "all" || o.customerId === aggCustomer) &&
        (aggDate === "" || o.date === aggDate),
    );
    return buildAggregateRows(filtered, products);
  }, [orders, aggCustomer, aggDate, products]);

  // 복사용 발주 문장 (현재 필터 기준)
  const purchaseTitle = useMemo(() => {
    if (aggDate === today()) return "오늘 발주 합산";
    if (aggDate !== "") return `${aggDate} 발주 합산`;
    return "발주 합산";
  }, [aggDate]);
  const purchaseText = useMemo(
    () => formatPurchaseOrderText(aggregate, purchaseTitle),
    [aggregate, purchaseTitle],
  );

  async function copyPurchaseText() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(purchaseText);
        flash("발주 문장을 복사했습니다. 매입처에 붙여넣어 보내세요.");
        return;
      }
      throw new Error("clipboard unavailable");
    } catch {
      const el = document.getElementById("purchase-text") as HTMLTextAreaElement | null;
      if (el) {
        el.focus();
        el.select();
      }
      flash("자동 복사가 안 돼요. 아래 칸이 선택되었으니 길게 눌러(또는 Ctrl+C) 복사하세요.");
    }
  }

  function exportCsv() {
    const rows = [
      ["품목", "단위", "총수량", "거래처수"],
      ...aggregate.map((a) => [a.name, a.unit, String(a.qty), String(a.custCount)]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "품목별합산표.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  // ===== 렌더 =====
  if (!data) {
    return (
      <main className="app">
        <div className="topbar">
          <h1>오더모아</h1>
          <span className="company">데모</span>
        </div>
        <div className="card">
          <h2>샘플 데이터로 먼저 흐름을 확인해보세요</h2>
          <p className="muted">
            카톡/문자 발주를 붙여넣으면 품목별 합산표와 거래명세서가 나옵니다. 아래 버튼으로 가명
            샘플(거래처·품목·별칭·단가·발주 예시)을 불러옵니다. 개인정보/실거래처명은 없습니다.
          </p>
          <button className="primary big" onClick={handleLoadSample}>
            샘플 데이터 불러오기
          </button>
        </div>
      </main>
    );
  }

  const currentOrder = orders.find((o) => o.id === currentOrderId) ?? null;

  return (
    <main className="app">
      <div className="topbar no-print">
        <h1>오더모아</h1>
        <span className="company">데모 회사: {data.company.name}</span>
      </div>

      <nav className="nav no-print">
        <button className={view === "dashboard" ? "primary" : ""} onClick={() => setView("dashboard")}>
          대시보드
        </button>
        <button className={view === "paste" ? "primary" : ""} onClick={() => setView("paste")}>
          발주 붙여넣기
        </button>
        <button className={view === "aggregate" ? "primary" : ""} onClick={() => setView("aggregate")}>
          품목별 합산표
        </button>
        <button className={view === "orders" ? "primary" : ""} onClick={() => setView("orders")}>
          주문 목록
        </button>
      </nav>

      {message && (
        <p className="notice no-print" role="status">
          {message}
        </p>
      )}

      {view === "dashboard" && (
        <section>
          <div className="card">
            <h2>오늘 할 일</h2>
            <button className="primary big" onClick={() => setView("paste")} style={{ marginBottom: 10 }}>
              발주 붙여넣기
            </button>
            <div className="summary-grid">
              <div className="card" style={{ margin: 0 }}>
                <div className="muted">확정 주문</div>
                <div className="stat">{orders.length}건</div>
              </div>
              <div className="card" style={{ margin: 0 }}>
                <div className="muted">합산 품목 종류</div>
                <div className="stat">{aggregate.length}종</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="row-actions">
              <button onClick={() => setView("aggregate")}>품목별 합산표 보기</button>
              <button onClick={() => setView("orders")}>주문 목록 보기</button>
            </div>
          </div>
        </section>
      )}

      {view === "paste" && (
        <section className="card">
          <h2>발주 붙여넣기</h2>
          <label>거래처 선택</label>
          <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <label>샘플 발주 예시 (선택)</label>
          <select value="" onChange={(e) => pickExample(e.target.value)}>
            <option value="">예시 선택…</option>
            {examples.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.label}
              </option>
            ))}
          </select>

          <label>발주 원문</label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={"콩나물 2박스\n두부 3판\n미나리 5단"}
          />
          <p className="muted">
            붙여넣은 원문은 확인을 위해 보관됩니다. 원문엔 연락처 등 민감정보가 있을 수 있고, 언제든
            삭제할 수 있으며 삭제해도 저장된 주문은 유지됩니다.
          </p>
          <div className="row-actions">
            <button className="primary" onClick={handleParse} disabled={!selectedCustomerId || rawText.trim() === ""}>
              파싱
            </button>
            <button onClick={() => setRawText("")}>원문 지우기</button>
          </div>
        </section>
      )}

      {view === "review" && (
        <ReviewView
          lines={lines}
          products={products}
          customerName={customers.find((c) => c.id === selectedCustomerId)?.name ?? ""}
          onAssign={assignProduct}
          onQty={setQty}
          onPrice={setPrice}
          onSavePrice={savePrice}
          onRegisterAlias={registerAlias}
          onUnit={(line, v) => updateLine(line.id, { unit: v })}
          onConfirm={confirmOrder}
          onBack={() => setView("paste")}
        />
      )}

      {view === "aggregate" && (
        <section className="card">
          <h2>품목별 합산표</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            여러 거래처 발주를 품목별로 합쳤습니다 — <strong>매입처에 보낼 총 발주 수량</strong>입니다.
          </p>
          <div className="row-actions no-print" style={{ marginBottom: 8 }}>
            <select value={aggCustomer} onChange={(e) => setAggCustomer(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="all">전체 거래처</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={aggDate}
              onChange={(e) => setAggDate(e.target.value)}
              style={{ maxWidth: 170 }}
              aria-label="날짜 필터"
            />
            <button onClick={() => setAggDate(today())}>오늘</button>
            <button onClick={() => setAggDate("")} disabled={aggDate === ""}>
              전체 날짜
            </button>
            <button onClick={exportCsv} disabled={aggregate.length === 0}>
              CSV 내보내기
            </button>
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            {aggDate === "" ? "전체 날짜" : aggDate} ·{" "}
            {aggCustomer === "all" ? "전체 거래처" : customers.find((c) => c.id === aggCustomer)?.name}
          </p>
          {aggregate.length === 0 ? (
            <p className="muted">대상 주문이 없습니다. 발주를 붙여넣고 확정해보세요.</p>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>품목</th>
                      <th>단위</th>
                      <th className="num">총수량</th>
                      <th>거래처별 내역</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregate.map((a) => (
                      <tr key={a.productId}>
                        <td>{a.name}</td>
                        <td>{a.unit}</td>
                        <td className="num">
                          <strong>
                            {a.qty}
                            {a.unit}
                          </strong>
                        </td>
                        <td className="muted" style={{ fontSize: "0.85rem" }}>
                          {buildContributionText(a)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ borderTop: "1px solid var(--line)", marginTop: 16, paddingTop: 14 }}>
                <h3 style={{ marginTop: 0 }}>매입처에 보낼 발주 문장</h3>
                <p className="muted" style={{ marginTop: 0 }}>
                  아래 내용을 복사해 매입처에 그대로 보내세요.
                </p>
                <textarea
                  id="purchase-text"
                  readOnly
                  value={purchaseText}
                  rows={Math.min(aggregate.length + 2, 12)}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <div className="row-actions no-print" style={{ marginTop: 8 }}>
                  <button className="primary" onClick={copyPurchaseText}>
                    발주 문장 복사
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {view === "orders" && (
        <section className="card">
          <h2>주문 목록</h2>
          {orders.length === 0 ? (
            <p className="muted">확정된 주문이 없습니다.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>거래처</th>
                    <th>품목 요약</th>
                    <th className="num">금액</th>
                    <th className="num">예상 마진</th>
                    <th>명세서</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>{o.date}</td>
                      <td>{o.customerName}</td>
                      <td>{summarizeItems(o.lines)}</td>
                      <td className="num">{formatKRW(o.total)}</td>
                      <td className="num">{formatMargin(o.margin)}</td>
                      <td>
                        <button
                          className="link"
                          onClick={() => {
                            setCurrentOrderId(o.id);
                            setView("note");
                          }}
                        >
                          보기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {view === "note" && currentOrder && (
        <section>
          <div className="row-actions no-print" style={{ marginBottom: 10 }}>
            <button onClick={() => setView("orders")}>← 주문 목록</button>
            <button className="primary" onClick={() => window.print()}>
              인쇄
            </button>
            <span className="muted">인쇄/출력은 PC를 권장합니다.</span>
          </div>
          <DeliveryNote order={currentOrder} company={data.company} />
        </section>
      )}
    </main>
  );
}

function summarizeItems(lines: OrderLine[]): string {
  if (lines.length === 0) return "-";
  const names = lines.map((l) => l.productName);
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} 외 ${names.length - 2}건`;
}

function badgeFor(line: ParsedLine) {
  if (line.status === "unmatched") return <span className="badge err">미매칭</span>;
  if (line.status === "qty_uncertain") return <span className="badge warn">수량 확인</span>;
  return <span className="badge ok">정상</span>;
}

function ReviewView(props: {
  lines: ParsedLine[];
  products: Product[];
  customerName: string;
  onAssign: (line: ParsedLine, productId: string) => void;
  onQty: (line: ParsedLine, value: string) => void;
  onPrice: (line: ParsedLine, value: string) => void;
  onUnit: (line: ParsedLine, value: string) => void;
  onSavePrice: (line: ParsedLine) => void;
  onRegisterAlias: (line: ParsedLine) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const { lines, products, customerName } = props;
  const blockReason = confirmBlockReason(lines);
  const confirmable = canConfirm(lines);
  const orderMargin = estimatedOrderMargin(
    lines
      .filter((l) => l.productId && l.quantity)
      .map((l) => {
        const product = products.find((p) => p.id === l.productId);
        return {
          unitPrice: l.unitPrice,
          basePurchasePrice: product?.basePurchasePrice ?? null,
          quantity: l.quantity as number,
        };
      }),
  );
  const total = sumAmounts(
    lines.filter((l) => l.quantity).map((l) => lineAmount(l.quantity as number, l.unitPrice)),
  );

  return (
    <section className="card">
      <h2>파싱 결과 확인 · {customerName}</h2>
      <p className="muted">
        품목/수량/단위/단가를 직접 고칠 수 있습니다. 미매칭(빨강)·수량 확인(노랑)이 남으면 확정할 수
        없습니다.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>원문</th>
              <th>품목</th>
              <th className="num">수량</th>
              <th>단위</th>
              <th className="num">단가</th>
              <th className="num">금액</th>
              <th className="num">예상 마진</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const product = products.find((p) => p.id === line.productId);
              const amount = line.quantity ? lineAmount(line.quantity, line.unitPrice) : 0;
              const margin =
                line.quantity != null
                  ? estimatedLineMargin(line.unitPrice, product?.basePurchasePrice, line.quantity)
                  : null;
              return (
                <tr key={line.id}>
                  <td>{line.rawText}</td>
                  <td>
                    <select value={line.productId ?? ""} onChange={(e) => props.onAssign(line, e.target.value)}>
                      <option value="">(미지정)</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {canRegisterAlias(line) && (
                      <button className="link" onClick={() => props.onRegisterAlias(line)}>
                        별칭 등록
                      </button>
                    )}
                    {line.aliasRegistered && <span className="muted"> 별칭 등록됨</span>}
                  </td>
                  <td className="num">
                    <input
                      className="qty"
                      type="number"
                      min={0}
                      value={line.quantity ?? ""}
                      placeholder="?"
                      onChange={(e) => props.onQty(line, e.target.value)}
                    />
                  </td>
                  <td>
                    <input value={line.unit} onChange={(e) => props.onUnit(line, e.target.value)} />
                  </td>
                  <td className="num">
                    <input
                      className="price"
                      type="number"
                      min={0}
                      value={line.unitPrice}
                      onChange={(e) => props.onPrice(line, e.target.value)}
                    />
                    {line.productId && line.unitPrice === 0 && (
                      <div>
                        <span className="badge amber">단가 미등록</span>
                      </div>
                    )}
                    {line.productId && (
                      <button className="link" onClick={() => props.onSavePrice(line)}>
                        이 단가 저장
                      </button>
                    )}
                  </td>
                  <td className="num">{formatKRW(amount)}</td>
                  <td className="num">{formatMargin(margin)}</td>
                  <td>{badgeFor(line)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12 }}>
        <div>
          공급가 합계: <strong>{formatKRW(total)}</strong> <span className="muted">(VAT 없음)</span>
        </div>
        <div className="muted">예상 마진(참고): {formatMargin(orderMargin)}</div>
      </div>

      {!confirmable && blockReason && (
        <p className="notice" style={{ marginTop: 10 }}>
          {blockReason}
        </p>
      )}
      <div className="row-actions" style={{ marginTop: 10 }}>
        <button onClick={props.onBack}>← 다시 붙여넣기</button>
        <button className="primary" onClick={props.onConfirm} disabled={!confirmable}>
          주문 확정
        </button>
      </div>
    </section>
  );
}

function DeliveryNote(props: {
  order: ConfirmedOrder;
  company: { name: string; businessNumber: string; phone: string; address: string };
}) {
  const { order, company } = props;
  return (
    <div className="note-doc print-area">
      <div className="note-head">
        <div className="note-block">
          <div>
            <b>공급자</b> {company.name}
          </div>
          <div>
            <b>사업자</b> {company.businessNumber || "-"}
          </div>
          <div>
            <b>연락처</b> {company.phone || "-"}
          </div>
        </div>
        <div className="note-title">거래명세서</div>
        <div className="note-block">
          <div>
            <b>거래처</b> {order.customerName}
          </div>
          <div>
            <b>일자</b> {order.date}
          </div>
          <div>
            <b>번호</b> -
          </div>
        </div>
      </div>

      <p className="note-hanja">합계금액(공급가): {formatKRW(order.total)} (VAT 미적용)</p>

      <div className="table-wrap">
        <table className="note-table">
          <thead>
            <tr>
              <th>No</th>
              <th>품목</th>
              <th>규격/단위</th>
              <th className="num">수량</th>
              <th className="num">단가</th>
              <th className="num">공급가액</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l, i) => (
              <tr key={`${order.id}_${i}`}>
                <td>{i + 1}</td>
                <td>{l.productName}</td>
                <td>{l.unit}</td>
                <td className="num">{l.quantity}</td>
                <td className="num">{l.unitPrice.toLocaleString("ko-KR")}</td>
                <td className="num">{l.amount.toLocaleString("ko-KR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="note-total">
        공급가 합계 {formatKRW(order.total)} · 부가세 없음(1차)
      </div>
    </div>
  );
}
