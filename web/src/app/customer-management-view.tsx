"use client";

import { useMemo, useState } from "react";
import type { Customer } from "@/lib/domain/types";
import {
  normalizeCustomerInput,
  validateCustomerInput,
  type CustomerFormInput,
} from "@/lib/customer-store";

const EMPTY_FORM: CustomerFormInput = { name: "", phone: "", address: "", memo: "" };

interface CustomerManagementViewProps {
  customers: Customer[];
  activeCustomerId: string;
  onSave: (id: string | null, input: CustomerFormInput) => Promise<void>;
  onArchive: (customer: Customer) => Promise<void>;
}

export function CustomerManagementView({
  customers,
  activeCustomerId,
  onSave,
  onArchive,
}: CustomerManagementViewProps) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerFormInput>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.phone, c.address, c.memo].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [customers, query]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function startEdit(customer: Customer) {
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      memo: customer.memo ?? "",
    });
    setError(null);
  }

  async function submit() {
    const validation = validateCustomerInput(form);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(editingId, normalizeCustomerInput(form));
      startCreate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "거래처 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function archive(customer: Customer) {
    if (customer.id === activeCustomerId && customers.length <= 1) {
      setError("마지막 거래처는 보관할 수 없습니다.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onArchive(customer);
      if (editingId === customer.id) startCreate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "거래처 보관에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card master-page">
      <div className="section-head">
        <div>
          <h2>거래처 관리</h2>
          <p>발주를 보내는 거래처를 추가하고 연락처, 주소, 메모를 정리합니다.</p>
        </div>
        <button type="button" className="secondary" onClick={startCreate} disabled={busy}>
          새 거래처
        </button>
      </div>

      <div className="master-grid">
        <div className="master-list">
          <label>
            검색
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="거래처명, 연락처, 메모 검색"
            />
          </label>
          <div className="customer-list">
            {filtered.map((c) => (
              <button
                type="button"
                key={c.id}
                className={editingId === c.id ? "customer-row selected" : "customer-row"}
                onClick={() => startEdit(c)}
              >
                <span>
                  <strong>{c.name}</strong>
                  <small>{c.memo || c.phone || "메모 없음"}</small>
                </span>
                {c.id === activeCustomerId ? <em>선택 중</em> : null}
              </button>
            ))}
            {filtered.length === 0 ? <p className="muted">검색 결과가 없습니다.</p> : null}
          </div>
        </div>

        <div className="master-form">
          <h3>{editingId ? "거래처 수정" : "새 거래처 추가"}</h3>
          <div className="form-grid">
            <label>
              거래처명
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="예: 히든식품"
              />
            </label>
            <label>
              연락처
              <input
                value={form.phone ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="선택"
              />
            </label>
            <label className="span-2">
              주소
              <input
                value={form.address ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="선택"
              />
            </label>
            <label className="span-2">
              메모
              <textarea
                value={form.memo ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
                placeholder="배송 시간, 특이사항 등"
              />
            </label>
          </div>
          {error ? <div className="notice warn">{error}</div> : null}
          <div className="actions-row">
            <button type="button" onClick={submit} disabled={busy}>
              {busy ? "저장 중..." : editingId ? "수정 저장" : "거래처 추가"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="ghost danger"
                disabled={busy}
                onClick={() => {
                  const customer = customers.find((c) => c.id === editingId);
                  if (customer) void archive(customer);
                }}
              >
                보관
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
