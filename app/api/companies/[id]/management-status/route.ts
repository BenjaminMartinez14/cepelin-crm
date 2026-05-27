import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthedKam } from "@/lib/auth";
import { updateManagementStatus } from "@/lib/db/companies";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  status: z.enum(["por_gestionar", "en_seguimiento", "gestionado", "en_pausa"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<{ updated: boolean }>>> {
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

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ data: null, error: "ID inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: "Estado inválido" },
      { status: 400 },
    );
  }

  try {
    const updated = await updateManagementStatus(supabase, params.id, parsed.data.status);
    return NextResponse.json({ data: { updated }, error: null });
  } catch (err) {
    console.error("management-status PATCH failed:", err);
    return NextResponse.json(
      { data: null, error: "No se pudo actualizar el estado" },
      { status: 500 },
    );
  }
}
