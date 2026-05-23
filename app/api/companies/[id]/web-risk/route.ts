import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthedKam } from "@/lib/auth";
import { streamWebRiskAnalysis } from "@/lib/ai/web-risk";
import type { CompanyMetrics } from "@/types";

export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const encoder = new TextEncoder();

function send(
  controller: ReadableStreamDefaultController,
  obj: Record<string, unknown>,
) {
  controller.enqueue(encoder.encode("data: " + JSON.stringify(obj) + "\n\n"));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse | Response> {
  // Auth — must happen before ReadableStream (cookies() only works in request context)
  const supabase = createClient();

  let kam;
  try {
    kam = await getAuthedKam(supabase);
  } catch {
    return NextResponse.json({ data: null, error: "Error de autenticación" }, { status: 500 });
  }
  if (!kam) {
    return NextResponse.json({ data: null, error: "No autorizado" }, { status: 401 });
  }

  // Validate UUID
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ data: null, error: "ID de empresa inválido" }, { status: 400 });
  }

  // Fetch company from view (RLS auto-scopes to KAM)
  const { data: company, error: fetchErr } = await supabase
    .from("company_metrics")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchErr) {
    console.error("company_metrics fetch failed:", fetchErr.message);
    return NextResponse.json(
      { data: null, error: "No se pudo obtener la empresa" },
      { status: 500 },
    );
  }
  if (!company) {
    return NextResponse.json({ data: null, error: "Empresa no encontrada" }, { status: 404 });
  }

  const { name, country, tax_id } = company as CompanyMetrics;
  const companyId = params.id;
  const kamId = kam.id;

  // AbortController so we can cancel the OpenAI stream if the client disconnects
  const abortController = new AbortController();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const fullText = await streamWebRiskAnalysis({
          company: { name, country, tax_id },
          onChunk: (text) => send(controller, { type: "delta", text }),
          signal: abortController.signal,
        });

        // Persist the analysis as a note
        const { data: insertedNote, error: insertErr } = await supabase
          .from("notes")
          .insert({
            company_id: companyId,
            kam_id: kamId,
            content:
              "[Análisis Web] " +
              new Date().toISOString().slice(0, 10) +
              "\n\n" +
              fullText,
          })
          .select("id")
          .single();

        if (insertErr) {
          console.error("notes insert failed:", insertErr.message);
        }

        send(controller, { type: "done", noteId: insertedNote?.id ?? null });
      } catch {
        send(controller, {
          type: "error",
          message: "No se pudo completar el análisis",
        });
      } finally {
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
