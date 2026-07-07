// 매입처 CRUD (W07) — customer-store 패턴 복제. 테이블: ordermoa_suppliers(0004 적용됨).
// 거래처와 달리 unique(company_id,name)이 있어 보관된 이름 재등록 시 복원을 안내한다.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Supplier } from "./domain/types";

export interface SupplierFormInput {
  name: string;
  phone?: string;
  address?: string;
  memo?: string;
}

export function normalizeSupplierInput(input: SupplierFormInput): Required<SupplierFormInput> {
  return {
    name: input.name.trim(),
    phone: (input.phone ?? "").trim(),
    address: (input.address ?? "").trim(),
    memo: (input.memo ?? "").trim(),
  };
}

export function validateSupplierInput(input: SupplierFormInput): string | null {
  if (!normalizeSupplierInput(input).name) return "매입처명을 입력해주세요.";
  return null;
}

function nullable(value: string): string | null {
  return value ? value : null;
}

export function toSupplierInsert(companyId: string, input: SupplierFormInput) {
  const clean = normalizeSupplierInput(input);
  return {
    company_id: companyId,
    name: clean.name,
    phone: nullable(clean.phone),
    address: nullable(clean.address),
    memo: nullable(clean.memo),
  };
}

export function toSupplierUpdate(input: SupplierFormInput) {
  const clean = normalizeSupplierInput(input);
  return {
    name: clean.name,
    phone: nullable(clean.phone),
    address: nullable(clean.address),
    memo: nullable(clean.memo),
  };
}

/** Supabase unique 충돌(23505)을 사장님이 이해할 문구로 바꾼다. */
export function friendlySupplierError(e: unknown): string {
  if (e && typeof e === "object" && (e as { code?: string }).code === "23505") {
    return "같은 이름의 매입처가 이미 있습니다. 보관된 매입처라면 아래에서 복원해 주세요.";
  }
  if (e instanceof Error && e.message) return e.message;
  return "매입처 저장에 실패했습니다.";
}

function mapSupplier(row: {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  memo: string | null;
}): Supplier {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    memo: row.memo ?? undefined,
  };
}

const SUPPLIER_COLS = "id,name,phone,address,memo";

export async function createSupplier(
  db: SupabaseClient,
  companyId: string,
  input: SupplierFormInput,
): Promise<Supplier> {
  const error = validateSupplierInput(input);
  if (error) throw new Error(error);
  const res = await db
    .from("ordermoa_suppliers")
    .insert(toSupplierInsert(companyId, input))
    .select(SUPPLIER_COLS)
    .single();
  if (res.error) throw res.error;
  return mapSupplier(res.data);
}

export async function updateSupplier(
  db: SupabaseClient,
  companyId: string,
  supplierId: string,
  input: SupplierFormInput,
): Promise<Supplier> {
  const error = validateSupplierInput(input);
  if (error) throw new Error(error);
  const res = await db
    .from("ordermoa_suppliers")
    .update(toSupplierUpdate(input))
    .eq("company_id", companyId)
    .eq("id", supplierId)
    .select(SUPPLIER_COLS)
    .single();
  if (res.error) throw res.error;
  return mapSupplier(res.data);
}

export async function archiveSupplier(
  db: SupabaseClient,
  companyId: string,
  supplierId: string,
): Promise<void> {
  const res = await db
    .from("ordermoa_suppliers")
    .update({ archived_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", supplierId);
  if (res.error) throw res.error;
}

export async function unarchiveSupplier(
  db: SupabaseClient,
  companyId: string,
  supplierId: string,
): Promise<Supplier> {
  const res = await db
    .from("ordermoa_suppliers")
    .update({ archived_at: null })
    .eq("company_id", companyId)
    .eq("id", supplierId)
    .select(SUPPLIER_COLS)
    .single();
  if (res.error) throw res.error;
  return mapSupplier(res.data);
}

export async function listArchivedSuppliers(
  db: SupabaseClient,
  companyId: string,
): Promise<Supplier[]> {
  const res = await db
    .from("ordermoa_suppliers")
    .select(SUPPLIER_COLS)
    .eq("company_id", companyId)
    .not("archived_at", "is", null)
    .order("created_at", { ascending: true });
  if (res.error) throw res.error;
  return (res.data ?? []).map(mapSupplier);
}
