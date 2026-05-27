# AI Health Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-powered health score to each company using Claude Haiku, surfaced in both the dashboard table and the company detail page.

**Architecture:** A single `POST /api/health-scores/generate` route fetches companies from the `company_metrics` view, calls `lib/ai/health-score.ts` sequentially for each, and writes results back to the `companies` table. The dashboard adds a refresh button; the detail page adds an `AiAnalysis` card. Brand colors are also updated in this task.

**Tech Stack:** Next.js 14 App Router, Anthropic SDK (`claude-haiku-4-5-20251001`), Zod v4, Supabase JS, Sonner toasts, Tailwind CSS v3, TypeScript strict.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `app/globals.css` | Modify | Replace color tokens with exact `--xp-*` spec (#00DC82) |
| `.env.example` | Modify | Document `ANTHROPIC_API_KEY` |
| `lib/api.ts` | Modify | Add `apiPost` helper |
| `types/index.ts` | Modify | Narrow `recommended_actions` from `unknown` to `string[]` |
| `lib/ai/health-score.ts` | Create | `generateHealthScore()` — Haiku call + Zod validation + retry |
| `app/api/health-scores/generate/route.ts` | Create | POST endpoint, optional `{ companyId? }`, sequential batch |
| `components/detail/AiAnalysis.tsx` | Create | AI analysis card for company detail page |
| `components/companies/CompanyTable.tsx` | Modify | Add "Health" 7th column header |
| `components/companies/CompanyRow.tsx` | Modify | Add health score + churn risk dot cell |
| `app/dashboard/page.tsx` | Modify | Add "Actualizar scores" button with spinner + Sonner toast |
| `app/dashboard/[id]/page.tsx` | Modify | Insert `<AiAnalysis>` after `<MetricsRow>` |

---

## Task 1: Update Brand Colors

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace the `:root` color tokens**

Open `app/globals.css` and replace the entire `@layer base { :root { ... } }` block with the exact `--xp-*` token spec. The new primary green is `#00DC82` (HSL 156 100% 43%), backgrounds are near-black (#0A0A0A → #141414), and borders use #262626.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Brand tokens */
    --xp-bg:         0 0% 4%;          /* #0A0A0A */
    --xp-surface:    0 0% 8%;          /* #141414 */
    --xp-border:     0 0% 15%;         /* #262626 */
    --xp-green:      156 100% 43%;     /* #00DC82 */
    --xp-text:       0 0% 98%;         /* #FAFAFA */
    --xp-muted:      0 0% 45%;         /* #737373 */
    --xp-danger:     0 84% 60%;        /* #EF4444 */
    --xp-warning:    38 92% 50%;       /* #F59E0B */

    /* Tailwind semantic tokens (mapped to brand tokens) */
    --background:           var(--xp-bg);
    --foreground:           var(--xp-text);
    --card:                 var(--xp-surface);
    --card-foreground:      var(--xp-text);
    --popover:              var(--xp-surface);
    --popover-foreground:   var(--xp-text);
    --primary:              var(--xp-green);
    --primary-foreground:   var(--xp-bg);
    --secondary:            var(--xp-border);
    --secondary-foreground: var(--xp-text);
    --muted:                var(--xp-surface);
    --muted-foreground:     var(--xp-muted);
    --accent:               var(--xp-green);
    --accent-foreground:    var(--xp-bg);
    --destructive:          var(--xp-danger);
    --destructive-foreground: var(--xp-text);
    --border:               var(--xp-border);
    --input:                var(--xp-border);
    --ring:                 var(--xp-green);
    --warning:              var(--xp-warning);
    --success:              var(--xp-green);
    --chart-1:              var(--xp-green);
    --chart-2:              213 71% 52%;
    --chart-3:              var(--xp-warning);
    --chart-4:              265 83% 57%;
    --chart-5:              var(--xp-danger);
    --radius: 0.5rem;
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

> **Note:** Tailwind CSS v3 does not support CSS variable references in `var(...)` form inside the token declarations — the tokens stay as HSL triplets. The `var(--xp-*)` references above are for documentation only. Use the HSL values directly.

The correct final form is:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background:           0 0% 4%;
    --foreground:           0 0% 98%;
    --card:                 0 0% 8%;
    --card-foreground:      0 0% 98%;
    --popover:              0 0% 8%;
    --popover-foreground:   0 0% 98%;
    --primary:              156 100% 43%;
    --primary-foreground:   0 0% 4%;
    --secondary:            0 0% 15%;
    --secondary-foreground: 0 0% 98%;
    --muted:                0 0% 8%;
    --muted-foreground:     0 0% 45%;
    --accent:               156 100% 43%;
    --accent-foreground:    0 0% 4%;
    --destructive:          0 84% 60%;
    --destructive-foreground: 0 0% 98%;
    --border:               0 0% 15%;
    --input:                0 0% 15%;
    --ring:                 156 100% 43%;
    --warning:              38 92% 50%;
    --success:              156 100% 43%;
    --chart-1:              156 100% 43%;
    --chart-2:              213 71% 52%;
    --chart-3:              38 92% 50%;
    --chart-4:              265 83% 57%;
    --chart-5:              0 84% 60%;
    --radius: 0.5rem;
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

- [ ] **Step 2: Verify the build still passes**

```bash
cd ~/Desktop/cepelin-crm && pnpm build
```
Expected: 8 routes compiled, 0 TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/cepelin-crm
git add app/globals.css
git commit -m "feat: update brand colors to exact --xp-* token spec (#00DC82)"
```

---

## Task 2: Environment + Package Setup

**Files:**
- Modify: `.env.example`
- Shell: `pnpm add @anthropic-ai/sdk`

- [ ] **Step 1: Add ANTHROPIC_API_KEY to .env.example**

Append to the end of `.env.example`:

```
# --- AI (Anthropic) ---
# Used by POST /api/health-scores/generate to call Claude Haiku.
# Get your key at https://console.anthropic.com
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

- [ ] **Step 2: Add ANTHROPIC_API_KEY to .env.local**

In the terminal (do NOT paste the key in chat):
```bash
# Open .env.local in your editor and add:
# ANTHROPIC_API_KEY=sk-ant-...your-key...
```

- [ ] **Step 3: Install the Anthropic SDK**

```bash
cd ~/Desktop/cepelin-crm && pnpm add @anthropic-ai/sdk
```
Expected: package installed, `package.json` updated with `"@anthropic-ai/sdk": "^..."`.

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/cepelin-crm
git add .env.example package.json pnpm-lock.yaml
git commit -m "chore: add @anthropic-ai/sdk, document ANTHROPIC_API_KEY"
```

---

## Task 3: Extend lib/api.ts with apiPost

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1: Add apiPost helper**

The existing file has `apiGet` and `apiPatch`. Add `apiPost` at the end using the same `ApiResponse<T>` envelope pattern:

```typescript
import type { ApiResponse } from "@/types";

// Client-side fetch helpers that unwrap the { data, error } envelope.

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || json.error || json.data === null) {
    throw new Error(json.error ?? `Error ${res.status}`);
  }
  return json.data;
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || json.error || json.data === null) {
    throw new Error(json.error ?? `Error ${res.status}`);
  }
  return json.data;
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || json.error || json.data === null) {
    throw new Error(json.error ?? `Error ${res.status}`);
  }
  return json.data;
}
```

- [ ] **Step 2: Narrow recommended_actions type in types/index.ts**

In `types/index.ts`, change the `Company` interface field from `unknown | null` to `string[] | null`:

```typescript
  // Part 2 (nullable until the AI service populates them).
  health_score: number | null;
  churn_risk: ChurnRisk | null;
  ai_summary: string | null;
  recommended_actions: string[] | null;
  ai_generated_at: string | null;
