import type { SupabaseClient } from "@supabase/supabase-js";
import type { Customer } from "./domain/types";

export interface CustomerFormInput {
  name: string;
  phone?: string;
  address?: string;
  memo?: string;
}

export function normalizeCustomerInput(input: CustomerFormInput): Required<CustomerFormInput> {
  return {
    name: input.name.trim(),
    phone: (input.phone ?? "").trim(),
    address: (input.address ?? "").trim(),
    memo: (input.memo ?? "").trim(),
  };
}

export function validateCustomerInput(input: CustomerFormInput): string | null {
  const clean = normalizeCustomerInput(input);
  if (!clean.name) return "거래처명을 입력해주세요.";
  return null;
}

function nullable(value: string): string | null {
  return value ? value : null;
}

export function toCustomerInsert(companyId: string, input: CustomerFormInput) {
  const clean = normalizeCustomerInput(input);
  return {
    company_id: companyId,
    name: clean.name,
    phone: nullable(clean.phone),
    address: nullable(clean.address),
    memo: nullable(clean.memo),
  };
}

export function toCustomerUpdate(input: CustomerFormInput) {
  const clean = normalizeCustomerInput(input);
  return {
    name: clean.name,
    phone: nullable(clean.phone),
    address: nullable(clean.address),
    memo: nullable(clean.memo),
  };
}

function mapCustomer(row: {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  memo: string | null;
}): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    memo: row.memo ?? undefined,
  };
}

export async function createCustomer(
  db: SupabaseClient,
  companyId: string,
  input: CustomerFormInput,
): Promise<Customer> {
  const error = validateCustomerInput(input);
  if (error) throw new Error(error);
  const res = await db
    .from("ordermoa_customers")
    .insert(toCustomerInsert(companyId, input))
    .select("id,name,phone,address,memo")
    .single();
  if (res.error) throw res.error;
  return mapCustomer(res.data);
}

export async function updateCustomer(
  db: SupabaseClient,
  companyId: string,
  customerId: string,
  input: CustomerFormInput,
): Promise<Customer> {
  const error = validateCustomerInput(input);
  if (error) throw new Error(error);
  const res = await db
    .from("ordermoa_customers")
    .update(toCustomerUpdate(input))
    .eq("company_id", companyId)
    .eq("id", customerId)
    .select("id,name,phone,address,memo")
    .single();
  if (res.error) throw res.error;
  return mapCustomer(res.data);
}

export async function archiveCustomer(
  db: SupabaseClient,
  companyId: string,
  customerId: string,
): Promise<void> {
  const res = await db
    .from("ordermoa_customers")
    .update({ archived_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", customerId);
  if (res.error) throw res.error;
}
