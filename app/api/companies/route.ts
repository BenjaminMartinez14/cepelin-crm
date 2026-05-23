import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthedKam } from "@/lib/auth";
import { listCompanies } from "@/lib/db/companies";
import type { ApiResponse, CompanyMetrics } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<CompanyMetrics[]>>> {
  const supabase = createClient();

  const kam = await getAuthedKam(supabase);
  if (!kam) {
    return NextResponse.json({ data: null, error: "No autorizado" }, { status: 401 });
  }

  try {
    const companies = await listCompanies(supabase);
    return NextResponse.json({ data: companies, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "No se pudieron cargar las empresas" },
      { status: 500 },
    );
  }
}
