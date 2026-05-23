# Web Risk Analysis — Design Spec

**Goal:** Add a "Analizar en web" button to the company detail page that searches the web for legal/judicial records and recent news about the company, streams the result in a modal, and auto-saves it as a note.

**Architecture:** Streaming SSE route + OpenAI Responses API (`web_search_preview` tool) + notes table persistence. No new DB columns.

**Tech Stack:** Next.js 14 App Router, OpenAI SDK v6 (Responses API), Supabase, shadcn/ui Dialog, ReadableStream SSE.

---

## 1. Data

No schema changes. Results are saved as rows in the existing `notes` table with a special prefix so the UI can distinguish them:

```
content:    "[Análisis Web] 2026-05-23\n\n## Registros Legales\n...\n\n## Noticias Recientes\n..."
kam_id:     authenticated KAM's id
company_id: target company's id
created_at: auto (default now())
```

The `NotesSection` component detects the `[Análisis Web]` prefix and renders a `🔍 Web` badge instead of the normal note icon. All other notes behaviour (ordering, display) is unchanged.

---

## 2. Search prompt

The service builds a single prompt with country-specific legal terms:

**Chile (CL):**
```
Investiga la empresa "[name]" con RUT [tax_id] en Chile.
Busca: (1) registros legales — demandas judiciales, protestos, deudas morosas, DICOM, quiebras, embargos.
(2) noticias recientes — dificultades financieras, fraude, cambios de gestión, escándalos.
Responde en español con dos secciones claramente separadas:
## Registros Legales
## Noticias Recientes
Si no encuentras información relevante en alguna sección, indícalo explícitamente.
```

**Mexico (MX):**
```
Investiga la empresa "[name]" con RFC [tax_id] en México.
Busca: (1) registros legales — demandas, Buró de Crédito, deudas, concurso mercantil, embargos, SAT.
(2) noticias recientes — dificultades financieras, fraude, cambios de gestión, escándalos.
Responde en español con dos secciones claramente separadas:
## Registros Legales
## Noticias Recientes
Si no encuentras información relevante en alguna sección, indícalo explícitamente.
```

---

## 3. Streaming API route

**`POST /api/companies/[id]/web-risk`**

- Auth-gated via `getAuthedKam()` — 401 if not authenticated.
- Validates `id` is a UUID — 400 if invalid.
- Fetches the company from `company_metrics` view (RLS-scoped) — 404 if not found or not owned by this KAM.
- Calls OpenAI Responses API with `web_search_preview` tool, model `gpt-4o-mini-search-preview`, streaming enabled.
- Returns a `text/event-stream` SSE response with these event types:
  - `{ type: "delta", text: "..." }` — partial text chunk
  - `{ type: "done", noteId: "uuid" }` — search complete, note saved
  - `{ type: "error", message: "..." }` — something went wrong
- After the stream completes, inserts the full text as a note row and sends the `done` event with the new note's id.
- `maxDuration = 60` export (respected on Pro; on Hobby the streaming connection keeps alive longer than a regular function).

---

## 4. Service layer

**`lib/ai/web-risk.ts`**

```typescript
export interface WebRiskStreamOptions {
  company: { name: string; country: Country; tax_id: string };
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

export async function streamWebRiskAnalysis(opts: WebRiskStreamOptions): Promise<string>
// Returns the full accumulated text when done.
// Calls onChunk for each streaming delta.
// Throws on OpenAI error or abort.
```

Uses `client.responses.create({ model: "gpt-4o-mini-search-preview", tools: [{ type: "web_search_preview" }], stream: true, input: prompt })`.

Iterates over the stream, calling `onChunk` for each `response.output_text.delta` event.

---

## 5. UI components

### `components/detail/WebRiskButton.tsx`

- A single `"use client"` component.
- Renders an outlined button: `🔍 Analizar en web`.
- On click: opens a `Dialog` (shadcn/ui), calls `POST /api/companies/[id]/web-risk` via `fetch`, reads the SSE stream.
- Dialog states:
  1. **Searching** — spinner + "Buscando información de [Empresa]…"
  2. **Streaming** — text renders progressively as chunks arrive (two markdown sections)
  3. **Done** — "✓ Guardado como nota" message at bottom, close button
  4. **Error** — red error message, retry button
- Dialog is 600px wide, scrollable content area.
- Abort controller cancels the fetch if the dialog is closed mid-stream.

### `components/detail/NotesSection.tsx` — minor update

- Detect notes where `content.startsWith("[Análisis Web]")`.
- Render a small `🔍 Web` badge (same style as `CompanyStatusBadge`) next to the note timestamp.
- Strip the `[Análisis Web] {date}\n\n` header line from the displayed content (show only the markdown body).

### `app/dashboard/[id]/page.tsx` — minor update

- Add `<WebRiskButton companyId={params.id} companyName={detail.company.name} />` inside the `CompanyHeader` area.

---

## 6. Error handling

| Scenario | Behaviour |
|---|---|
| OpenAI API error | `error` SSE event → modal shows red error + retry |
| Company not found / wrong KAM | 404 → modal shows "Empresa no encontrada" |
| Stream aborted by user (closes modal) | AbortController cancels fetch, no note saved |
| Note insert fails | Log error server-side, send `done` without noteId, stream text still visible |
| `web_search_preview` returns no results | LLM explicitly says "No se encontró información" in each section — still saved as note |

---

## 7. Verification checklist

- [ ] "Analizar en web" button visible on company detail page
- [ ] Modal opens immediately on click, shows spinner
- [ ] Text streams progressively into two sections
- [ ] "Guardado como nota" confirmation appears when done
- [ ] Note appears in notes section with 🔍 Web badge
- [ ] Closing the modal mid-stream aborts the fetch (no note saved)
- [ ] Error state shows correctly if OpenAI fails
- [ ] Works for both CL and MX companies (different prompts)
- [ ] `pnpm build` exits 0
