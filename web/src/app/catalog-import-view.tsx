"use client";

// W21 — 실 카탈로그 초안 JSON을 업로드해 미리보기·검수하고, 선택분만 반영하는 화면.
// 순수 로직은 @/lib/catalog-import. 여기선 파일 업로드/필터/페이지네이션/행 편집/선택 상태만.
// 원칙: 출고단가(repSalePrice)는 참고 표시만 — 저장하지 않는다(기본 판매단가는 Phase 3).
import { useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/domain/types";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/product-category";
import {
  buildImportRows,
  summarizeImport,
  validateCatalogDraft,
  type CatalogApplyResult,
  type ImportEdit,
  type ImportRow,
} from "@/lib/catalog-import";

const PAGE_SIZE = 50;

interface Props {
  existingProducts: Product[];
  persisted: boolean;
  onApply: (result: CatalogApplyResult) => void;
}

export function CatalogImportView({ existingProducts, persisted, onApply }: Props) {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Map<string, ImportEdit>>(new Map());
  const [catFilter, setCatFilter] = useState<string>("all");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [matchFilter, setMatchFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const existingIdByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of existingProducts) if (!m.has(p.name)) m.set(p.name, p.id);
    return m;
  }, [existingProducts]);

  async function onFile(file: File) {
    setFileError(null);
    try {
      const parsed = JSON.parse(await file.text());
      const res = validateCatalogDraft(parsed);
      if (!res.ok) {
        setFileError(res.error);
        setRows(null);
        return;
      }
      const existingNames = new Set(existingProducts.map((p) => p.name));
      setRows(buildImportRows(res.items, existingNames));
      setSelected(new Set());
      setEdits(new Map());
      setPage(0);
    } catch {
      setFileError("JSON 파일을 읽지 못했습니다. 카탈로그 초안 JSON이 맞는지 확인해주세요.");
      setRows(null);
    }
  }

  const editOf = (id: string): ImportEdit => edits.get(id) ?? {};
  function setEdit(id: string, patch: Partial<ImportEdit>) {
    setEdits((prev) => new Map(prev).set(id, { ...(prev.get(id) ?? {}), ...patch }));
  }
  const finalName = (r: ImportRow) => (editOf(r.id).name ?? r.name).trim();
  const finalCategory = (r: ImportRow) => editOf(r.id).category ?? r.category;
  const finalUnit = (r: ImportRow) => editOf(r.id).unit ?? r.unit;
  const finalPrice = (r: ImportRow) => {
    const e = editOf(r.id);
    return e.purchasePrice !== undefined ? e.purchasePrice : r.repPurchasePrice;
  };

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (catFilter !== "all" && r.category !== catFilter) return false;
      if (reviewOnly && !r.needsReview) return false;
      if (matchFilter !== "all" && r.match !== matchFilter) return false;
      if (q && !`${r.name} ${r.spec ?? ""} ${r.code ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, catFilter, reviewOnly, matchFilter, query]);

  const summary = useMemo(() => (rows ? summarizeImport(rows, selected) : null), [rows, selected]);

  // 선택된 행들의 '최종 이름' 중복(파서 후보확인 폭증 방지) — 반영 차단.
  const dupSelectedNames = useMemo(() => {
    if (!rows) return [];
    const count = new Map<string, number>();
    for (const r of rows) if (selected.has(r.id)) count.set(finalName(r), (count.get(finalName(r)) ?? 0) + 1);
    return [...count.entries()].filter(([, c]) => c > 1).map(([n]) => n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, selected, edits]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function selectFilteredNew() {
    // 필터 결과 중 신규(기존일치 아님)만 선택 — 중복명은 검토가 필요해 제외.
    setSelected((prev) => {
      const n = new Set(prev);
      for (const r of filtered) if (r.match === "new" && !r.dupInDraft) n.add(r.id);
      return n;
    });
  }
  function clearSelection() {
    setSelected(new Set());
  }

  function apply() {
    if (!rows || selected.size === 0 || dupSelectedNames.length > 0) return;
    const inserts: CatalogApplyResult["inserts"] = [];
    const updates: CatalogApplyResult["updates"] = [];
    for (const r of rows) {
      if (!selected.has(r.id)) continue;
      const cat = finalCategory(r);
      const price = finalPrice(r);
      if (r.match === "existing") {
        const pid = existingIdByName.get(r.name);
        if (pid) updates.push({ productId: pid, category: cat, basePurchasePrice: price, sourceCode: r.code });
      } else {
        inserts.push({
          name: finalName(r),
          baseUnit: (finalUnit(r) ?? "").trim() || "개",
          category: cat,
          basePurchasePrice: price,
          sourceCode: r.code,
          aliases: r.aliasCandidates,
        });
      }
    }
    onApply({ inserts, updates });
    // 반영한 행은 선택 해제(중복 반영 방지)
    setSelected(new Set());
  }

  const badge = (r: ImportRow) => {
    const parts: string[] = [];
    if (r.match === "existing") parts.push("기존일치");
    else parts.push("신규");
    if (r.dupInDraft) parts.push("중복명");
    if (r.needsReview) parts.push("검토");
    return parts.join(" · ");
  };

  return (
    <section className="card">
      <h2>카탈로그 가져오기 (검수 후 반영)</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        실제 엑셀에서 뽑은 품목 초안(JSON)을 올려 <strong>검수</strong>한 뒤, 고른 품목만 기준정보로 반영합니다.
        {" "}출고단가는 참고만 하고 저장하지 않습니다(기본 판매단가는 이후 단계). 매입단가만 기준 매입단가로 들어갑니다.
      </p>

      <div className="row-actions" style={{ marginBottom: 8 }}>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
        {rows && (
          <button type="button" className="ghost" onClick={() => { setRows(null); setSelected(new Set()); setEdits(new Map()); if (fileRef.current) fileRef.current.value = ""; }}>
            다시 올리기
          </button>
        )}
      </div>
      {fileError && <div className="notice warn">{fileError}</div>}

      {!rows && (
        <p className="muted">
          `docs/order-moa-catalog-real-draft.json` 같은 초안 파일을 선택하세요. 파일은 브라우저에서만 읽고 서버로 보내지 않습니다.
        </p>
      )}

      {rows && summary && (
        <>
          <div className="import-summary" style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "6px 0", fontSize: ".92rem" }}>
            <span>전체 <strong>{summary.total}</strong></span>
            <span>선택 <strong>{summary.selected}</strong></span>
            <span>검토필요 <strong>{summary.needsReview}</strong></span>
            <span>신규 <strong>{summary.newCount}</strong></span>
            <span>기존일치 <strong>{summary.existing}</strong></span>
          </div>

          <div className="row-actions" style={{ flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(0); }} aria-label="카테고리 필터">
              <option value="all">전체 카테고리</option>
              {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={matchFilter} onChange={(e) => { setMatchFilter(e.target.value); setPage(0); }} aria-label="상태 필터">
              <option value="all">전체</option>
              <option value="new">신규만</option>
              <option value="existing">기존일치만</option>
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 4, margin: 0, fontWeight: 400 }}>
              <input type="checkbox" checked={reviewOnly} onChange={(e) => { setReviewOnly(e.target.checked); setPage(0); }} />
              검토필요만
            </label>
            <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="품목명·규격·코드 검색" style={{ maxWidth: 200 }} />
            <button type="button" onClick={selectFilteredNew}>필터 결과 신규 전체 선택</button>
            <button type="button" className="ghost" onClick={clearSelection}>선택 해제</button>
          </div>

          {dupSelectedNames.length > 0 && (
            <div className="notice warn">
              같은 이름으로 선택된 품목이 있습니다: <strong>{dupSelectedNames.join(", ")}</strong>. 규격을 붙여 이름을 구분하거나(예: 콩나물(시루)) 하나만 남겨주세요. (같은 이름 여러 개는 발주 매칭을 어지럽힙니다.)
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>품목명</th>
                  <th>규격</th>
                  <th>단위</th>
                  <th>카테고리</th>
                  <th className="num">매입단가</th>
                  <th className="num">출고단가(참고)</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className={selected.has(r.id) ? "selected" : undefined}>
                    <td><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`${r.name} 선택`} /></td>
                    <td>
                      <input value={editOf(r.id).name ?? r.name} onChange={(e) => setEdit(r.id, { name: e.target.value })} style={{ minWidth: 120 }} />
                    </td>
                    <td className="muted">{r.spec ?? "-"}</td>
                    <td>
                      <input value={finalUnit(r) ?? ""} onChange={(e) => setEdit(r.id, { unit: e.target.value })} placeholder="단위" style={{ width: 64 }} />
                    </td>
                    <td>
                      <select value={finalCategory(r)} onChange={(e) => setEdit(r.id, { category: e.target.value as ProductCategory })}>
                        {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="num">
                      <input type="number" min={0} value={finalPrice(r) ?? ""} onChange={(e) => setEdit(r.id, { purchasePrice: e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value))) })} style={{ width: 84 }} />
                    </td>
                    <td className="num muted">{r.repSalePrice ?? "-"}</td>
                    <td><small className="muted">{badge(r)}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row-actions" style={{ justifyContent: "space-between", marginTop: 8 }}>
            <div className="row-actions" style={{ gap: 6 }}>
              <button type="button" className="ghost" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>이전</button>
              <span className="muted" style={{ fontSize: ".9rem" }}>{page + 1} / {pageCount} · {filtered.length}건</span>
              <button type="button" className="ghost" disabled={page >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>다음</button>
            </div>
            <button type="button" onClick={apply} disabled={summary.selected === 0 || dupSelectedNames.length > 0}>
              선택 {summary.selected}건 {persisted ? "DB에 반영" : "반영 (데모)"}
            </button>
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            {persisted
              ? "선택한 품목만 DB에 저장됩니다(같은 코드는 재import해도 새로 만들지 않고 갱신). 출고단가는 저장하지 않고 매입단가·카테고리만 들어갑니다. 공유 DB 부하가 있으니 처음엔 소량으로 확인하세요."
              : "데모 모드 — 반영해도 새로고침 시 초기화됩니다. 실제 DB 반영은 로그인 상태에서만 지원됩니다."}
          </p>
        </>
      )}
    </section>
  );
}
