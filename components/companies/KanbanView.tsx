"use client";

import { useRouter } from "next/navigation";
import {
  countryFlag,
  formatCurrency,
  formatDaysSince,
  taxIdLabel,
  urgencyLevel,
  urgencyTextClass,
} from "@/lib/format";
import type { CompanyMetrics, CompanyStatus } from "@/types";

const COLUMNS: {
  status: CompanyStatus;
  label: string;
  headerClass: string;
  borderClass: string;
}[] = [
  { status: "enrolled",  label: "Enrolada",   headerClass: "text-slate-400",   borderClass: "border-slate-700" },
  { status: "active",    label: "Activa",      headerClass: "text-blue-400",    borderClass: "border-blue-800"  },
  { status: "recurring", label: "Recurrente",  headerClass: "text-emerald-400", borderClass: "border-emerald-800" },
];

const URGENT_STATUSES = [
  { key: "in_collection",       label: "en cobranza", dotClass: "bg-red-500"   },
  { key: "assigned_competitor", label: "competidor",  dotClass: "bg-amber-500" },
];

function churnDotClass(risk: "low" | "medium" | "high" | null): string {
  if (risk === "low")    return "bg-emerald-400";
  if (risk === "medium") return "bg-amber-400";
  if (risk === "high")   return "bg-red-400";
  return "bg-muted";
}

function CompanyCard({ company }: { company: CompanyMetrics }) {
  const router = useRouter();
  const urgency = urgencyLevel(company.days_since_last_op);
  const sow = company.sow_percentage ?? 0;
  const pills = URGENT_STATUSES.filter(
    ({ key }) => (company.invoice_status_counts?.[key] ?? 0) > 0,
  );

  return (
    <div
      className="cursor-pointer rounded-md border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
      onClick={() => router.push(`/dashboard/${company.id}`)}
    >
      <div className="mb-0.5 text-sm font-medium leading-tight text-foreground">
        <span className="mr-1">{countryFlag(company.country)}</span>
        {company.name}
      </div>
      <div className="mb-2.5 text-[11px] text-muted-foreground">
        {taxIdLabel(company.country)} {company.tax_id}
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        {company.health_score === null ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium tabular-nums text-foreground">
              {company.health_score}
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${churnDotClass(company.churn_risk)}`} />
          </div>
        )}
        <span className={`text-xs font-medium tabular-nums ${urgencyTextClass(urgency)}`}>
          {formatDaysSince(company.days_since_last_op)}
        </span>
      </div>

      <div className="mb-2 text-xs tabular-nums text-muted-foreground">
        {formatCurrency(company.volume_60d, company.country)}
      </div>

      <div className="mb-2 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${Math.min(sow, 100)}%` }}
          />
        </div>
        <span className="w-7 text-right text-[11px] tabular-nums text-muted-foreground">
          {company.sow_percentage === null ? "—" : `${Math.round(sow)}%`}
        </span>
      </div>

      {pills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pills.map(({ key, label, dotClass }) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
              {company.invoice_status_counts![key]} {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function KanbanView({ companies }: { companies: CompanyMetrics[] }) {
  return (
    <div className="flex gap-4" style={{ height: "calc(100vh - 220px)" }}>
      {COLUMNS.map(({ status, label, headerClass, borderClass }) => {
        const col = companies.filter((c) => c.status === status);
        return (
          <div
            key={status}
            className={`flex flex-1 flex-col overflow-hidden rounded-lg border ${borderClass} bg-muted/20`}
          >
            <div className={`flex items-center justify-between border-b ${borderClass} px-3 py-2.5`}>
              <span className={`text-sm font-semibold ${headerClass}`}>{label}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{col.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {col.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">Sin empresas</p>
              ) : (
                col.map((company) => (
                  <CompanyCard key={company.id} company={company} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
