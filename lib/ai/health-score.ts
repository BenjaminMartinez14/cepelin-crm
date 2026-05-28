import OpenAI from "openai";
import { z } from "zod";
import type { CompanyMetrics, TopDebtor } from "@/types";
import { GESTION_LABELS } from "@/lib/db/gestiones";

// Groq is OpenAI-compatible; we reuse the SDK with a different base URL.

// === COST & LATENCY ESTIMATES ===
// Model: llama-3.3-70b-versatile via Groq
// Cost: ~$0.0005 per company (Groq pricing May 2026)
// 10K companies/month = ~$5/month
// 10K companies/day (cron) = ~$150/month
// P50 latency: ~800ms | P99: ~3s
// Sequential batch of 15: ~15-20s
// Production path: queue with concurrency=10 →
//   10K companies in ~15 min
// Retry: 1 retry on bad JSON, then skip + log
// Timeout: 15s per company

export interface GestionInput {
  type: string;
  contacted_at: string;
  recontact_date: string;
  notes: string | null;
  days_ago: number;
  is_overdue: boolean;
}

export interface HealthScorePayload {
  company: CompanyMetrics;
  topDebtors: TopDebtor[];
  gestiones_summary: GestionInput[];
}

export interface HealthScoreResult {
  health_score: number;
  churn_risk: "low" | "medium" | "high";
  summary: string;
  recommended_actions: string[];
  key_insight: string;
}

const resultSchema = z.object({
  health_score: z.number().int().min(0).max(100),
  churn_risk: z.enum(["low", "medium", "high"]),
  summary: z.string().min(10).max(500),
  recommended_actions: z.array(z.string()).min(1).max(4),
  key_insight: z.string().min(10).max(300),
});

const SYSTEM_PROMPT = `Eres un analista senior de cuentas en Cepelin, una fintech de factoring B2B en Chile y México.

Tu trabajo es evaluar la salud de cada cliente y dar recomendaciones concretas al KAM.

Tienes acceso a:
- Métricas cuantitativas (volumen, SOW, días inactivo)
- Estado del portafolio de facturas (ciclo SII/SAT)
- Actividad de gestión del KAM (llamadas, WhatsApp, emails)
- Contexto cualitativo (sector, noticias, interacciones)

USA CRITERIO, no fórmulas.

Ejemplos de razonamiento que espero:
- Un cliente con 60 días sin operar PERO el KAM tuvo una reunión hace 3 días y el recontacto es en 5 días → NO es churn, es pipeline activo.
- Una empresa constructora sin operar en enero puede ser estacional, no churn.
- Un deudor como Falabella o Walmart reduce el riesgo de una factura significativamente.
- Facturas en acuse_recibo listas para ceder son una OPORTUNIDAD, no una señal negativa.

Responde SOLO con JSON válido, sin texto adicional.`;

function formatGestiones(gestiones: GestionInput[]): string {
  if (!gestiones || gestiones.length === 0) {
    return "Sin gestiones registradas. El KAM no ha registrado interacciones con este cliente.";
  }

  const lines = gestiones.map((g) => {
    const label = GESTION_LABELS[g.type as keyof typeof GESTION_LABELS] ?? g.type;
    const overdueText = g.is_overdue
      ? " ⚠️ RECONTACTO VENCIDO"
      : ` → recontacto: ${g.recontact_date}`;
    const notesText = g.notes ? ` | "${g.notes}"` : "";
    return `- ${label} hace ${g.days_ago} días${overdueText}${notesText}`;
  });

  return lines.join("\n");
}

function buildUserPrompt(payload: HealthScorePayload): string {
  const { company, topDebtors, gestiones_summary } = payload;
  const invoice_portfolio = company.invoice_status_counts ?? {};
  const topDebtorsSimplified = topDebtors.map((d) => ({ name: d.name, volume: d.total })).slice(0, 3);

  const invoiceSummary =
    Object.keys(invoice_portfolio).length > 0
      ? Object.entries(invoice_portfolio)
          .map(([status, cnt]) => `  ${status}: ${cnt}`)
          .join("\n")
      : "  Sin facturas";

  const days_enrolled = company.enrolled_at
    ? Math.floor((Date.now() - new Date(company.enrolled_at).getTime()) / 86400000)
    : null;

  const risk_label =
    (company.credit_risk_score ?? 100) < 30
      ? "bajo"
      : (company.credit_risk_score ?? 100) < 60
        ? "medio"
        : "alto";

  return `Evalúa este cliente de factoring y devuelve JSON.

=== MÉTRICAS ===
Empresa: ${company.name} (${company.country})
Sector: ${company.sector ?? "No especificado"}
Estado: ${company.status} | Antigüedad: ${days_enrolled ?? "N/A"} días
Días sin operación: ${company.days_since_last_op ?? "Sin operaciones"}
Volumen últimos 60 días: ${company.volume_60d}
Share of Wallet Xepelin: ${company.sow_percentage != null ? `${company.sow_percentage}%` : "N/A"}
Score crediticio (${risk_label}): ${company.credit_risk_score ?? "N/A"}/100
Línea utilizada: ${company.credit_used} / ${company.credit_limit}

=== PORTAFOLIO DE FACTURAS ===
${invoiceSummary}
Deudores principales: ${JSON.stringify(topDebtorsSimplified)}

=== GESTIONES DEL KAM ===
${formatGestiones(gestiones_summary)}

=== CONTEXTO CUALITATIVO ===
Última interacción KAM: ${company.interaction_summary ?? "Sin resumen disponible"}
Contexto WhatsApp: ${company.whatsapp_summary ?? "Sin resumen de WhatsApp"}
Noticias/contexto: ${company.news_context ?? "Sin contexto de noticias"}

=== OUTPUT REQUERIDO ===
Devuelve exactamente este JSON:
{
  "health_score": <0-100, tu juicio basado en TODO lo anterior>,
  "churn_risk": <"low"|"medium"|"high">,
  "summary": "<2-3 oraciones en español explicando TU RAZONAMIENTO. Menciona señales específicas, no solo el score>",
  "recommended_actions": [
    "<2-4 acciones concretas para el KAM. Usa verbos de acción. Menciona tipos de gestión: llamar, enviar WhatsApp, registrar reunión. Si hay facturas en acuse_recibo, dilo explícitamente.>"
  ],
  "key_insight": "<LA UNA cosa más importante que el KAM debe saber, que los números solos no revelan>"
}`;
}

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function tryParse(raw: string) {
  try {
    return resultSchema.safeParse(JSON.parse(stripFences(raw)));
  } catch {
    return { success: false as const, error: new Error("JSON.parse failed") };
  }
}

async function callWithTimeout(
  client: OpenAI,
  prompt: string,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await client.chat.completions.create(
      {
        model: "llama-3.3-70b-versatile",
        max_tokens: 1200,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      },
      { signal: controller.signal },
    );

    const choice = response.choices[0];
    if (!choice) throw new Error("Empty response from LLM");
    const text = choice.message.content;
    if (!text) throw new Error("Empty message content from LLM");
    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateHealthScore(
  payload: HealthScorePayload,
): Promise<HealthScoreResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const client = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
  const prompt = buildUserPrompt(payload);

  let raw = await callWithTimeout(client, prompt);
  let parsed = tryParse(raw);

  if (!parsed.success) {
    // One retry on bad JSON/schema
    raw = await callWithTimeout(client, prompt);
    parsed = tryParse(raw);
    if (!parsed.success) {
      const err = parsed.error;
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid LLM response: ${errMsg}`);
    }
  }

  return parsed.data;
}
