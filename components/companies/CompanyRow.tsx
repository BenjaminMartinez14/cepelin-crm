"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { TableCell, TableRow } from "@/components/ui/table";
import { CompanyStatusBadge } from "@/components/StatusBadge";
import {
  countryFlag,
  creditRiskClass,
  creditRiskLabel,
  formatCurrency,
  formatDaysSince,
  taxIdLabel,
  urgencyLevel,
  urgencyTextClass,
} from "@/lib/format";
import type { CompanyMetrics } from "@/types";

const URGENT_STATUSES: { key: string; label: string; dotClass: string }[] = [
  { key: "in_collection", label: "en cobranza", dotClass: "bg-red-500" },
  { key: "assigned_competitor", label: "competidor", dotClass: "bg-amber-500" },
];

function InvoiceStatusPills({
  companyId,
  counts,
  activePillStatus,
  onPillClick,
}: {
  companyId: string;
  counts: Record<string, number> | null;
  activePillStatus?: string;
  onPillClick?: (companyId: string, status: string) => void;
}) {
  if (!counts) return null;
  const pills = URGENT_STATUSES.filter(({ key }) => (counts[key] ?? 0) > 0);
  if (pills.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {pills.map(({ key, label, dotClass }) => (
        <button
          key={key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPillClick?.(companyId, key);
          }}
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
            activePillStatus === key
              ? "bg-muted-foreground/20 text-foreground ring-1 ring-border"
              : "bg-muted text-muted-foreground hover:bg-muted-foreground/15"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
          {counts[key]} {label}
          {activePillStatus === key
            ? <ChevronUp className="h-2.5 w-2.5" />
            : <ChevronDown className="h-2.5 w-2.5" />}
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
        <div className="font-medium text-foreground">
          <span className="mr-1.5">{countryFlag(company.country)}</span>{company.name}
        </div>
        <div className="text-xs text-muted-foreground">
          {taxIdLabel(company.country)} {company.tax_id}
        </div>
        <InvoiceStatusPills
          companyId={company.id}
          counts={company.invoice_status_counts}
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

      <TableCell className="py-3.5 text-right">
        {company.credit_risk_score === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className={`tabular-nums text-sm font-medium ${creditRiskClass(company.credit_risk_score)}`}>
            {company.credit_risk_score} <span className="text-xs font-normal">{creditRiskLabel(company.country)}</span>
          </span>
        )}
      </TableCell>

      <TableCell className="py-3.5 text-right">
        {company.health_score === null || (company.health_score === 0 && company.ai_generated_at === null) ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex items-center justify-end gap-1.5">
            <span className="tabular-nums text-sm font-medium text-foreground">
              {company.health_score}
            </span>
            <span
              className={`inline-block h-2 w-2 rounded-full ${churnDotClass(company.churn_risk)}`}
            />
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
