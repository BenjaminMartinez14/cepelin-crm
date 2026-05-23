import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthedKam } from "@/lib/auth";
import { addNote } from "@/lib/db/invoices";
import type { ApiResponse, Note } from "@/types";

const bodySchema = z.object({ content: z.string().trim().min(1).max(2000) });

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<Note>>> {
  const supabase = createClient();

  const kam = await getAuthedKam(supabase);
  if (!kam) {
    return NextResponse.json({ data: null, error: "No autorizado" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: "El contenido de la nota es inválido" },
      { status: 400 },
    );
  }

  try {
    // RLS rejects the insert if this KAM does not own the company.
    const note = await addNote(supabase, params.id, kam.id, parsed.data.content);
    if (!note) {
      return NextResponse.json(
        { data: null, error: "Empresa no encontrada" },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: note, error: null }, { status: 201 });
  } catch {
    return NextResponse.json(
      { data: null, error: "No se pudo guardar la nota" },
      { status: 500 },
    );
  }
}
