# Design: Brand Colors + AI Health Score

**Date:** 2026-05-22  
**Project:** Cepelin KAM CRM  
**Status:** Approved

---

## 1. Context

Two parallel workstreams:
1. **Brand colors** — update to exact Xepelin token set (`--xp-*`) and dark fintech aesthetic
2. **AI health score** — Part 2 feature: Claude Haiku analyzes each company and populates `health_score`, `churn_risk`, `ai_summary`, `recommended_actions` columns that already exist (nullable) in the DB

The DB schema (`companies` table + `company_metrics` view) and most UI fixes (flags, credit risk column, volume fix) were completed in a previous session. Migration `0005_fixes.sql` ran successfully.

---

## 2. Brand Colors

### Token Map (`globals.css` `:root`)

| Token | Value | Usage |
|---|---|---|
| `--xp-bg` | `#0A0A0A` | `--background` |
| `--xp-surface` | `#141414` | `--card` |
| `--xp-border` | `#262626` | `--border`, `--input` |
| `--xp-green` | `#00DC82` | `--primary`, `--accent`, `--ring` |
| `--xp-green-dim` | `#00DC8220` | hover states, progress fill bg |
| `--xp-text` | `#FAFAFA` | `--foreground`, `--card-foreground` |
| `--xp-muted` | `#737373` | `--muted-foreground` |
| `--xp-danger` | `#EF4444` | `--destructive` |
| `--xp-warning` | `#F59E0B` | `--warning` |
| `--xp-success` | `#00DC82` | `--success` (same as green) |

Tailwind's semantic tokens already map to CSS vars, so no component changes are needed for the color update. Status badges inherit through the muted/surface tokens.

---

## 3. AI Health Score

### 3.1 Service Layer — `lib/ai/health-score.ts`

Single exported function:

```typescript
generateHealthScore(company: CompanyMetrics, topDebtors: TopDebtor[]): Promise<HealthScoreResult>
```

**Input payload built from:**
- Company fields: name, country, status, days_enrolled, days_since_last_op, volume_60d, credit_limit, credit_used, sow_percentage, credit_risk_score
- Invoice summary: total count + breakdown by status
- Top debtors: name + volume (top 3)

**LLM call:**
- Model: `claude-haiku-4-5-20251001`
- `max_tokens: 512`
- Timeout: 15s (via AbortController)
- `temperature: 0` for deterministic JSON output

**System prompt:** Financial analyst for Xepelin factoring, respond with valid JSON only.

**User prompt:** Scoring guidelines + `JSON.stringify(payload)` → returns `{ health_score, churn_risk, summary, recommended_actions }`

**Zod schema:**
```typescript
z.object({
  health_score: z.number().int().min(0).max(100),
  churn_risk: z.enum(['low', 'medium', 'high']),
  summary: z.string().min(10).max(500),
  recommended_actions: z.array(z.string()).min(1).max(4),
})
```

**Retry:** Parse → validate → if fails, retry once → if still fails, throw.

```
// Cost estimate at scale:
// claude-haiku: ~$0.001 per company analysis
// 10K companies/month ≈ $10/month
// Latency: ~1-2s per company
// Batch of 15 companies: ~20-30s total
```

### 3.2 API Route — `app/api/health-scores/generate/route.ts`

```
POST /api/health-scores/generate
Body: { companyId?: string }   // optional — if absent, processes all
Auth: Supabase session (401 if not authed)
Response: { processed: number, errors: number }
```

**Flow:**
1. Auth check → `getAuthedKam(supabase)` → 401 if null
2. Fetch companies from `company_metrics` view (filtered by `companyId` if present)
3. For each company: fetch top debtors + invoice summary → call `generateHealthScore`
4. On success: `supabase.from("companies").update({ health_score, churn_risk, ai_summary, recommended_actions, ai_generated_at: new Date() }).eq("id", company.id)`
5. On error per company: log, increment error count, continue
6. Return `{ processed, errors }`

Sequential processing (no Promise.all) to avoid rate limits.

### 3.3 Environment

Add to `.env.example`:
```
ANTHROPIC_API_KEY=your_api_key_here
```

Install: `@anthropic-ai/sdk`

### 3.4 UI — Company List

**New "Health" column** (7th column in `CompanyTable` / `CompanyRow`):
- Cell: `{health_score}` number + churn risk dot (`🟢 low | 🟡 medium | 🔴 high`)
- Null state: `—`

**"Actualizar scores" button** in dashboard page header (right side):
- Default: outline button with refresh icon
- Loading: spinner + disabled, text "Analizando…"
- On click: `POST /api/health-scores/generate` → on success: Sonner toast "X empresas analizadas" → re-fetch company list

### 3.5 UI — Company Detail

New `AiAnalysis` component inserted **after `<MetricsRow>`**:

```
┌─────────────────────────────────────────────┐
│  Análisis IA          [Actualizar]           │
│                                              │
│  Score: 72           ● medium               │
│                                              │
│  "Este cliente muestra signos de fuga..."   │
│                                              │
│  Acciones recomendadas:                      │
│  1. Llamar esta semana                       │
│  2. Proponer mejora de tasa                  │
│                                              │
│  Actualizado: 22 may 2026 · 14:32           │
└─────────────────────────────────────────────┘
```

- If `health_score` is null: show "Sin análisis · " + "Generar" button
- "Generar" / "Actualizar" calls `POST /api/health-scores/generate` with `{ companyId }`
- Loading state on the button while the request is in-flight
- On success: updates component state with returned data without page reload

---

## 4. Files Changed

| File | Change |
|---|---|
| `app/globals.css` | Replace color tokens with `--xp-*` set |
| `lib/ai/health-score.ts` | **NEW** — LLM service |
| `app/api/health-scores/generate/route.ts` | **NEW** — API route |
| `components/detail/AiAnalysis.tsx` | **NEW** — detail section |
| `app/dashboard/page.tsx` | Add Refresh Scores button |
| `app/dashboard/[id]/page.tsx` | Add AiAnalysis component |
| `components/companies/CompanyTable.tsx` | Add Health column header |
| `components/companies/CompanyRow.tsx` | Add Health column cell |
| `.env.example` | Add ANTHROPIC_API_KEY |
| `package.json` | Add @anthropic-ai/sdk |

---

## 5. Out of Scope

- Streaming LLM responses
- Background jobs / queuing
- Scheduled auto-refresh
- Caching of LLM responses
