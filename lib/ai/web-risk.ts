import type { Country } from "@/types";

export interface WebRiskStreamOptions {
  company: { name: string; country: Country; tax_id: string };
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

function buildPrompt(name: string, tax_id: string, country: Country): string {
  if (country === "CL") {
    return `Investiga la empresa "${name}" con RUT ${tax_id} en Chile.
Busca: (1) registros legales — demandas judiciales, protestos, deudas morosas, DICOM, quiebras, embargos.
(2) noticias recientes — dificultades financieras, fraude, cambios de gestión, escándalos.
Responde en español con dos secciones claramente separadas:
## Registros Legales
## Noticias Recientes
Si no encuentras información relevante en alguna sección, indícalo explícitamente.`;
  }
  return `Investiga la empresa "${name}" con RFC ${tax_id} en México.
Busca: (1) registros legales — demandas, Buró de Crédito, deudas, concurso mercantil, embargos, SAT.
(2) noticias recientes — dificultades financieras, fraude, cambios de gestión, escándalos.
Responde en español con dos secciones claramente separadas:
## Registros Legales
## Noticias Recientes
Si no encuentras información relevante en alguna sección, indícalo explícitamente.`;
}

// Uses raw fetch — Edge runtime compatible, no Node.js SDK needed.
export async function streamWebRiskAnalysis(
  opts: WebRiskStreamOptions,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const { company, onChunk, signal } = opts;
  const prompt = buildPrompt(company.name, company.tax_id, company.country);

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
    let msg = `xAI error ${res.status}`;
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