```

- [ ] **Step 3: Verify build**

```bash
cd ~/Desktop/cepelin-crm && pnpm build
```
Expected: clean compile.

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/cepelin-crm
git add lib/api.ts types/index.ts
git commit -m "feat: add apiPost helper, narrow recommended_actions type"
```

---

## Task 4: AI Health Score Service

**Files:**
- Create: `lib/ai/health-score.ts`

- [ ] **Step 1: Create the lib/ai directory and service file**

Create `lib/ai/health-score.ts` with the following complete implementation:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { CompanyMetrics, TopDebtor } from "@/types";

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

async function callWithTimeout(
  client: Anthropic,
  prompt: string,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const msg = await client.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      },
      { signal: controller.signal as AbortSignal },
    );

    const block = msg.content[0];
    return block.type === "text" ? block.text : "";
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateHealthScore(
  company: CompanyMetrics,
  topDebtors: TopDebtor[],
): Promise<HealthScoreResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const client = new Anthropic({ apiKey });
  const prompt = buildUserPrompt(company, topDebtors);

  let raw = await callWithTimeout(client, prompt);
  let parsed = resultSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    // One retry on bad JSON/schema
    raw = await callWithTimeout(client, prompt);
    parsed = resultSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error(`Invalid LLM response: ${parsed.error.message}`);
    }
  }

  return parsed.data;
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd ~/Desktop/cepelin-crm && pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/cepelin-crm
git add lib/ai/health-score.ts
git commit -m "feat: add generateHealthScore() service using Claude Haiku"
```

---

## Task 5: API Route — POST /api/health-scores/generate

**Files:**
- Create: `app/api/health-scores/generate/route.ts`

- [ ] **Step 1: Create the directory and route file**

```bash
mkdir -p ~/Desktop/cepelin-crm/app/api/health-scores/generate
```

Create `app/api/health-scores/generate/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthedKam } from "@/lib/auth";
import { generateHealthScore } from "@/lib/ai/health-score";
import type { ApiResponse, CompanyMetrics, TopDebtor } from "@/types";

