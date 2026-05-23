"use client";

import { useRouter } from "next/navigation";
import { TableCell, TableRow } from "@/components/ui/table";
import { CompanyStatusBadge } from "@/components/StatusBadge";
import {
  formatCurrency,
  formatDaysSince,
  taxIdLabel,
  urgencyLevel,
  urgencyTextClass,
} from "@/lib/format";
import type { CompanyMetrics } from "@/types";

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
        <div className="font-medium text-foreground">{company.name}</div>
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
    </TableRow>
  );
}
