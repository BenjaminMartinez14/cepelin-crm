# Cepelin · KAM Mini-CRM

Internal CRM for **Key Account Managers (KAMs)** at a factoring fintech operating in
Chile and Mexico. It gives a KAM a portfolio view and a per-company detail view built
around the four jobs of a KAM: **activate, make recurring, expand Share of Wallet (SOW),
and prevent churn.**

## Stack

- **Next.js 14** (App Router) + **TypeScript** (strict)
- **Supabase** — PostgreSQL, Google OAuth, Row Level Security
- **shadcn/ui** + **Tailwind CSS** + **Recharts**
- **Vercel** deploy target

## Architecture

```
Browser (client components)
   │  fetch /api/* (envelope: { data, error })
   ▼
Next.js API routes (app/api/companies/**)   ── thin, zod-validated, ownership-checked
   │  Supabase server client (carries user session)
   ▼
PostgreSQL (Supabase)
   ├─ tables: kams, companies, contacts, debtors, invoices, notes
   ├─ view:  company_metrics  (security_invoker — computed fields, RLS-aware)
   └─ RLS:   every read/write scoped to the signed-in KAM by email
```

Key principles:
- **No direct DB access from components.** All data flows through typed API routes.
- **Computed fields live in SQL** (`company_metrics` view), not duplicated in TS.
- **RLS is the security boundary.** A KAM can only ever see/modify their own portfolio,
  enforced in Postgres — the API checks are a second layer, not the only one.

### Data model

| Table | Notes |
|-------|-------|
| `kams` | one per KAM; `email` matches the Supabase auth email |
| `companies` | `kam_id` owner, `country` (CL/MX), `status`, `credit_limit` (read-only, set by Risk), `next_followup_date`, `is_demo` (cloneable demo flag), + nullable Part-2 AI columns |
| `contacts` | per company |
| `debtors` | shared reference data (the payers behind invoices) |
| `invoices` | `amount`, `issued_at`, `status` (issued / assigned_cepelin / assigned_competitor / in_collection / collected) |
| `notes` | timeline per company |

### Computed fields (`company_metrics` view)

Never stored — always derived:

- `credit_used` = Σ invoices with status in (`assigned_cepelin`, `in_collection`)
- `credit_available` = `credit_limit − credit_used`
- `days_since_last_op` = days since the last `assigned_cepelin` / `in_collection` invoice
- `volume_60d` = Σ Cepelin-processed amounts in the last 60 days
- `sow_percentage` = `(cepelin + in_collection) / (cepelin + in_collection + competitor) × 100`

**Definition of "assigned to Cepelin"** (documented because it drives the numbers):
- *Active exposure* (credit, SOW, days-since): `assigned_cepelin`, `in_collection`.
- *Processed volume* (`volume_60d`, monthly chart): also includes `collected`, since a
  collected invoice was still real volume Cepelin handled.

## Product decisions (how each field serves a KAM job)

- **Default sort = `days_since_last_op` desc, nulls first** → the most churn-exposed and
  never-activated accounts surface at the top of the portfolio. (*prevent churn / activate*)
- **SOW % progress bar** → instantly shows accounts giving most volume to a competitor.
  (*expand SOW*)
- **Status badge** (enrolled → active → recurring) → tracks the activation/recurrence
  funnel. (*activate / make recurring*)
- **Volume 60d + monthly chart** → trend of real Cepelin volume. (*make recurring / expand*)
- **Editable next follow-up + notes** → the KAM's action layer on each account.
- **Credit available** → headroom to pitch more operations. (*expand SOW*)

## Setup

### 1. Create a Supabase project
Grab the project URL and keys from **Project Settings → API**.

### 2. Enable Google OAuth
**Authentication → Providers → Google.** Create a Google Cloud OAuth client and add the
redirect URL `https://<your-project-ref>.supabase.co/auth/v1/callback`. In **URL
Configuration**, add your app origins (`http://localhost:3000` and the Vercel URL) to the
redirect allow-list.

### 3. Environment variables
Copy `.env.example` → `.env.local` and fill in:

| Var | Used by | Notes |
|-----|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | public |
| `SUPABASE_SERVICE_ROLE_KEY` | **seed only** | server secret — never in client code |
| `SEED_KAM_EMAIL` | seed | the evaluator's Google email; that KAM owns the demo portfolio |
| `SEED_RESET` | seed | `true` to wipe + reseed |

### 4. Run migrations
Apply the SQL in `supabase/migrations/` in order via the Supabase SQL editor or CLI:

```bash
supabase db push          # with the Supabase CLI linked to your project
# or paste 0001 → 0004 into the SQL editor in order
```

### 5. Seed
```bash
pnpm seed
```
Generates 2 KAMs, 12 debtors, 15 companies (mixed CL/MX) with story cohorts: churn risk,
low SOW, healthy/growing, and enrolled-never-activated.

### 6. Run
```bash
pnpm dev
```
Sign in with the Google account whose email = `SEED_KAM_EMAIL`.

**Any other evaluator** can also sign in: on first login the OAuth callback calls the
`provision_demo_kam()` RPC, which creates a KAM for that email and clones the demo
portfolio — so everyone sees data immediately.

## Deploy (Vercel)
1. Import the repo; set environment variables in Vercel dashboard > Settings > Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GROQ_API_KEY` ← **required for AI features** (health scores + web risk analysis)
2. Add the Vercel URL to Supabase Auth redirect URLs.
3. Deploy.

## Part 2 readiness (AI health score)
`companies` already has nullable `health_score`, `churn_risk` (`low|medium|high`),
`ai_summary`, `recommended_actions` (jsonb), `ai_generated_at`. A future service can
populate them and the UI can read them with **no migration and no breaking change** —
they already flow through `company_metrics`.

## Project layout
```
app/                  routes (api/, dashboard/, auth/callback, landing)
components/           companies/ (list) · detail/ (detail sections) · ui/ (shadcn)
lib/                  supabase/ (client/server/admin) · db/ · auth · format · api
supabase/migrations/  0001 schema · 0002 metrics view · 0003 RLS · 0004 provisioning
scripts/seed.ts       synthetic data
types/index.ts        shared domain types + ApiResponse<T>
```
