import { NextResponse } from "next/server";

const docs = {
  title: "Cepelin KAM CRM — API Reference",
  version: "1.0.0",
  base_url: "https://cepelin-crm.vercel.app",
  auth: {
    type: "session_cookie",
    description:
      "All endpoints require an authenticated session obtained via Google OAuth. The session cookie is set automatically after login. Unauthenticated requests return HTTP 401.",
  },
  error_envelope: {
    description:
      "All responses use a consistent envelope. On success: { data: T, error: null }. On failure: { data: null, error: string }.",
    http_codes: {
      "400": "Invalid request body or parameters",
      "401": "Unauthenticated — no valid session cookie",
      "404": "Resource not found or belongs to another KAM",
      "500": "Internal server error",
    },
  },
  endpoints: [
    {
      id: "list_companies",
      method: "GET",
      path: "/api/companies",
      description:
        "Returns all companies assigned to the authenticated KAM, sorted by urgency (gestionar_hoy first, then gestionar_semana, al_dia, sin_accion). Within each tier, companies with the most days since last operation appear first.",
      auth_required: true,
      request: null,
      response: {
        status: 200,
        shape: {
          data: "CompanyMetrics[]",
          error: null,
        },
        fields: {
          id: "string (UUID)",
          name: "string",
          tax_id: "string — RUT (CL) or RFC (MX)",
          country: "'CL' | 'MX'",
          status: "'enrolled' | 'active' | 'recurring'",
          health_score: "integer 0–100 | null — AI-generated",
          churn_risk: "'low' | 'medium' | 'high' | null",
          urgency_label:
            "'gestionar_hoy' | 'gestionar_semana' | 'al_dia' | 'sin_accion'",
          volume_60d: "number — total invoice volume in last 60 days",
          days_since_last_op:
            "integer | null — days since last cedida/en_cobranza invoice",
          sow_percentage:
            "number 0–100 | null — Xepelin share of wallet vs competitors",
          credit_limit: "number",
          credit_available: "number — credit_limit minus active credit used",
          credit_risk_score:
            "integer | null — DICOM score (CL) or Buró score (MX)",
          management_status:
            "'por_gestionar' | 'en_seguimiento' | 'gestionado' | 'en_pausa'",
          invoice_status_counts:
            "Record<string, number> | null — counts per SII/SAT status",
          key_insight:
            "string | null — one-line AI insight about this client",
        },
      },
    },
    {
      id: "get_company",
      method: "GET",
      path: "/api/companies/:id",
      description:
        "Returns full detail for a single company. RLS ensures the company must belong to the authenticated KAM.",
      auth_required: true,
      path_params: {
        id: "string (UUID) — company ID",
      },
      request: null,
      response: {
        status: 200,
        shape: {
          data: "CompanyDetail",
          error: null,
        },
        fields: {
          company: "CompanyMetrics — all fields from GET /api/companies",
          contacts: "Contact[] — name, phone, email",
          invoices:
            "InvoiceWithDebtor[] — full invoice list with debtor names, sorted by issued_at desc",
          monthly_volume:
            "MonthlyVolumePoint[] — { month: 'YYYY-MM', volume: number } for last 6 months",
          top_debtors:
            "TopDebtor[] — top 3 debtors by total invoice volume: { debtor_id, name, total }",
          notes:
            "Note[] — { id, company_id, kam_id, content, created_at }, sorted by created_at desc",
        },
      },
    },
    {
      id: "create_note",
      method: "POST",
      path: "/api/companies/:id/notes",
      description:
        "Creates a new note for a company. Notes saved by the AI risk analysis feature are prefixed with '[Análisis Web] YYYY-MM-DD\\n\\n' and tagged automatically.",
      auth_required: true,
      path_params: {
        id: "string (UUID) — company ID",
      },
      request: {
        content_type: "application/json",
        body: {
          content: "string — required, 1–2000 characters",
        },
      },
      response: {
        status: 201,
        shape: {
          data: "Note",
          error: null,
        },
        fields: {
          id: "string (UUID)",
          company_id: "string (UUID)",
          kam_id: "string (UUID)",
          content: "string",
          created_at: "ISO 8601 timestamp",
        },
      },
    },
    {
      id: "update_followup",
      method: "PATCH",
      path: "/api/companies/:id/followup",
      description:
        "Updates the next follow-up date for a company. Pass null to clear the date. Companies with an overdue or same-day follow-up date receive urgency_label 'gestionar_hoy'.",
      auth_required: true,
      path_params: {
        id: "string (UUID) — company ID",
      },
      request: {
        content_type: "application/json",
        body: {
          date: "'YYYY-MM-DD' | null",
        },
      },
      response: {
        status: 200,
        shape: {
          data: { next_followup_date: "'YYYY-MM-DD' | null" },
          error: null,
        },
      },
    },
    {
      id: "generate_health_score",
      method: "POST",
      path: "/api/health-scores/generate",
      description:
        "Generates an AI health score for a single company using llama-3.3-70b-versatile via Groq. Analyzes invoice portfolio, SOW, churn signals, qualitative KAM notes, and sector context. Writes health_score, churn_risk, ai_summary, recommended_actions, and key_insight back to the companies table. For bulk generation, call once per company from the client — the dashboard does this sequentially.",
      auth_required: true,
      request: {
        content_type: "application/json",
        body: {
          companyId: "string (UUID) — required",
        },
      },
      response: {
        status: 200,
        shape: {
          data: { processed: "number", errors: "number" },
          error: null,
        },
      },
      notes: [
        "maxDuration is 30s (Vercel limit)",
        "One retry on malformed LLM JSON response",
        "Returns processed=0, errors=1 if the LLM call fails — does not throw a 500",
      ],
    },
    {
      id: "update_management_status",
      method: "PATCH",
      path: "/api/companies/:id/management-status",
      description:
        "Updates the weekly management workflow status for a company. Used by the management kanban drag-and-drop and quick-action buttons.",
      auth_required: true,
      path_params: {
        id: "string (UUID) — company ID",
      },
      request: {
        content_type: "application/json",
        body: {
          status:
            "'por_gestionar' | 'en_seguimiento' | 'gestionado' | 'en_pausa'",
        },
      },
      response: {
        status: 200,
        shape: {
          data: { id: "string", management_status: "string" },
          error: null,
        },
      },
    },
    {
      id: "web_risk_analysis",
      method: "GET",
      path: "/api/companies/:id/web-risk",
      description:
        "Streams a structured risk analysis for a company using Server-Sent Events (SSE). Analyzes internal portfolio data (invoice states, SOW, churn, KAM notes) and appends general sector/macro context from model training data. Does NOT perform real-time web search. Automatically saves the full analysis as a note when streaming completes.",
      auth_required: true,
      path_params: {
        id: "string (UUID) — company ID",
      },
      request: null,
      response: {
        content_type: "text/event-stream",
        events: [
          {
            type: "delta",
            shape: { type: "delta", text: "string" },
            description: "Streamed text chunk",
          },
          {
            type: "done",
            shape: { type: "done", noteId: "string | null" },
            description: "Stream complete. noteId is the saved note's UUID.",
          },
          {
            type: "error",
            shape: { type: "error", message: "string" },
            description: "Stream failed. Client should show the message.",
          },
        ],
        sections:
          "Análisis del Portfolio Interno | Contexto de Riesgo Externo | Recomendaciones para el KAM",
      },
      notes: [
        "Uses edge runtime — no Node.js APIs",
        "Model: llama-3.3-70b-versatile via Groq (streaming)",
        "No retry on stream failure",
      ],
    },
    {
      id: "reset_management_status",
      method: "POST",
      path: "/api/companies/management-status/reset",
      description:
        "Resets all companies for the authenticated KAM to management_status='por_gestionar'. Intended for use at the start of each week.",
      auth_required: true,
      request: null,
      response: {
        status: 200,
        shape: {
          data: { updated: "number" },
          error: null,
        },
      },
    },
  ],
};

export function GET() {
  return NextResponse.json(docs, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
