import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";
import type { CompanyStatus, InvoiceStatus } from "@/types";

const COMPANY_VARIANTS: Record<CompanyStatus, string> = {
  enrolled:  "bg-slate-100 text-slate-600 border border-slate-200",
  active:    "bg-blue-50 text-blue-700 border border-blue-200",
  recurring: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

const INVOICE_VARIANTS: Record<InvoiceStatus, string> = {
  issued:              "bg-slate-100 text-slate-600",
  assigned_cepelin:    "bg-emerald-50 text-emerald-700",
  assigned_competitor: "bg-red-50 text-red-700",
  in_collection:       "bg-amber-50 text-amber-700",
  collected:           "bg-teal-50 text-teal-700",
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
