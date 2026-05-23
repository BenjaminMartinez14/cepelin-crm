import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthedKam } from "@/lib/auth";
import { getCompanyDetail } from "@/lib/db/companies";
import type { ApiResponse, CompanyDetail } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<CompanyDetail>>> {
  const supabase = createClient();

  const kam = await getAuthedKam(supabase);
  if (!kam) {
    return NextResponse.json({ data: null, error: "No autorizado" }, { status: 401 });
  }

  try {
    const detail = await getCompanyDetail(supabase, params.id);
    if (!detail) {
      return NextResponse.json(
        { data: null, error: "Empresa no encontrada" },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: detail, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "No se pudo cargar la empresa" },
      { status: 500 },
    );
  }
}
