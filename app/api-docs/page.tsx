import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Reference · Cepelin KAM CRM",
  description: "Documentación de la API REST del CRM interno de Cepelin",
};

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700",
  POST: "bg-green-100 text-green-700",
  PATCH: "bg-amber-100 text-amber-700",
};

type HttpMethod = "GET" | "POST" | "PATCH";

interface RequestBody {
  content_type: string;
  body: Record<string, string>;
}

interface SseEvent {
  type: string;
  shape: Record<string, string>;
  description: string;
}

interface SseResponse {
  content_type: string;
  events: SseEvent[];
  sections: string;
}

interface JsonResponse {
  status: number;
  shape: Record<string, unknown>;
  fields?: Record<string, string>;
}

interface Endpoint {
  id: string;
  method: HttpMethod;
  path: string;
  description: string;
  auth_required: boolean;
  path_params?: Record<string, string>;
  request: RequestBody | null;
  response: JsonResponse | SseResponse;
  notes?: string[];
}

const ENDPOINTS: Endpoint[] = [
  {
    id: "list_companies",
    method: "GET",
    path: "/api/companies",
    description:
      "Retorna todas las empresas asignadas al KAM autenticado, ordenadas por urgencia (gestionar_hoy primero, luego gestionar_semana, al_dia, sin_accion). Dentro de cada tier, las empresas con más días desde la última operación aparecen primero.",
    auth_required: true,
    request: null,
    response: {
      status: 200,
      shape: { data: "CompanyMetrics[]", error: null },
      fields: {
        id: "string (UUID)",
        name: "string",
        tax_id: "string — RUT (CL) o RFC (MX)",
        country: "'CL' | 'MX'",
        status: "'enrolled' | 'active' | 'recurring'",
        health_score: "integer 0–100 | null — generado por IA",
        churn_risk: "'low' | 'medium' | 'high' | null",
        urgency_label:
          "'gestionar_hoy' | 'gestionar_semana' | 'al_dia' | 'sin_accion'",
        volume_60d: "number — volumen total de facturas en los últimos 60 días",
        days_since_last_op:
          "integer | null — días desde la última factura cedida/en_cobranza",
        sow_percentage:
          "number 0–100 | null — share of wallet de Xepelin vs competidores",
        credit_limit: "number",
        credit_available: "number — credit_limit menos crédito activo usado",
        credit_risk_score: "integer | null — score DICOM (CL) o Buró (MX)",
        management_status:
          "'por_gestionar' | 'en_seguimiento' | 'gestionado' | 'en_pausa'",
        invoice_status_counts:
          "Record<string, number> | null — conteos por estado SII/SAT",
        key_insight: "string | null — insight IA de una línea sobre el cliente",
      },
    },
  },
  {
    id: "get_company",
    method: "GET",
    path: "/api/companies/:id",
    description:
      "Retorna el detalle completo de una empresa. RLS garantiza que la empresa pertenezca al KAM autenticado.",
    auth_required: true,
    path_params: {
      id: "string (UUID) — ID de la empresa",
    },
    request: null,
    response: {
      status: 200,
      shape: { data: "CompanyDetail", error: null },
      fields: {
        company: "CompanyMetrics — todos los campos de GET /api/companies",
        contacts: "Contact[] — nombre, teléfono, email",
        invoices:
          "InvoiceWithDebtor[] — lista completa con nombres de deudores, ordenada por issued_at desc",
        monthly_volume:
          "MonthlyVolumePoint[] — { month: 'YYYY-MM', volume: number } para los últimos 6 meses",
        top_debtors:
          "TopDebtor[] — top 3 deudores por volumen total: { debtor_id, name, total }",
        notes:
          "Note[] — { id, company_id, kam_id, content, created_at }, ordenadas por created_at desc",
      },
    },
  },
  {
    id: "create_note",
    method: "POST",
    path: "/api/companies/:id/notes",
    description:
      "Crea una nueva nota para una empresa. Las notas guardadas por el análisis de riesgo IA llevan el prefijo '[Análisis Web] YYYY-MM-DD\\n\\n'.",
    auth_required: true,
    path_params: {
      id: "string (UUID) — ID de la empresa",
    },
    request: {
      content_type: "application/json",
      body: {
        content: "string — requerido, 1–2000 caracteres",
      },
    },
    response: {
      status: 201,
      shape: { data: "Note", error: null },
      fields: {
        id: "string (UUID)",
        company_id: "string (UUID)",
        kam_id: "string (UUID)",
        content: "string",
        created_at: "timestamp ISO 8601",
      },
    },
  },
  {
    id: "update_followup",
    method: "PATCH",
    path: "/api/companies/:id/followup",
    description:
      "Actualiza la fecha de próximo seguimiento de una empresa. Pasar null borra la fecha. Las empresas con seguimiento vencido o del día reciben urgency_label 'gestionar_hoy'.",
    auth_required: true,
    path_params: {
      id: "string (UUID) — ID de la empresa",
    },
    request: {
      content_type: "application/json",
      body: {
        date: "'YYYY-MM-DD' | null",
      },
    },
    response: {
      status: 200,
      shape: { data: { next_followup_date: "'YYYY-MM-DD' | null" }, error: null },
    },
  },
  {
    id: "generate_health_score",
    method: "POST",
    path: "/api/health-scores/generate",
    description:
      "Genera un health score IA para una empresa usando llama-3.3-70b-versatile vía Groq. Analiza portafolio de facturas, SOW, señales de churn, notas del KAM y contexto sectorial. Escribe health_score, churn_risk, ai_summary, recommended_actions y key_insight de vuelta en la tabla companies.",
    auth_required: true,
    request: {
      content_type: "application/json",
      body: {
        companyId: "string (UUID) — requerido",
      },
    },
    response: {
      status: 200,
      shape: { data: { processed: "number", errors: "number" }, error: null },
    },
    notes: [
      "maxDuration 30s (límite de Vercel)",
      "Un reintento si la respuesta del LLM es JSON malformado",
      "Retorna processed=0, errors=1 si el LLM falla — no lanza un 500",
    ],
  },
  {
    id: "update_management_status",
    method: "PATCH",
    path: "/api/companies/:id/management-status",
    description:
      "Actualiza el estado del workflow de gestión semanal para una empresa. Usado por el kanban de gestión y los botones de acción rápida.",
    auth_required: true,
    path_params: {
      id: "string (UUID) — ID de la empresa",
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
      "Transmite un análisis de riesgo estructurado vía Server-Sent Events (SSE). Analiza datos internos del portafolio y contexto sectorial del modelo. No realiza búsqueda web en tiempo real. Guarda automáticamente el análisis completo como nota al terminar.",
    auth_required: true,
    path_params: {
      id: "string (UUID) — ID de la empresa",
    },
    request: null,
    response: {
      content_type: "text/event-stream",
      events: [
        {
          type: "delta",
          shape: { type: "delta", text: "string" },
          description: "Fragmento de texto transmitido",
        },
        {
          type: "done",
          shape: { type: "done", noteId: "string | null" },
          description: "Stream completo. noteId es el UUID de la nota guardada.",
        },
        {
          type: "error",
          shape: { type: "error", message: "string" },
          description: "Stream fallido. El cliente debe mostrar el mensaje.",
        },
      ],
      sections:
        "Análisis del Portfolio Interno | Contexto de Riesgo Externo | Recomendaciones para el KAM",
    },
    notes: [
      "Usa edge runtime — sin APIs de Node.js",
      "Modelo: llama-3.3-70b-versatile vía Groq (streaming)",
      "Sin reintento si el stream falla",
    ],
  },
  {
    id: "reset_management_status",
    method: "POST",
    path: "/api/companies/management-status/reset",
    description:
      "Resetea todas las empresas del KAM autenticado a management_status='por_gestionar'. Para uso al inicio de cada semana.",
    auth_required: true,
    request: null,
    response: {
      status: 200,
      shape: { data: { updated: "number" }, error: null },
    },
  },
];

function isSseResponse(
  r: JsonResponse | SseResponse
): r is SseResponse {
  return "content_type" in r && r.content_type === "text/event-stream";
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">
            Cepelin KAM CRM — API Reference
          </h1>
          <p className="mt-1 text-sm text-gray-500">v1.0.0 · Base URL: https://cepelin-crm.vercel.app</p>

          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <strong>Autenticación requerida:</strong> Todos los endpoints requieren una sesión autenticada vía Google OAuth. La cookie de sesión se establece automáticamente después del login. Las solicitudes no autenticadas retornan HTTP 401.
          </div>
        </div>

        {/* Error envelope */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-gray-800">Formato de respuesta</h2>
          <p className="mb-3 text-sm text-gray-600">
            Todas las respuestas usan el mismo envelope. En éxito:{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{"{ data: T, error: null }"}</code>.
            En error:{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{"{ data: null, error: string }"}</code>.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["400", "Cuerpo o parámetros inválidos"],
              ["401", "Sin sesión válida"],
              ["404", "Recurso no encontrado o de otro KAM"],
              ["500", "Error interno del servidor"],
            ].map(([code, label]) => (
              <div key={code} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                <span className="block text-sm font-semibold text-gray-800">{code}</span>
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Endpoints */}
        <div className="space-y-6">
          {ENDPOINTS.map((ep) => (
            <div
              key={ep.id}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              {/* Endpoint header */}
              <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                <span
                  className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold tracking-wide ${METHOD_STYLES[ep.method] ?? "bg-gray-100 text-gray-700"}`}
                >
                  {ep.method}
                </span>
                <code className="text-sm font-semibold text-gray-800">{ep.path}</code>
              </div>

              <div className="px-5 py-4 space-y-4">
                <p className="text-sm text-gray-600">{ep.description}</p>

                {/* Path params */}
                {ep.path_params && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Parámetros de ruta
                    </h3>
                    <div className="space-y-1">
                      {Object.entries(ep.path_params).map(([param, desc]) => (
                        <div key={param} className="flex gap-2 text-sm">
                          <code className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                            :{param}
                          </code>
                          <span className="text-gray-500">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Request body */}
                {ep.request && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Request body{" "}
                      <span className="normal-case font-normal text-gray-400">
                        ({ep.request.content_type})
                      </span>
                    </h3>
                    <div className="space-y-1">
                      {Object.entries(ep.request.body).map(([field, type]) => (
                        <div key={field} className="flex gap-2 text-sm">
                          <code className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                            {field}
                          </code>
                          <span className="text-gray-500">{type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Response */}
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Respuesta
                  </h3>
                  {isSseResponse(ep.response) ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">
                        Content-Type: <code className="rounded bg-gray-100 px-1 py-0.5">text/event-stream</code>
                      </p>
                      <p className="text-xs text-gray-500">
                        Secciones: {ep.response.sections}
                      </p>
                      <div className="space-y-1">
                        {ep.response.events.map((ev) => (
                          <div key={ev.type} className="flex gap-2 text-sm">
                            <code className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                              {ev.type}
                            </code>
                            <span className="text-gray-500">{ev.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2 text-sm">
                        <code className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                          {ep.response.status}
                        </code>
                        <code className="text-xs text-gray-500">
                          {JSON.stringify(ep.response.shape)}
                        </code>
                      </div>
                      {ep.response.fields && (
                        <div className="space-y-1">
                          {Object.entries(ep.response.fields).map(([field, desc]) => (
                            <div key={field} className="flex gap-2 text-sm">
                              <code className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                                {field}
                              </code>
                              <span className="text-gray-500">{desc}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {ep.notes && ep.notes.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Notas
                    </h3>
                    <ul className="space-y-1">
                      {ep.notes.map((note, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-500">
                          <span className="mt-0.5 shrink-0 text-gray-300">•</span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-gray-400">
          Cepelin KAM CRM · API Reference v1.0.0
        </p>
      </div>
    </div>
  );
}
