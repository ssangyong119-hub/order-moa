"use client";

// W07 매입처 관리 — customer-management-view 패턴 복제(이름/메모만) + 보관 목록/복원.
// 마지막 매입처 보관 가드는 없음: 매입처 0개여도 품목이 "매입처 미지정"으로 흘러가 앱이 동작한다.
import { useMemo, useState } from "react";
import type { Supplier } from "@/lib/domain/types";
import {
  normalizeSupplierInput,
  validateSupplierInput,
  type SupplierFormInput,
} from "@/lib/supplier-store";

const EMPTY_FORM: SupplierFormInput = { name: "", memo: "" };

interface SupplierManagementViewProps {
  suppliers: Supplier[];
  archivedSuppliers: Supplier[];
  onSave: (id: string | null, input: SupplierFormInput) => Promise<void>;
  onArchive: (supplier: Supplier) => Promise<void>;
  onUnarchive: (supplier: Supplier) => Promise<void>;
}

export function SupplierManagementView({
  suppliers,
  archivedSuppliers,
  onSave,
  onArchive,
  onUnarchive,
}: SupplierManagementViewProps) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierFormInput>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      [s.name, s.memo].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [suppliers, query]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function startEdit(supplier: Supplier) {
    setEditingId(supplier.id);
    setForm({ name: supplier.name, memo: supplier.memo ?? "" });
    setError(null);
  }

  async function submit() {
    const validation = validateSupplierInput(form);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(editingId, normalizeSupplierInput(form));
      startCreate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "매입처 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function archive(supplier: Supplier) {
    setBusy(true);
    setError(null);
    try {
      await onArchive(supplier);
      if (editingId === supplier.id) startCreate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "매입처 보관에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function unarchive(supplier: Supplier) {
    setBusy(true);
    setError(null);
    try {
      await onUnarchive(supplier);
    } catch (e) {
      setError(e instanceof Error ? e.message : "매입처 복원에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card master-page">
      <div className="section-head">
        <div>
          <h2>매입처 관리</h2>
          <p>
            물건을 사 오는 매입처를 추가하고 메모를 정리합니다. 품목별 매입처 지정은
            품목·별칭 관리에서 합니다.
          </p>
        </div>
        <button type="button" className="secondary" onClick={startCreate} disabled={busy}>
          새 매입처
        </button>
      </div>

      <div className="master-grid">
        <div className="master-list">
          <label>
            검색
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="매입처명, 메모 검색"
            />
          </label>
          <div className="customer-list">
            {filtered.map((s) => (
              <button
                type="button"
                key={s.id}
                className={editingId === s.id ? "customer-row selected" : "customer-row"}
                onClick={() => startEdit(s)}
              >
                <span>
                  <strong>{s.name}</strong>
                  <small>{s.memo || "메모 없음"}</small>
                </span>
              </button>
            ))}
            {filtered.length === 0 ? <p className="muted">검색 결과가 없습니다.</p> : null}
          </div>
          {archivedSuppliers.length > 0 ? (
            <div className="archived-list">
              <p className="muted" style={{ margin: "10px 0 4px" }}>
                보관된 매입처 — 복원하면 다시 목록에 나타납니다.
              </p>
              {archivedSuppliers.map((s) => (
                <div className="archived-row" key={s.id}>
                  <span>
                    <strong>{s.name}</strong> <small className="muted">보관됨</small>
                  </span>
                  <button type="button" className="link" disabled={busy} onClick={() => void unarchive(s)}>
                    복원
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="master-form">
          <h3>{editingId ? "매입처 수정" : "새 매입처 추가"}</h3>
          <div className="form-grid">
            <label className="span-2">
              매입처명
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="예: 야채매입처"
              />
            </label>
            <label className="span-2">
              메모
              <textarea
                value={form.memo ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
                placeholder="발주 방법(카톡/문자), 배송 요일 등"
              />
            </label>
          </div>
          {error ? <div className="notice warn">{error}</div> : null}
          <div className="actions-row">
            <button type="button" onClick={submit} disabled={busy}>
              {busy ? "저장 중..." : editingId ? "수정 저장" : "매입처 추가"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="ghost danger"
                disabled={busy}
                onClick={() => {
                  const supplier = suppliers.find((s) => s.id === editingId);
                  if (supplier) void archive(supplier);
                }}
              >
                보관
              </button>
            ) : null}
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            보관해도 이 매입처를 쓰는 품목은 그대로 남고, 발주 문장에는 이름이 유지됩니다.
          </p>
        </div>
      </div>
    </section>
  );
}
