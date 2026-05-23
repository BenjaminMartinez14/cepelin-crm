import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InvoiceWithDebtor,
  MonthlyVolumePoint,
  TopDebtor,
  Note,
} from "@/types";

const CEPELIN_PROCESSED = ["assigned_cepelin", "in_collection", "collected"];

// Last `months` buckets of Cepelin-processed volume, oldest first, zero-filled.
export function buildMonthlyVolume(
  invoices: InvoiceWithDebtor[],
  months: number,
): MonthlyVolumePoint[] {
  const buckets = new Map<string, number>();
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }

  for (const inv of invoices) {
    if (!CEPELIN_PROCESSED.includes(inv.status)) continue;
    const key = inv.issued_at.slice(0, 7); // YYYY-MM
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + inv.amount);
  }

  return Array.from(buckets, ([month, volume]) => ({ month, volume }));
}

// Top debtors by total invoice volume.
export function topDebtors(invoices: InvoiceWithDebtor[], limit: number): TopDebtor[] {
  const totals = new Map<string, TopDebtor>();
  for (const inv of invoices) {
    const existing = totals.get(inv.debtor_id);
    if (existing) {
      existing.total += inv.amount;
    } else {
      totals.set(inv.debtor_id, {
        debtor_id: inv.debtor_id,
        name: inv.debtor_name,
        total: inv.amount,
      });
    }
  }
  return Array.from(totals.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export async function addNote(
  supabase: SupabaseClient,
  companyId: string,
  kamId: string,
  content: string,
): Promise<Note | null> {
  const { data, error } = await supabase
    .from("notes")
    .insert({ company_id: companyId, kam_id: kamId, content })
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Note) ?? null;
}
