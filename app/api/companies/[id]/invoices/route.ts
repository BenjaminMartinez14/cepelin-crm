import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthedKam } from "@/lib/auth";
import type { ApiResponse, InvoiceWithDebtor } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<InvoiceWithDebtor[]>>> {
  const supabase = createClient();

  const kam = await getAuthedKam(supabase);
  if (!kam) {
    return NextResponse.json({ data: null, error: "No autorizado" }, { status: 401 });
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ data: null, error: "ID de empresa inválido" }, { status: 400 });
  }

  const status = new URL(request.url).searchParams.get("status");

  try {
    let q = supabase
      .from("invoices")
      .select("id, company_id, debtor_id, amount, issued_at, status, debtors(name)")
      .eq("company_id", params.id)
      .order("issued_at", { ascending: false });

    if (status) q = q.eq("status", status);

    const { data, error } = await q;

    if (error) throw error;

    const ACTIVE = new Set(["emitida","entregada_receptor","acuse_recibo","merito_ejecutivo","cedida_xepelin","cedida_competencia","en_cobranza","reclamada","protestada","vigente","cedida_mx","cancelada"]);
    const invoices: InvoiceWithDebtor[] = (data ?? []).map((row) => ({
      id: row.id,
      company_id: row.company_id,
      debtor_id: row.debtor_id,
      amount: row.amount,
      issued_at: row.issued_at,
      status: row.status,
      debtor_name: (row.debtors as unknown as { name: string } | null)?.name ?? "",
      is_active: ACTIVE.has(row.status),
    }));

    return NextResponse.json({ data: invoices, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "No se pudieron cargar las facturas" },
      { status: 500 },
    );
  }
}
