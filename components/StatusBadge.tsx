import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";
import type { CompanyStatus, InvoiceStatus } from "@/types";

const COMPANY_VARIANTS: Record<CompanyStatus, string> = {
  enrolled:  "bg-slate-100 text-slate-600 border border-slate-200",
  active:    "bg-blue-50 text-blue-700 border border-blue-200",
  recurring: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

const INVOICE_VARIANTS: Record<InvoiceStatus, string> = {
  // 🔴 Red — problematic, cannot factor
  reclamada:            "bg-red-50 text-red-700 border border-red-200",
  protestada:           "bg-red-50 text-red-700 border border-red-200",
  cancelada:            "bg-red-50 text-red-700 border border-red-200",
  // 🟠 Orange — pending SII validation / debtor delivery
  emitida:              "bg-orange-50 text-orange-700 border border-orange-200",
  aceptada_sii:         "bg-orange-50 text-orange-700 border border-orange-200",
  entregada_receptor:   "bg-orange-50 text-orange-700 border border-orange-200",
  // 🟡 Amber — in process / competitor assigned
  en_cobranza:          "bg-amber-50 text-amber-700",
  cedida_competencia:   "bg-amber-50 text-amber-700",
  cedida_mx:            "bg-amber-50 text-amber-700",
  // 🔵 Blue — confirmed / safe to factor / Xepelin-assigned
  acuse_recibo:         "bg-blue-50 text-blue-700 border border-blue-200",
  merito_ejecutivo:     "bg-blue-50 text-blue-700 border border-blue-200",
  cedida_xepelin:       "bg-blue-50 text-blue-700 border border-blue-200",
  // 🟢 Emerald — completed
  cobrada:              "bg-emerald-50 text-emerald-700",
  // ⚪ Slate — neutral / active CFDI
  vigente:              "bg-slate-100 text-slate-600",
};

export function CompanyStatusBadge({ status }: { status: CompanyStatus }) {
  return (
    <Badge variant="secondary" className={COMPANY_VARIANTS[status]}>
      {statusLabel(status)}
    </Badge>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant="secondary" className={INVOICE_VARIANTS[status]}>
      {statusLabel(status)}
    </Badge>
  );
}
