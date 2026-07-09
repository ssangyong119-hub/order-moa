"use client";

// W03 품목·별칭 관리 — supplier-management-view 패턴 + 별칭 칩 + 기본 매입처 드롭다운.
// 별칭은 품목을 먼저 저장한 뒤(수정 모드) 붙인다 — 신규 폼에 별칭까지 넣으면 화면이 복잡해짐.
import { useMemo, useState } from "react";
import type { Product, Supplier } from "@/lib/domain/types";
import {
  validateNewAlias,
  validateProductInput,
  type ProductFormInput,
} from "@/lib/product-store";
import { DEFAULT_PRODUCT_CATEGORY, PRODUCT_CATEGORIES } from "@/lib/product-category";

const EMPTY_FORM: ProductFormInput = {
  name: "",
  baseUnit: "",
  basePurchasePrice: "",
  purchaseSupplierId: "",
  category: DEFAULT_PRODUCT_CATEGORY,
};

interface ProductManagementViewProps {
  products: Product[];
  archivedProducts: Product[];
  suppliers: Supplier[];
  onSave: (id: string | null, input: ProductFormInput) => Promise<void>;
  onArchive: (product: Product) => Promise<void>;
  onUnarchive: (product: Product) => Promise<void>;
  onAddAlias: (product: Product, alias: string) => Promise<void>;
  onRemoveAlias: (product: Product, alias: string) => Promise<void>;
}

