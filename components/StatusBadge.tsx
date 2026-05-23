import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";
import type { CompanyStatus, InvoiceStatus } from "@/types";

const COMPANY_VARIANTS: Record<CompanyStatus, string> = {
  enrolled:  "bg-slate-700/40 text-slate-300 border border-slate-600",
  active:    "bg-blue-900/40 text-blue-300 border border-blue-700",
  recurring: "bg-emerald-900/40 text-emerald-300 border border-emerald-700",
};

const INVOICE_VARIANTS: Record<InvoiceStatus, string> = {
  issued:              "bg-slate-700/40 text-slate-300",
  assigned_cepelin:    "bg-emerald-900/40 text-emerald-300",
  assigned_competitor: "bg-red-900/40 text-red-300",
  in_collection:       "bg-amber-900/40 text-amber-300",
  collected:           "bg-teal-900/40 text-teal-300",
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
