"use client";

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

function churnDotClass(risk: "low" | "medium" | "high" | null): string {
  if (risk === "low") return "bg-emerald-400";
  if (risk === "medium") return "bg-amber-400";
  if (risk === "high") return "bg-red-400";
  return "bg-muted";
}

export function CompanyRow({ company }: { company: CompanyMetrics }) {
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
        {company.health_score === null ? (
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
