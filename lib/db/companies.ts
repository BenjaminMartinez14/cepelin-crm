import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CompanyMetrics,
  CompanyDetail,
  Contact,
  InvoiceWithDebtor,
  Note,
} from "@/types";
import { buildMonthlyVolume, topDebtors } from "@/lib/db/invoices";

// All queries run under the caller's session, so RLS scopes results to the KAM.

export async function listCompanies(
  supabase: SupabaseClient,
): Promise<CompanyMetrics[]> {
  const { data, error } = await supabase
    .from("company_metrics")
    .select("*")
    .order("days_since_last_op", { ascending: false, nullsFirst: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CompanyMetrics[];
}

export async function getCompanyDetail(
  supabase: SupabaseClient,
  companyId: string,
): Promise<CompanyDetail | null> {
  const { data: company, error: companyErr } = await supabase
    .from("company_metrics")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (companyErr) throw new Error(companyErr.message);
  if (!company) return null; // not found or not owned (RLS)

  const [
    { data: contacts, error: cErr },
    { data: invoiceRows, error: iErr },
    { data: notes, error: nErr },
  ] = await Promise.all([
    supabase.from("contacts").select("*").eq("company_id", companyId),
    supabase
      .from("invoices")
      .select("id, company_id, debtor_id, amount, issued_at, status, debtors(name)")
      .eq("company_id", companyId)
      .order("issued_at", { ascending: false }),
    supabase
      .from("notes")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
  ]);

  if (cErr) throw new Error(cErr.message);
  if (iErr) throw new Error(iErr.message);
  if (nErr) throw new Error(nErr.message);

  const invoices: InvoiceWithDebtor[] = (invoiceRows ?? []).map((row) => {
    const debtor = row.debtors as { name: string } | { name: string }[] | null;
    const debtorName = Array.isArray(debtor) ? debtor[0]?.name : debtor?.name;
    return {
      id: row.id,
      company_id: row.company_id,
      debtor_id: row.debtor_id,
      amount: Number(row.amount),
      issued_at: row.issued_at,
      status: row.status,
      debtor_name: debtorName ?? "—",
    };
  });

  return {
    company: company as CompanyMetrics,
    contacts: (contacts ?? []) as Contact[],
    invoices,
    monthly_volume: buildMonthlyVolume(invoices, 6),
    top_debtors: topDebtors(invoices, 3),
    notes: (notes ?? []) as Note[],
  };
}

export async function updateFollowup(
  supabase: SupabaseClient,
  companyId: string,
  date: string | null,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("companies")
    .update({ next_followup_date: date })
    .eq("id", companyId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data !== null; // false when RLS blocked the row (not owned)
}
