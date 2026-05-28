import type { SupabaseClient } from "@supabase/supabase-js";
import type { Gestion, GestionType } from "@/types";

export const RECONTACT_DAYS: Record<GestionType, number> = {
  llamada_realizada: 3,
  whatsapp_enviado: 1,
  email_enviado: 2,
  reunion_agendada: 7,
  cliente_pidio_esperar: 7,
  no_contesto: 1,
};

export const GESTION_LABELS: Record<GestionType, string> = {
  llamada_realizada: "📞 Llamada realizada",
  whatsapp_enviado: "💬 WhatsApp enviado",
  email_enviado: "📧 Email enviado",
  reunion_agendada: "🤝 Reunión agendada",
  cliente_pidio_esperar: "⏸️ Cliente pidió esperar",
  no_contesto: "❌ No contestó",
};

export async function insertGestion(
  supabase: SupabaseClient,
  companyId: string,
  kamId: string,
  type: GestionType,
  recontactDate: string,
  notes?: string,
): Promise<Gestion | null> {
  const { data, error } = await supabase
    .from("gestiones")
    .insert({
      company_id: companyId,
      kam_id: kamId,
      type,
      recontact_date: recontactDate,
      notes: notes ?? null,
    })
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Gestion | null;
}

export async function listGestiones(
  supabase: SupabaseClient,
  companyId: string,
  limit = 10,
): Promise<Gestion[]> {
  const { data, error } = await supabase
    .from("gestiones")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Gestion[];
}
