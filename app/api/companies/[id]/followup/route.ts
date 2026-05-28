import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthedKam } from "@/lib/auth";
import { updateFollowup } from "@/lib/db/companies";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<{ next_followup_date: string | null }>>> {
  const supabase = createClient();

  const kam = await getAuthedKam(supabase);
  if (!kam) {
    return NextResponse.json({ data: null, error: "No autorizado" }, { status: 401 });
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ data: null, error: "ID de empresa inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: "Fecha inválida (formato esperado YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  try {
    const ok = await updateFollowup(supabase, params.id, parsed.data.date);
    if (!ok) {
      return NextResponse.json(
        { data: null, error: "Empresa no encontrada" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      data: { next_followup_date: parsed.data.date },
      error: null,
    });
  } catch {
    return NextResponse.json(
      { data: null, error: "No se pudo actualizar el seguimiento" },
      { status: 500 },
    );
  }
}
