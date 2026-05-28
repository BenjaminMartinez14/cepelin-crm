import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthedKam } from "@/lib/auth";
import { generateHealthScore } from "@/lib/ai/health-score";
import type { ApiResponse, CompanyMetrics, TopDebtor } from "@/types";

export const maxDuration = 30;

interface GenerateBody {
  companyId: string;
}

interface GenerateResult {
  processed: number;
  errors: number;
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<GenerateResult>>> {
  const supabase = createClient();

  let kam;
  try {
    kam = await getAuthedKam(supabase);
  } catch {
    return NextResponse.json({ data: null, error: "Error de autenticación" }, { status: 500 });
  }
  if (!kam) {
    return NextResponse.json({ data: null, error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as GenerateBody;
  const { companyId } = body;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!companyId || !UUID_RE.test(companyId)) {
    return NextResponse.json({ data: null, error: "companyId requerido" }, { status: 400 });
  }

  const { data: companies, error: fetchErr } = await supabase
    .from("company_metrics")
    .select("*")
    .eq("id", companyId);
  if (fetchErr) {
    console.error("company_metrics fetch failed:", fetchErr.message);
    return NextResponse.json(
      { data: null, error: "No se pudieron obtener las empresas" },
      { status: 500 },
    );
  }

  let processed = 0;
  let errors = 0;

  // Sequential — no Promise.all to avoid Haiku rate limits.
  for (const company of (companies ?? []) as CompanyMetrics[]) {
    try {
      // Fetch top 3 debtors for this company from invoices.
      const { data: invoiceRows } = await supabase
        .from("invoices")
        .select("debtor_id, amount, debtors(name)")
        .eq("company_id", company.id)
        .in("status", ["cedida_xepelin", "en_cobranza", "cobrada"]);

      const debtorMap = new Map<string, { name: string; total: number }>();
      for (const row of invoiceRows ?? []) {
        const debtorArr = row.debtors as { name: string } | { name: string }[] | null;
        const name = Array.isArray(debtorArr) ? debtorArr[0]?.name : debtorArr?.name;
        if (!name) continue;
        const entry = debtorMap.get(row.debtor_id) ?? { name, total: 0 };
        entry.total += Number(row.amount);
        debtorMap.set(row.debtor_id, entry);
      }
      const topDebtors: TopDebtor[] = Array.from(debtorMap.entries())
        .map(([debtor_id, { name, total }]) => ({ debtor_id, name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      const result = await generateHealthScore(company, topDebtors);

      const { error: updateErr } = await supabase
        .from("companies")
        .update({
          health_score: result.health_score,
          churn_risk: result.churn_risk,
          ai_summary: result.summary,
          recommended_actions: result.recommended_actions,
          ai_generated_at: new Date().toISOString(),
          key_insight: result.key_insight ?? null,
        })
        .eq("id", company.id);

      if (updateErr) {
        console.error(`Update failed for ${company.name}:`, updateErr.message);
        errors++;
      } else {
        processed++;
      }
    } catch (err) {
      console.error(`Score failed for ${company.name}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ data: { processed, errors }, error: null });
}
