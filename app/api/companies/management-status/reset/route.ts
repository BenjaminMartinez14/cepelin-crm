import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedKam } from "@/lib/auth";
import { computeUrgencyLabel } from "@/lib/db/companies";
import type { ApiResponse, CompanyMetrics } from "@/types";

export async function POST(): Promise<NextResponse<ApiResponse<{ updated: number }>>> {
  const supabase = createClient();
  const admin = createAdminClient();

  let kam;
  try {
    kam = await getAuthedKam(supabase);
  } catch {
    return NextResponse.json({ data: null, error: "Error de autenticación" }, { status: 500 });
  }
  if (!kam) {
    return NextResponse.json({ data: null, error: "No autorizado" }, { status: 401 });
  }

  const { data: companies, error } = await supabase
    .from("company_metrics")
    .select("*");
  if (error) {
    return NextResponse.json({ data: null, error: "No se pudieron obtener las empresas" }, { status: 500 });
  }

  const today = new Date();
  const toReset = (companies ?? [])
    .map((c) => c as Omit<CompanyMetrics, "urgency_label">)
    .filter((c) => {
      const urgency = computeUrgencyLabel(c, today);
      return urgency === "gestionar_hoy" || urgency === "gestionar_semana";
    })
    .map((c) => c.id);

  if (toReset.length === 0) {
    return NextResponse.json({ data: { updated: 0 }, error: null });
  }

  const { error: updateErr } = await admin
    .from("companies")
    .update({
      management_status: "por_gestionar",
      management_updated_at: new Date().toISOString(),
    })
    .in("id", toReset);

  if (updateErr) {
    console.error("management-status reset failed:", updateErr.message);
    return NextResponse.json(
      { data: null, error: "No se pudo resetear los estados" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { updated: toReset.length }, error: null });
}
