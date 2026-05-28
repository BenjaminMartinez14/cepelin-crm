import type { CompanyMetrics, InvoicePreview } from "@/types";

export interface WebRiskStreamOptions {
  company: CompanyMetrics;
  invoices?: InvoicePreview[];
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(amount);
}

function formatMXN(amount: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(amount);
}

function formatAmount(amount: number, country: CompanyMetrics["country"]): string {
  return country === "CL" ? formatCLP(amount) : formatMXN(amount);
}

function buildStatusSummary(counts: Record<string, number> | null, country: CompanyMetrics["country"]): string {
  if (!counts) return "  Sin datos de facturas.";
  const labelsCL: Record<string, string> = {
    emitida: "Emitida",
    aceptada_sii: "Aceptada SII",
    entregada_receptor: "Entregada al receptor",
    acuse_recibo: "Acuse de recibo",
    reclamada: "Reclamada",
    merito_ejecutivo: "Mérito ejecutivo",
    cedida_xepelin: "Cedida a Xepelin",
    cedida_competencia: "Cedida a competencia",
    en_cobranza: "En cobranza",
    cobrada: "Cobrada",
    protestada: "Protestada",
  };
  const labelsMX: Record<string, string> = {
    vigente: "Vigente",
    cancelada: "Cancelada",
    cedida_mx: "Cedida",
  };
  const labels = country === "CL" ? labelsCL : labelsMX;
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `  - ${labels[k] ?? k}: ${n}`)
    .join("\n");
}

function buildInvoiceLines(invoices: InvoicePreview[], country: CompanyMetrics["country"]): string {
  if (!invoices.length) return "  Sin facturas urgentes registradas.";
  return invoices
    .slice(0, 8)
    .map((inv) => `  - ${formatAmount(inv.amount, country)} | ${inv.debtor_name} | ${inv.status} | emitida hace ${inv.days_since_issued} días`)
    .join("\n");
}

function buildPrompt(company: CompanyMetrics, invoices: InvoicePreview[]): string {
  const { name, tax_id, country } = company;
  const taxLabel = country === "CL" ? "RUT" : "RFC";
  const churnMap: Record<string, string> = { low: "bajo", medium: "medio", high: "alto" };
  const churnText = company.churn_risk ? churnMap[company.churn_risk] : "no evaluado";
  const statusMap: Record<string, string> = { enrolled: "incorporada", active: "activa", recurring: "recurrente" };
  const statusText = statusMap[company.status] ?? company.status;

  const internalBlock = `
**Datos internos de Cepelin para "${name}" (${taxLabel}: ${tax_id})**

Relación comercial:
  - Estado de cliente: ${statusText}
  - Volumen facturado últimos 60 días: ${formatAmount(company.volume_60d, country)}
  - Días desde última operación: ${company.days_since_last_op ?? "sin datos"}
  - Share of wallet estimado: ${company.sow_percentage !== null ? `${Math.round(company.sow_percentage)}%` : "sin datos"}
  - Sector: ${company.sector ?? "no especificado"}

Indicadores de riesgo:
  - Score de salud (0-100): ${company.health_score ?? "no generado"}
  - Riesgo de churn: ${churnText}
  - Score crediticio ${country === "CL" ? "DICOM" : "Buró de Crédito"}: ${company.credit_risk_score ?? "sin datos"}

Facturas por estado:
${buildStatusSummary(company.invoice_status_counts, country)}

Facturas urgentes o recientes:
${buildInvoiceLines(invoices, country)}
${company.key_insight ? `\nInsight AI más reciente:\n  "${company.key_insight}"` : ""}
${company.interaction_summary ? `\nResumen de interacciones KAM:\n  "${company.interaction_summary}"` : ""}
${company.whatsapp_summary ? `\nContexto WhatsApp:\n  "${company.whatsapp_summary}"` : ""}
`.trim();

  if (country === "CL") {
    return `Eres un analista de riesgo crediticio senior de Cepelin, empresa de factoring chilena.

${internalBlock}

Con base en estos datos internos, genera un análisis de riesgo estructurado. Responde en español con exactamente estas tres secciones:

## Análisis del Portfolio Interno
Interpreta los datos de Cepelin: ¿qué dicen los estados de factura, el score de salud, el volumen y el churn risk sobre la situación actual de esta empresa? Identifica patrones de alerta o señales positivas.

## Contexto de Riesgo Externo (conocimiento general)
Basándote en tu conocimiento de empresas chilenas del sector indicado, menciona los factores de riesgo macroeconómico, sectorial o regulatorio (SII, DICOM, protestos, concurso de acreedores) que podrían ser relevantes para este tipo de cliente. No inventes datos específicos de esta empresa.

## Recomendaciones para el KAM
Lista 3 a 5 acciones concretas y priorizadas que el ejecutivo de cuenta debería tomar esta semana basándose en los datos internos.`;
  }

  return `Eres un analista de riesgo crediticio senior de Cepelin, empresa de factoring.

${internalBlock}

Con base en estos datos internos, genera un análisis de riesgo estructurado. Responde en español con exactamente estas tres secciones:

## Análisis del Portfolio Interno
Interpreta los datos de Cepelin: ¿qué dicen los estados de factura, el score de salud, el volumen y el churn risk sobre la situación actual de esta empresa? Identifica patrones de alerta o señales positivas.

## Contexto de Riesgo Externo (conocimiento general)
Basándote en tu conocimiento de empresas mexicanas del sector indicado, menciona los factores de riesgo macroeconómico, sectorial o regulatorio (SAT, Buró de Crédito, concurso mercantil) que podrían ser relevantes para este tipo de cliente. No inventes datos específicos de esta empresa.

## Recomendaciones para el KAM
Lista 3 a 5 acciones concretas y priorizadas que el ejecutivo de cuenta debería tomar esta semana basándose en los datos internos.`;
}

// Uses raw fetch — Edge runtime compatible, no Node.js SDK needed.
export async function streamWebRiskAnalysis(
  opts: WebRiskStreamOptions,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const { company, invoices = [], onChunk, signal } = opts;
  const prompt = buildPrompt(company, invoices);

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    const body = await res.text();
    let msg = `Groq error ${res.status}`;
    try {
      msg = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const chunk = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) {
          onChunk(text);
          accumulated += text;
        }
      } catch {
        // malformed SSE line — skip
      }
    }
  }

  return accumulated;
}
