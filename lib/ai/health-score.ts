import OpenAI from "openai";
import { z } from "zod";
import type { CompanyMetrics, TopDebtor } from "@/types";

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
}

const resultSchema = z.object({
  health_score: z.number().int().min(0).max(100),
  churn_risk: z.enum(["low", "medium", "high"]),
  summary: z.string().min(10).max(500),
  recommended_actions: z.array(z.string()).min(1).max(4),
});

const SYSTEM_PROMPT = `You are a financial analyst at Xepelin, a B2B factoring platform in Latin America. Analyze the company data provided and respond with ONLY valid JSON — no markdown, no prose, no code fences.`;

function buildUserPrompt(company: CompanyMetrics, debtors: TopDebtor[]): string {
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
    top_debtors: debtors.map((d) => ({ name: d.name, volume: d.total })).slice(0, 3),
  };

  return `Score this factoring client and return ONLY valid JSON matching exactly this shape:
{
  "health_score": <integer 0-100, higher = healthier>,
  "churn_risk": <"low" | "medium" | "high">,
  "summary": <2-3 sentence assessment in Spanish>,
  "recommended_actions": [<1-4 specific KAM actions in Spanish, e.g. "Llamar esta semana para revisar pipeline">]
}

Scoring guidelines:
- 80-100: active, frequent operations (≤7 days), high SOW (>60%), low credit risk (<30)
- 60-79: good but some gaps (8-14 days last op, medium SOW 30-60%)
- 40-59: moderate risk (15-30 days last op, low SOW <30%, or credit risk 30-60)
- 20-39: high risk (31-60 days last op, or credit risk >60)
- 0-19: critical (>60 days no operations, or status "enrolled" with no activity)

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
        model: "gpt-4o-mini",
        max_tokens: 512,
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const client = new OpenAI({ apiKey });
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
