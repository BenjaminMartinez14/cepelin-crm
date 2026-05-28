import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthedKam } from "@/lib/auth";
import { insertGestion, listGestiones } from "@/lib/db/gestiones";
import type { ApiResponse, Gestion } from "@/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GESTION_TYPES = [
  "llamada_realizada",
  "whatsapp_enviado",
  "email_enviado",
  "reunion_agendada",
  "cliente_pidio_esperar",
  "no_contesto",
] as const;

const bodySchema = z.object({
  type: z.enum(GESTION_TYPES),
  notes: z.string().trim().max(500).optional(),
  recontact_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<Gestion>>> {
  const supabase = createClient();
  const kam = await getAuthedKam(supabase);
  if (!kam) return NextResponse.json({ data: null, error: "No autorizado" }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ data: null, error: "ID de empresa inválido" }, { status: 400 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  try {
    const gestion = await insertGestion(supabase, params.id, kam.id, parsed.data.type, parsed.data.recontact_date, parsed.data.notes);
    if (!gestion) return NextResponse.json({ data: null, error: "Empresa no encontrada" }, { status: 404 });
    return NextResponse.json({ data: gestion, error: null }, { status: 201 });
  } catch {
    return NextResponse.json({ data: null, error: "No se pudo registrar la gestión" }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<Gestion[]>>> {
  const supabase = createClient();
  const kam = await getAuthedKam(supabase);
  if (!kam) return NextResponse.json({ data: null, error: "No autorizado" }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ data: null, error: "ID de empresa inválido" }, { status: 400 });

  try {
    const gestiones = await listGestiones(supabase, params.id);
    return NextResponse.json({ data: gestiones, error: null });
  } catch {
    return NextResponse.json({ data: null, error: "No se pudo cargar las gestiones" }, { status: 500 });
  }
}
