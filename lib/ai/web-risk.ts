import OpenAI from "openai";
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

// Returns the full accumulated text when streaming is complete.
// Calls onChunk for each text delta as it arrives.
// Throws on OpenAI error or abort.
export async function streamWebRiskAnalysis(
  opts: WebRiskStreamOptions,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const client = new OpenAI({ apiKey });
  const { company, onChunk, signal } = opts;

  const prompt = buildPrompt(company.name, company.tax_id, company.country);

  const stream = await client.responses.create(
    {
      model: "gpt-4o-mini-search-preview",
      tools: [{ type: "web_search_preview" }],
      input: prompt,
      stream: true,
    },
    { signal },
  );

  let accumulated = "";
  for await (const chunk of stream) {
    if (chunk.type === "response.output_text.delta") {
      onChunk(chunk.delta);
      accumulated += chunk.delta;
    }
  }
  return accumulated;
}
