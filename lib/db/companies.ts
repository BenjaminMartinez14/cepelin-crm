import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CompanyMetrics,
  CompanyDetail,
  Contact,
  InvoicePreview,
  InvoiceStatus,
  InvoiceWithDebtor,
  ManagementStatus,
  Note,
  UrgencyLabel,
} from "@/types";
import { buildMonthlyVolume, topDebtors } from "@/lib/db/invoices";
import { createAdminClient } from "@/lib/supabase/admin";

// All queries run under the caller's session, so RLS scopes results to the KAM.

export function computeUrgencyLabel(c: Omit<CompanyMetrics, "urgency_label">, today: Date): UrgencyLabel {
  const todayStr = today.toISOString().slice(0, 10);
  const counts = c.invoice_status_counts ?? {};

  // 🔴 GESTIONAR HOY
  if (
    (c.next_followup_date !== null && c.next_followup_date <= todayStr) ||
    (counts.protestada ?? 0) > 0 ||
    c.has_reclamada ||
    (counts.cancelada ?? 0) > 0 ||
    (c.churn_risk === "high" && (c.days_since_last_op ?? 999) > 30)
  ) return "gestionar_hoy";

  // 🟡 GESTIONAR ESTA SEMANA
  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(today.getDate() + 7);
  const sevenStr = sevenDaysOut.toISOString().slice(0, 10);
  if (
    (c.next_followup_date !== null && c.next_followup_date > todayStr && c.next_followup_date <= sevenStr) ||
    ((counts.acuse_recibo ?? 0) + (counts.merito_ejecutivo ?? 0) > 0) ||
    (counts.cedida_competencia ?? 0) > 0 ||
    ((c.days_since_last_op ?? 0) >= 15 && (c.days_since_last_op ?? 0) <= 30) ||
    ((c.sow_percentage ?? 100) < 40 && c.days_since_last_op !== null)
  ) return "gestionar_semana";

  // ⚪ SIN ACCIÓN — enrolled, never operated
  if (c.status === "enrolled" && c.days_since_last_op === null) return "sin_accion";

  // 🟢 AL DÍA
  return "al_dia";
}

export async function listCompanies(
  supabase: SupabaseClient,
): Promise<CompanyMetrics[]> {
  const admin = createAdminClient();
  const today = new Date();

  const { data: companies, error: cErr } = await supabase
    .from("company_metrics")
    .select("*");

  if (cErr) throw new Error(cErr.message);

  const companyIds = (companies ?? []).map((c) => c.id as string);

  const { data: rawInvoices, error: iErr } = companyIds.length > 0
    ? await admin
        .from("invoices")
        .select("id, company_id, debtor_id, amount, issued_at, status")
        .in("company_id", companyIds)
        .in("status", [
          "emitida", "entregada_receptor", "acuse_recibo", "merito_ejecutivo",
          "en_cobranza", "cedida_competencia", "reclamada", "protestada",
          "vigente", "cedida_mx", "cancelada",
        ])
        .order("issued_at", { ascending: false })
    : { data: [], error: null };

  if (iErr) throw new Error(iErr.message);

  const debtorIds = Array.from(
    new Set((rawInvoices ?? []).map((r) => r.debtor_id).filter(Boolean)),
  );
  const { data: debtorRows, error: dErr } =
    debtorIds.length > 0
      ? await admin.from("debtors").select("id, name").in("id", debtorIds)
      : { data: [], error: null };
  if (dErr) throw new Error(dErr.message);

  const debtorNameById = new Map(
    (debtorRows ?? []).map((d) => [d.id, d.name as string]),
  );

  const nowMs = Date.now();
  const byCompany = new Map<string, InvoicePreview[]>();
  for (const row of rawInvoices ?? []) {
    const preview: InvoicePreview = {
      id: row.id,
      debtor_name: debtorNameById.get(row.debtor_id) ?? "—",
      amount: Number(row.amount),
      issued_at: row.issued_at,
      days_since_issued: Math.floor(
        (nowMs - new Date(row.issued_at).getTime()) / 86_400_000,
      ),
      status: row.status as InvoiceStatus,
    };
    const list = byCompany.get(row.company_id) ?? [];
    list.push(preview);
    byCompany.set(row.company_id, list);
  }

  const withUrgent = (companies ?? []).map((company) => ({
    ...(company as Omit<CompanyMetrics, "urgency_label">),
    urgent_invoices: byCompany.get(company.id) ?? [],
  }));

  // Sort by urgency priority, then days_since_last_op descending within each tier
  const urgencyOrder: Record<UrgencyLabel, number> = {
    gestionar_hoy: 0,
    gestionar_semana: 1,
    al_dia: 2,
    sin_accion: 3,
  };

  return withUrgent
    .map((c) => ({ ...c, urgency_label: computeUrgencyLabel(c, today) }))
    .sort((a, b) => {
      const diff = urgencyOrder[a.urgency_label] - urgencyOrder[b.urgency_label];
      if (diff !== 0) return diff;
      return (b.days_since_last_op ?? -1) - (a.days_since_last_op ?? -1);
    }) as CompanyMetrics[];
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
  if (!company) return null;

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

  const ACTIVE_STATUSES = new Set<InvoiceStatus>([
    "emitida", "entregada_receptor", "acuse_recibo", "merito_ejecutivo",
    "cedida_xepelin", "cedida_competencia", "en_cobranza",
    "reclamada", "protestada", "vigente", "cedida_mx", "cancelada",
  ]);

  const invoices: InvoiceWithDebtor[] = (invoiceRows ?? []).map((row) => {
    const debtor = row.debtors as { name: string } | { name: string }[] | null;
    const debtorName = Array.isArray(debtor) ? debtor[0]?.name : debtor?.name;
    const status = row.status as InvoiceStatus;
    return {
      id: row.id,
      company_id: row.company_id,
      debtor_id: row.debtor_id,
      amount: Number(row.amount),
      issued_at: row.issued_at,
      status,
      debtor_name: debtorName ?? "—",
      is_active: ACTIVE_STATUSES.has(status),
    };
  });

  const base = company as Omit<CompanyMetrics, "urgency_label">;
  const urgency_label = computeUrgencyLabel(base, new Date());

  return {
    company: { ...base, urgency_label } as CompanyMetrics,
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
  return data !== null;
}

export async function updateManagementStatus(
  supabase: SupabaseClient,
  companyId: string,
  status: ManagementStatus,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("companies")
    .update({ management_status: status, management_updated_at: new Date().toISOString() })
    .eq("id", companyId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data !== null;
}
