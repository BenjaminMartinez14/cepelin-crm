"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { TableCell, TableRow } from "@/components/ui/table";
import { CompanyStatusBadge } from "@/components/StatusBadge";
import { UrgencyBadge } from "@/components/companies/UrgencyBadge";
import { CreditRiskDot } from "@/components/CreditRiskDot";
import {
  countryFlag,
  formatCurrency,
  formatDaysSince,
  taxIdLabel,
  urgencyLevel,
  urgencyTextClass,
  getUrgencyReason,
} from "@/lib/format";
import type { CompanyMetrics, CompanyStatus, InvoiceStatus } from "@/types";

interface PillGroup {
  key: string;
  label: string;
  dotClass: string;
  statuses: InvoiceStatus[];
  onlyForStatus?: CompanyStatus;
}

const PILL_GROUPS: PillGroup[] = [
  { key: "reclamada",          label: "reclamada",        dotClass: "bg-red-500",    statuses: ["reclamada"] },
  { key: "protestada",         label: "protestada",       dotClass: "bg-red-600",    statuses: ["protestada"] },
  { key: "cancelada",          label: "cancelada",        dotClass: "bg-red-500",    statuses: ["cancelada"] },
  { key: "en_cobranza",        label: "en cobranza",      dotClass: "bg-amber-500",  statuses: ["en_cobranza"] },
  { key: "cedida_competencia", label: "competidor",       dotClass: "bg-orange-400", statuses: ["cedida_competencia"] },
  { key: "listas",             label: "listas para ceder",dotClass: "bg-blue-500",   statuses: ["acuse_recibo", "merito_ejecutivo"] },
  { key: "por_ceder",          label: "por ceder",        dotClass: "bg-slate-400",  statuses: ["emitida", "entregada_receptor"], onlyForStatus: "enrolled" },
];

function InvoiceStatusPills({
  company,
  activePillStatus,
  onPillClick,
}: {
  company: CompanyMetrics;
  activePillStatus?: string;
  onPillClick?: (companyId: string, status: string) => void;
}) {
  const counts = company.invoice_status_counts ?? {};
  const pills = PILL_GROUPS.filter((pg) => {
    if (pg.onlyForStatus && company.status !== pg.onlyForStatus) return false;
    return pg.statuses.reduce((s, st) => s + (counts[st] ?? 0), 0) > 0;
  }).map((pg) => ({
    ...pg,
    count: pg.statuses.reduce((s, st) => s + (counts[st] ?? 0), 0),
  }));
  if (pills.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {pills.map(({ key, label, dotClass, count }) => (
        <button
          key={key}
          type="button"
          onClick={(e) => { e.stopPropagation(); onPillClick?.(company.id, key); }}
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
            activePillStatus === key
              ? "bg-muted-foreground/20 text-foreground ring-1 ring-border"
              : "bg-muted text-muted-foreground hover:bg-muted-foreground/15"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
          {count} {label}
          {activePillStatus === key ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
        </button>
      ))}
    </div>
  );
}

function churnDotClass(risk: "low" | "medium" | "high" | null): string {
  if (risk === "low") return "bg-emerald-400";
  if (risk === "medium") return "bg-amber-400";
  if (risk === "high") return "bg-red-400";
  return "bg-muted";
}

interface CompanyRowProps {
  company: CompanyMetrics;
  onPillClick?: (companyId: string, status: string) => void;
  activePillStatus?: string;
}

export function CompanyRow({ company, onPillClick, activePillStatus }: CompanyRowProps) {
  const router = useRouter();
  const sow = company.sow_percentage ?? 0;
  const urgency = urgencyLevel(company.days_since_last_op);

  return (
    <TableRow
      className="cursor-pointer transition-colors duration-150 hover:bg-primary/5"
      onClick={() => router.push(`/dashboard/${company.id}`)}
    >
      <TableCell className="py-3.5">
        <UrgencyBadge label={company.urgency_label} />
        {getUrgencyReason(company) && (
          <p className="mt-0.5 max-w-[160px] truncate text-xs text-muted-foreground">
            {getUrgencyReason(company)}
          </p>
        )}
      </TableCell>

      <TableCell className="py-3.5">
        <div className="font-medium text-foreground">
          <span className="mr-1.5">{countryFlag(company.country)}</span>{company.name}
        </div>
        <div className="text-xs text-muted-foreground">
          {taxIdLabel(company.country)} {company.tax_id}
        </div>
        <InvoiceStatusPills
          company={company}
          activePillStatus={activePillStatus}
          onPillClick={onPillClick}
        />
      </TableCell>

      <TableCell className="py-3.5">
        <CompanyStatusBadge status={company.status} />
      </TableCell>

      <TableCell className="py-3.5 text-right tabular-nums text-sm">
        {formatCurrency(company.volume_60d, company.country)}
      </TableCell>

      <TableCell
        className={`py-3.5 text-right tabular-nums text-sm font-medium ${urgencyTextClass(urgency)}`}
      >
        {formatDaysSince(company.days_since_last_op)}
      </TableCell>

      <TableCell className="py-3.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(sow, 100)}%` }}
            />
          </div>
          <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
            {company.sow_percentage === null ? "—" : `${Math.round(sow)}%`}
          </span>
        </div>
      </TableCell>

      <TableCell className="py-3.5 text-center">
        <CreditRiskDot score={company.credit_risk_score} country={company.country} />
      </TableCell>

      <TableCell className="py-3.5 text-right">
        {company.health_score === null || (company.health_score === 0 && company.ai_generated_at === null) ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <span className="tabular-nums text-sm font-semibold text-foreground">
              {company.health_score}
            </span>
            <span
              className={`inline-block h-3 w-3 rounded-full ${churnDotClass(company.churn_risk)}`}
            />
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
