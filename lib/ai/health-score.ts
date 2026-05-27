import OpenAI from "openai";
import { z } from "zod";
import type { CompanyMetrics, TopDebtor } from "@/types";

// Groq is OpenAI-compatible; we reuse the SDK with a different base URL.

// Cost estimate at scale:
// gpt-4o-mini: ~$0.001 per company analysis
// 10K companies/month ≈ $10/month
// Latency: ~1-2s per company
// Batch of 15 companies: ~20-30s total

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

const SYSTEM_PROMPT = `You are a senior credit analyst and KAM advisor at Xepelin, a B2B factoring fintech operating in Chile and Mexico. Your job is to make JUDGMENT CALLS about client health that go beyond what statistics alone can tell.

You have access to quantitative signals (volume, SOW, days inactive), qualitative signals (interaction history, recent news, WhatsApp context, sector), and invoice portfolio details (SII/CFDI states, debtor quality).

Use ALL of this information. A company with 90 days inactive might be seasonal (construction sector in winter). A company with high volume but reclamada invoices is a risk. A debtor like Falabella is safer than an unknown SME.

Respond with ONLY valid JSON — no markdown, no prose, no code fences.`;

function buildUserPrompt(company: CompanyMetrics, debtors: TopDebtor[]): string {
  const invoice_portfolio = company.invoice_status_counts ?? {};
  const topDebtorsSimplified = debtors.map((d) => ({ name: d.name, volume: d.total })).slice(0, 3);

  const payload = {
    name: company.name,
    country: company.country,
    status: company.status,
    days_since_last_op: company.days_since_last_op,
    volume_60d: company.volume_60d,
    credit_limit: company.credit_limit,
    credit_used: company.credit_used,
    sow_percentage: company.sow_percentage,
    credit_risk_score: company.credit_risk_score,
    sector: company.sector,
    interaction_summary: company.interaction_summary,
    news_context: company.news_context,
    whatsapp_summary: company.whatsapp_summary,
    invoice_portfolio,
    top_debtors: topDebtorsSimplified,
  };

  const invoicePortfolioStr =
    Object.keys(invoice_portfolio).length > 0
      ? JSON.stringify(invoice_portfolio, null, 2)
      : "No invoices";

  return `Make a judgment call on this client.

QUANTITATIVE:
- Status: ${company.status}, Days since enrolled: computed from enrolled_at vs now
- Days since last operation: ${company.days_since_last_op ?? "No operations"}
- Volume last 60 days: ${company.volume_60d}
- SOW with Xepelin: ${company.sow_percentage ?? "N/A"}%
- Credit risk score (DICOM/Buró): ${company.credit_risk_score ?? "N/A"}/100
- Credit used: ${company.credit_used} / ${company.credit_limit}

INVOICE PORTFOLIO (SII/CFDI states):
${invoicePortfolioStr}
Top debtors: ${JSON.stringify(topDebtorsSimplified)}

QUALITATIVE CONTEXT:
- Sector: ${company.sector ?? "No especificado"}
- Last KAM interactions: ${company.interaction_summary ?? "Sin resumen disponible"}
- Recent news: ${company.news_context ?? "Sin contexto de noticias"}
- WhatsApp context: ${company.whatsapp_summary ?? "Sin resumen de WhatsApp"}

Return ONLY valid JSON matching exactly this shape:
{
  "health_score": <integer 0-100, higher = healthier>,
  "churn_risk": <"low" | "medium" | "high">,
  "summary": "<2-3 sentences in Spanish explaining your REASONING, not just the score. Reference specific qualitative signals.>",
  "recommended_actions": ["<2-4 specific actions for the KAM. Be concrete: mention debtor names, invoice amounts, SII states.>"],
  "key_insight": "<The ONE thing the KAM must know about this client that the numbers alone would not reveal. In Spanish.>"
}

Scoring guidelines:
- 80-100: active, frequent operations (≤7 days), high SOW (>60%), low credit risk (<30)
- 60-79: good but some gaps (8-14 days, medium SOW 30-60%)
- 40-59: moderate risk (15-30 days, low SOW <30%, or credit risk 30-60)
- 20-39: high risk (31-60 days, or credit risk >60)
- 0-19: critical (>60 days no operations, or enrolled with no activity)

churn_risk rule: low if health_score ≥ 70, medium if 40-69, high if < 40.

Company data:
${JSON.stringify(payload)}`;
}

function tryParse(raw: string) {
  try {
    return resultSchema.safeParse(JSON.parse(raw));
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
        max_tokens: 600,
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
  company: CompanyMetrics,
  topDebtors: TopDebtor[],
): Promise<HealthScoreResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const client = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
  const prompt = buildUserPrompt(company, topDebtors);

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