export function ProductManagementView({
  products,
  archivedProducts,
  suppliers,
  onSave,
  onArchive,
  onUnarchive,
  onAddAlias,
  onRemoveAlias,
}: ProductManagementViewProps) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormInput>(EMPTY_FORM);
  const [aliasInput, setAliasInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing = editingId ? products.find((p) => p.id === editingId) ?? null : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== "all" && (p.category ?? DEFAULT_PRODUCT_CATEGORY) !== categoryFilter) return false;
      if (!q) return true;
      return [p.name, p.baseUnit, p.category ?? "", p.purchaseSupplierName ?? "", ...(p.aliases ?? [])].some((v) =>
        v.toLowerCase().includes(q),
      );
    });
  }, [products, query, categoryFilter]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setAliasInput("");
    setError(null);
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      baseUnit: product.baseUnit,
      basePurchasePrice: product.basePurchasePrice ?? "",
      purchaseSupplierId: product.purchaseSupplierId ?? "",
      category: product.category ?? DEFAULT_PRODUCT_CATEGORY,
    });
    setAliasInput("");
    setError(null);
  }

  async function submit() {
    const validation = validateProductInput(form);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(editingId, form);
      if (!editingId) startCreate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "품목 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function archive(product: Product) {
    setBusy(true);
    setError(null);
    try {
      await onArchive(product);
      if (editingId === product.id) startCreate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "품목 보관에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function unarchive(product: Product) {
    setBusy(true);
    setError(null);
    try {
      await onUnarchive(product);
    } catch (e) {
      setError(e instanceof Error ? e.message : "품목 복원에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function addAlias() {
    if (!editing) return;
    const validation = validateNewAlias(aliasInput, products, editing.id);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onAddAlias(editing, aliasInput.trim());
      setAliasInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "별칭 추가에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAlias(alias: string) {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await onRemoveAlias(editing, alias);
    } catch (e) {
      setError(e instanceof Error ? e.message : "별칭 삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card master-page">
      <div className="section-head">
        <div>
          <h2>품목·별칭 관리</h2>
          <p>
            품목과 현장 별칭(예: &lsquo;숙주박스&rsquo; → 세척숙주)을 관리합니다. 별칭이 많을수록
            발주 붙여넣기가 잘 매칭됩니다.
          </p>
        </div>
        <button type="button" className="secondary" onClick={startCreate} disabled={busy}>
          새 품목
        </button>
      </div>

      <div className="master-grid">
        <div className="master-list">
          <label>
            검색
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="품목명, 별칭, 단위, 매입처, 카테고리 검색"
            />
          </label>
          <label>
            카테고리
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">전체 카테고리</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <div className="customer-list">
            {filtered.map((p) => (
              <button
                type="button"
                key={p.id}
                className={editingId === p.id ? "customer-row selected" : "customer-row"}
                onClick={() => startEdit(p)}
              >
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.category ?? DEFAULT_PRODUCT_CATEGORY} · {p.baseUnit} · {p.purchaseSupplierName || "매입처 미지정"}
                    {(p.aliases ?? []).length > 0 ? ` · 별칭 ${(p.aliases ?? []).length}개` : ""}
                  </small>
                </span>
              </button>
            ))}
            {filtered.length === 0 ? <p className="muted">검색 결과가 없습니다.</p> : null}
          </div>
          {archivedProducts.length > 0 ? (
            <div className="archived-list">
              <p className="muted" style={{ margin: "10px 0 4px" }}>
                보관된 품목 — 복원하면 파싱·검색에 다시 나타납니다.
              </p>
              {archivedProducts.map((p) => (
                <div className="archived-row" key={p.id}>
                  <span>
                    <strong>{p.name}</strong> <small className="muted">보관됨</small>
                  </span>
                  <button type="button" className="link" disabled={busy} onClick={() => void unarchive(p)}>
                    복원
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="master-form">
          <h3>{editing ? "품목 수정" : "새 품목 추가"}</h3>
          <div className="form-grid">
            <label>
              품목명
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="예: 콩나물"
              />
            </label>
            <label>
              기본 단위
              <input
                value={form.baseUnit}
                onChange={(e) => setForm((p) => ({ ...p, baseUnit: e.target.value }))}
                placeholder="예: 박스, 판, 망"
              />
            </label>
            <label>
              카테고리
              <select
                value={form.category ?? DEFAULT_PRODUCT_CATEGORY}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              기준 매입단가 (선택)
              <input
                type="number"
                min={0}
                value={form.basePurchasePrice ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, basePurchasePrice: e.target.value }))}
                placeholder="예상 마진 참고용"
              />
            </label>
            <label>
              기본 매입처
              <select
                value={form.purchaseSupplierId ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, purchaseSupplierId: e.target.value }))}
              >
                <option value="">매입처 미지정</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {editing ? (
            <div className="alias-box">
              <h4>별칭 ({(editing.aliases ?? []).length}개)</h4>
              <p className="muted" style={{ margin: "0 0 8px" }}>
                발주 문장에 이 단어가 오면 {editing.name}(으)로 매칭됩니다.
              </p>
              <div className="alias-chips">
                {(editing.aliases ?? []).map((a) => (
                  <span className="alias-chip" key={a}>
                    {a}
                    <button
                      type="button"
                      aria-label={`${a} 별칭 삭제`}
                      disabled={busy}
                      onClick={() => void removeAlias(a)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {(editing.aliases ?? []).length === 0 ? (
                  <span className="muted">등록된 별칭이 없습니다.</span>
                ) : null}
              </div>
              <div className="row-actions" style={{ marginTop: 8 }}>
                <input
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addAlias();
                    }
                  }}
                  placeholder="예: 숙주박스"
                  style={{ maxWidth: 220 }}
                />
                <button type="button" disabled={busy} onClick={() => void addAlias()}>
                  별칭 추가
                </button>
              </div>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 10 }}>
              별칭은 품목을 저장한 뒤 이 화면에서 붙일 수 있습니다.
            </p>
          )}

          {error ? <div className="notice warn">{error}</div> : null}
          <div className="actions-row">
            <button type="button" onClick={submit} disabled={busy}>
              {busy ? "저장 중..." : editing ? "수정 저장" : "품목 추가"}
            </button>
            {editing ? (
              <button type="button" className="ghost danger" disabled={busy} onClick={() => void archive(editing)}>
                보관
              </button>
            ) : null}
          </div>
          {editing ? (
            <p className="muted" style={{ marginTop: 8 }}>
              보관하면 파싱·검색에서 빠지지만, 이미 확정된 주문과 명세서는 그대로 남습니다.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
