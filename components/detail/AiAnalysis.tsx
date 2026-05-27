"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { apiGet, apiPost } from "@/lib/api";
import type { CompanyDetail, CompanyMetrics } from "@/types";

function churnDotClass(risk: "low" | "medium" | "high"): string {
  if (risk === "low") return "bg-emerald-400";
  if (risk === "medium") return "bg-amber-400";
  return "bg-red-400";
}

function churnLabel(risk: "low" | "medium" | "high"): string {
  if (risk === "low") return "Bajo";
  if (risk === "medium") return "Medio";
  return "Alto";
}

function formatAiDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface AiAnalysisProps {
  company: CompanyMetrics;
}

export function AiAnalysis({ company: initialCompany }: AiAnalysisProps) {
  const [company, setCompany] = useState(initialCompany);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      await apiPost<{ processed: number; errors: number }>(
        "/api/health-scores/generate",
        { companyId: company.id },
      );
      // Re-fetch company data to get the updated fields.
      const detail = await apiGet<CompanyDetail>(`/api/companies/${company.id}`);
      setCompany((prev) => ({ ...prev, ...detail.company }));
      toast.success("Análisis IA actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al generar análisis");
    } finally {
      setLoading(false);
    }
  }

  const hasAnalysis =
    company.health_score !== null && company.churn_risk !== null;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Análisis IA
        </h3>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Analizando…
            </>
          ) : hasAnalysis ? (
            "Actualizar"
          ) : (
            "Generar"
          )}
        </button>
      </div>

      {!hasAnalysis ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Sin análisis · Haz clic en &quot;Generar&quot; para obtener el health score con IA.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Score + churn risk */}
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Health Score</p>
              <p className="mt-0.5 text-3xl font-bold tabular-nums text-foreground">
                {company.health_score}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Riesgo de fuga</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${churnDotClass(company.churn_risk!)}`}
                />
                <span className="text-sm font-medium text-foreground">
                  {churnLabel(company.churn_risk!)}
                </span>
              </div>
            </div>
          </div>

          {/* Summary */}
          {company.ai_summary && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              &quot;{company.ai_summary}&quot;
            </p>
          )}

          {/* Recommended actions */}
          {Array.isArray(company.recommended_actions) &&
            company.recommended_actions.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Acciones recomendadas
                </p>
                <ol className="space-y-1.5">
                  {(company.recommended_actions as string[]).map(
                    (action, i) => (
                      <li key={i} className="flex gap-2 text-sm text-foreground">
                        <span className="tabular-nums text-muted-foreground">
                          {i + 1}.
                        </span>
                        {action}
                      </li>
                    ),
                  )}
                </ol>
              </div>
            )}

          {/* Key insight */}
          {company.key_insight && (
            <div className="rounded-md bg-primary/5 border-l-4 border-primary px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
                💡 Insight clave
              </p>
              <p className="text-sm text-foreground">{company.key_insight}</p>
            </div>
          )}

          {/* Timestamp */}
          {company.ai_generated_at && (
            <p className="text-xs text-muted-foreground">
              Actualizado: {formatAiDate(company.ai_generated_at)}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