// Vercel Pro: 60s timeout for batch of ~15 companies (~20-30s total).
// On Hobby plan (10s limit) only single-company calls will succeed.
export const maxDuration = 60;

interface GenerateBody {
  companyId?: string;
}

interface GenerateResult {
  processed: number;
  errors: number;
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<GenerateResult>>> {
  const supabase = createClient();

  const kam = await getAuthedKam(supabase);
  if (!kam) {
    return NextResponse.json({ data: null, error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as GenerateBody;
  const { companyId } = body;

  // Fetch target companies from the view (RLS scopes to this KAM automatically).
  let query = supabase.from("company_metrics").select("*");
  if (companyId) {
    query = query.eq("id", companyId);
  }
  const { data: companies, error: fetchErr } = await query;
  if (fetchErr) {
    return NextResponse.json({ data: null, error: fetchErr.message }, { status: 500 });
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
        .in("status", ["assigned_cepelin", "in_collection", "collected"]);

      const debtorMap = new Map<string, { name: string; total: number }>();
      for (const row of invoiceRows ?? []) {
        const debtorArr = row.debtors as { name: string } | { name: string }[] | null;
        const name = Array.isArray(debtorArr) ? debtorArr[0]?.name : debtorArr?.name;
        if (!name) continue;
        const entry = debtorMap.get(row.debtor_id) ?? { name, total: 0 };
        entry.total += Number(row.amount);
        debtorMap.set(row.debtor_id, entry);
      }
      const topDebtors: TopDebtor[] = [...debtorMap.entries()]
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
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd ~/Desktop/cepelin-crm && pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/cepelin-crm
git add app/api/health-scores/generate/route.ts
git commit -m "feat: add POST /api/health-scores/generate endpoint"
```

---

## Task 6: AiAnalysis Component

**Files:**
- Create: `components/detail/AiAnalysis.tsx`

- [ ] **Step 1: Create the component**

Create `components/detail/AiAnalysis.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { apiPost } from "@/lib/api";
import type { CompanyMetrics } from "@/types";

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
      const res = await fetch(`/api/companies/${company.id}`);
      const json = await res.json();
      if (json.data) {
        setCompany((prev) => ({ ...prev, ...json.data.company }));
      }
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
          Sin análisis · Haz clic en "Generar" para obtener el health score con IA.
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
              "{company.ai_summary}"
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
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd ~/Desktop/cepelin-crm && pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/cepelin-crm
git add components/detail/AiAnalysis.tsx
git commit -m "feat: add AiAnalysis component for company detail page"
```

---

## Task 7: Health Column in Company List

**Files:**
- Modify: `components/companies/CompanyTable.tsx`
- Modify: `components/companies/CompanyRow.tsx`

- [ ] **Step 1: Add "Health" header to CompanyTable**

In `components/companies/CompanyTable.tsx`, add a 7th header cell after "DICOM / Buró":

```typescript
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompanyRow } from "@/components/companies/CompanyRow";
import type { CompanyMetrics } from "@/types";

export function CompanyTable({ companies }: { companies: CompanyMetrics[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
          <TableHead className="py-3 font-semibold text-foreground">Empresa</TableHead>
          <TableHead className="py-3 font-semibold text-foreground">Estado</TableHead>
          <TableHead className="py-3 text-right font-semibold text-foreground">Volumen 60d</TableHead>
          <TableHead className="py-3 text-right font-semibold text-foreground">Última op.</TableHead>
          <TableHead className="py-3 font-semibold text-foreground">Share of Wallet</TableHead>
          <TableHead className="py-3 text-right font-semibold text-foreground">DICOM / Buró</TableHead>
          <TableHead className="py-3 text-right font-semibold text-foreground">Health</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((company) => (
          <CompanyRow key={company.id} company={company} />
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2: Add health cell to CompanyRow**

In `components/companies/CompanyRow.tsx`, add the health score cell after the credit risk cell. Add a local `churnDot` helper at the top of the file (before the component):

```typescript
"use client";

import { useRouter } from "next/navigation";
import { TableCell, TableRow } from "@/components/ui/table";
import { CompanyStatusBadge } from "@/components/StatusBadge";
import {
  countryFlag,
  creditRiskClass,
  creditRiskLabel,
  formatCurrency,
  formatDaysSince,
  taxIdLabel,
  urgencyLevel,
  urgencyTextClass,
} from "@/lib/format";
import type { CompanyMetrics } from "@/types";

function churnDotClass(risk: "low" | "medium" | "high" | null): string {
  if (risk === "low") return "bg-emerald-400";
  if (risk === "medium") return "bg-amber-400";
  if (risk === "high") return "bg-red-400";
  return "bg-muted";
}

export function CompanyRow({ company }: { company: CompanyMetrics }) {
  const router = useRouter();
  const sow = company.sow_percentage ?? 0;
  const urgency = urgencyLevel(company.days_since_last_op);

  return (
    <TableRow
      className="cursor-pointer transition-colors duration-150 hover:bg-primary/5"
      onClick={() => router.push(`/dashboard/${company.id}`)}
    >
      <TableCell className="py-3.5">
        <div className="font-medium text-foreground">
          <span className="mr-1.5">{countryFlag(company.country)}</span>{company.name}
        </div>
        <div className="text-xs text-muted-foreground">
          {taxIdLabel(company.country)} {company.tax_id}
        </div>
      </TableCell>

      <TableCell className="py-3.5">
        <CompanyStatusBadge status={company.status} />
      </TableCell>

      <TableCell className="py-3.5 text-right tabular-nums text-sm">
        {formatCurrency(company.volume_60d, company.country)}
      </TableCell>

      <TableCell
        className={`py-3.5 text-right tabular-nums text-sm font-medium ${urgencyTextClass(urgency)}`}
      >
        {formatDaysSince(company.days_since_last_op)}
      </TableCell>

      <TableCell className="py-3.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(sow, 100)}%` }}
            />
          </div>
          <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
            {company.sow_percentage === null ? "—" : `${Math.round(sow)}%`}
          </span>
        </div>
      </TableCell>

      <TableCell className="py-3.5 text-right">
        {company.credit_risk_score === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className={`tabular-nums text-sm font-medium ${creditRiskClass(company.credit_risk_score)}`}>
            {company.credit_risk_score} <span className="text-xs font-normal">{creditRiskLabel(company.country)}</span>
          </span>
        )}
      </TableCell>

      <TableCell className="py-3.5 text-right">
        {company.health_score === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex items-center justify-end gap-1.5">
            <span className="tabular-nums text-sm font-medium text-foreground">
              {company.health_score}
            </span>
            <span
              className={`inline-block h-2 w-2 rounded-full ${churnDotClass(company.churn_risk)}`}
            />
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd ~/Desktop/cepelin-crm && pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/cepelin-crm
git add components/companies/CompanyTable.tsx components/companies/CompanyRow.tsx
git commit -m "feat: add Health column to company list table"
```

---

## Task 8: Dashboard "Actualizar Scores" Button

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add refresh state + Actualizar scores button**

Replace the full content of `app/dashboard/page.tsx`:

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyTable } from "@/components/companies/CompanyTable";
import { apiGet, apiPost } from "@/lib/api";
import type { CompanyMetrics } from "@/types";

export default function DashboardPage() {
  const [companies, setCompanies] = useState<CompanyMetrics[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCompanies = useCallback(() => {
    apiGet<CompanyMetrics[]>("/api/companies")
      .then(setCompanies)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  async function handleRefreshScores() {
    setRefreshing(true);
    try {
      const result = await apiPost<{ processed: number; errors: number }>(
        "/api/health-scores/generate",
        {},
      );
      toast.success(
        `${result.processed} empresa${result.processed !== 1 ? "s" : ""} analizada${result.processed !== 1 ? "s" : ""}${result.errors > 0 ? ` · ${result.errors} error${result.errors !== 1 ? "es" : ""}` : ""}`,
      );
      fetchCompanies();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar scores");
    } finally {
      setRefreshing(false);
    }
  }

  const atRisk = companies?.filter((c) => (c.days_since_last_op ?? 0) > 30).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Mi cartera</h1>
          <p className="text-sm text-muted-foreground">
            Ordenada por urgencia · cuentas sin operaciones recientes primero
          </p>
        </div>
        <div className="flex items-center gap-4">
          {companies && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="tabular-nums font-semibold">{companies.length}</span>
                <span className="text-muted-foreground">empresas</span>
              </div>
              {atRisk > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  <span className="tabular-nums font-semibold text-destructive">{atRisk}</span>
                  <span className="text-muted-foreground">en riesgo</span>
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleRefreshScores}
            disabled={refreshing || !companies}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analizando…
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Actualizar scores
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </Card>
      )}

      {/* Skeleton */}
      {!companies && !error && (
        <Card className="overflow-hidden p-0">
          <div className="divide-y">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="ml-auto h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-2 w-28 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty */}
      {companies?.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Aún no tienes empresas asignadas.</p>
        </Card>
      )}

      {/* Table */}
      {companies && companies.length > 0 && (
        <Card className="overflow-hidden p-0">
          <CompanyTable companies={companies} />
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd ~/Desktop/cepelin-crm && pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/cepelin-crm
git add app/dashboard/page.tsx
git commit -m "feat: add Actualizar scores button with spinner and toast to dashboard"
```

---

## Task 9: Wire AiAnalysis into Company Detail Page

**Files:**
- Modify: `app/dashboard/[id]/page.tsx`

- [ ] **Step 1: Import and insert AiAnalysis**

Replace the full content of `app/dashboard/[id]/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyHeader } from "@/components/detail/CompanyHeader";
import { MetricsRow } from "@/components/detail/MetricsRow";
import { AiAnalysis } from "@/components/detail/AiAnalysis";
import { VolumeChart } from "@/components/detail/VolumeChart";
import { InvoiceTable } from "@/components/detail/InvoiceTable";
import { TopDebtors } from "@/components/detail/TopDebtors";
import { NotesSection } from "@/components/detail/NotesSection";
import { apiGet } from "@/lib/api";
import type { CompanyDetail } from "@/types";

export default function CompanyDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<CompanyDetail>(`/api/companies/${params.id}`)
      .then(setDetail)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"));
  }, [params.id]);

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← Volver a mi cartera
      </Link>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>
      )}

      {!detail && !error && (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      )}

      {detail && (
        <>
          <CompanyHeader company={detail.company} contacts={detail.contacts} />
          <MetricsRow company={detail.company} />
          <AiAnalysis company={detail.company} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <VolumeChart
                data={detail.monthly_volume}
                country={detail.company.country}
              />
            </div>
            <TopDebtors debtors={detail.top_debtors} country={detail.company.country} />
          </div>
          <InvoiceTable invoices={detail.invoices} country={detail.company.country} />
          <NotesSection companyId={detail.company.id} initialNotes={detail.notes} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify full build**

```bash
cd ~/Desktop/cepelin-crm && pnpm build
```
Expected: all 8 routes compiled, 0 TypeScript errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/cepelin-crm
git add app/dashboard/[id]/page.tsx
git commit -m "feat: insert AiAnalysis card into company detail page"
```

---

## Task 10: Add ANTHROPIC_API_KEY to Vercel and Deploy

**Files:**
- Shell commands only

- [ ] **Step 1: Add ANTHROPIC_API_KEY to Vercel environment**

```bash
cd ~/Desktop/cepelin-crm
vercel env add ANTHROPIC_API_KEY production
```
When prompted, paste your API key (starts with `sk-ant-`). Do NOT type or paste the key in chat.

- [ ] **Step 2: Deploy to production**

```bash
cd ~/Desktop/cepelin-crm && vercel --prod --yes
```
Expected: build succeeds, deployment URL printed (e.g. `https://cepelin-crm.vercel.app`).

- [ ] **Step 3: Smoke test on production**

1. Visit `https://cepelin-crm.vercel.app` → login with Google
2. Dashboard loads → click "Actualizar scores" → button shows "Analizando…" → after ~20-30s toast appears "X empresas analizadas"
3. Reload page → Health column shows numbers + colored dots
4. Click any company → detail page shows AiAnalysis card with score, churn risk, summary, actions

> **Note on Vercel timeout:** `maxDuration = 60` requires Vercel Pro plan. On the Hobby plan (10s limit) only single-company calls (`{ companyId: "..." }`) will complete. If hitting timeout errors on batch refresh, upgrade to Pro or reduce the portfolio to fewer companies.

---

## Self-Review Checklist

**Spec coverage:**
- [x] Brand colors updated to `--xp-green: #00DC82` / dark backgrounds — Task 1
- [x] `@anthropic-ai/sdk` installed — Task 2
- [x] `ANTHROPIC_API_KEY` in `.env.example` — Task 2
- [x] `generateHealthScore()` with Zod validation + 1 retry + 15s timeout — Task 4
- [x] `POST /api/health-scores/generate` with optional `{ companyId? }` — Task 5
- [x] Sequential processing (no Promise.all) — Task 5
- [x] `AiAnalysis` component: score + churn + summary + actions + timestamp + button — Task 6
- [x] "Health" column header in CompanyTable — Task 7
- [x] Health cell (score + churn dot) in CompanyRow — Task 7
- [x] "Actualizar scores" button + spinner + Sonner toast + re-fetch — Task 8
- [x] `AiAnalysis` after `MetricsRow` in detail page — Task 9
- [x] `vercel --prod` deploy — Task 10

**Type consistency across tasks:**
- `HealthScoreResult` (Task 4) → used in Task 5 (route writes `result.health_score`, `result.churn_risk`, `result.summary`, `result.recommended_actions`) ✓
- `apiPost<{ processed: number; errors: number }>` called in Task 8 and Task 6 — matches route return shape from Task 5 ✓
- `company.recommended_actions` narrowed to `string[] | null` in Task 3 — used in Task 6 AiAnalysis component ✓
- `company.churn_risk` type is `ChurnRisk | null` = `"low" | "medium" | "high" | null` — `churnDotClass` handles `null` ✓
