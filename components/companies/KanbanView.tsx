"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  countryFlag,
  formatCurrency,
  formatDaysSince,
  taxIdLabel,
  urgencyLevel,
  urgencyTextClass,
  getUrgencyReason,
} from "@/lib/format";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import type { CompanyMetrics, CompanyStatus, UrgencyLabel } from "@/types";

const COLUMNS: {
  status: CompanyStatus;
  label: string;
  headerClass: string;
  borderClass: string;
}[] = [
  { status: "enrolled",  label: "Enrolada",   headerClass: "text-muted-foreground", borderClass: "border-border"        },
  { status: "active",    label: "Activa",      headerClass: "text-blue-600",         borderClass: "border-blue-200"      },
  { status: "recurring", label: "Recurrente",  headerClass: "text-emerald-600",      borderClass: "border-emerald-200"   },
];

const URGENT_STATUSES = [
  { key: "reclamada",          label: "reclamada",   dotClass: "bg-red-500"    },
  { key: "en_cobranza",        label: "en cobranza", dotClass: "bg-amber-500"  },
  { key: "cedida_competencia", label: "competidor",  dotClass: "bg-orange-400" },
];

function urgencyBorderClass(label: UrgencyLabel): string {
  if (label === "gestionar_hoy")    return "border-l-2 border-l-red-400";
  if (label === "gestionar_semana") return "border-l-2 border-l-amber-400";
  if (label === "al_dia")           return "border-l-2 border-l-emerald-400";
  return "";
}

function churnDotClass(risk: "low" | "medium" | "high" | null): string {
  if (risk === "low")    return "bg-emerald-400";
  if (risk === "medium") return "bg-amber-400";
  if (risk === "high")   return "bg-red-400";
  return "bg-muted";
}

function CompanyCard({
  company,
  openCard,
  onPillClick,
}: {
  company: CompanyMetrics;
  openCard: { companyId: string; status: string } | null;
  onPillClick: (companyId: string, status: string) => void;
}) {
  const router = useRouter();
  const urgency = urgencyLevel(company.days_since_last_op);
  const sow = company.sow_percentage ?? 0;
  const pills = URGENT_STATUSES.filter(
    ({ key }) => (company.invoice_status_counts?.[key] ?? 0) > 0,
  );
  const isOpen = openCard?.companyId === company.id;
  const activeStatus = isOpen ? openCard!.status : null;
  const visibleInvoices = isOpen
    ? (company.urgent_invoices ?? []).filter((inv) => inv.status === openCard!.status)
    : [];

  const healthNotGenerated =
    company.health_score === null ||
    (company.health_score === 0 && company.ai_generated_at === null);

  return (
    <div
      className={`rounded-md border border-border bg-card shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 ${urgencyBorderClass(company.urgency_label)}`}
      onClick={() => router.push(`/dashboard/${company.id}`)}
    >
      <div className="cursor-pointer p-3">
        <div className="mb-0.5 text-sm font-medium leading-tight text-foreground">
          <span className="mr-1">{countryFlag(company.country)}</span>
          {company.name}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {taxIdLabel(company.country)} {company.tax_id}
        </div>
        {getUrgencyReason(company) && (
          <p className="mb-2 mt-0.5 truncate text-[11px] text-muted-foreground">
            {getUrgencyReason(company)}
          </p>
        )}

        <div className="mb-2 flex items-center justify-between gap-2">
          {healthNotGenerated ? (
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
              <button
                key={key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPillClick(company.id, key);
                }}
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  activeStatus === key
                    ? "bg-muted-foreground/20 text-foreground ring-1 ring-border"
                    : "bg-muted text-muted-foreground hover:bg-muted-foreground/15"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                {company.invoice_status_counts![key]} {label}
                {activeStatus === key
                  ? <ChevronUp className="h-2.5 w-2.5" />
                  : <ChevronDown className="h-2.5 w-2.5" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {isOpen && (
        <div
          className="border-t border-border/40 px-3 pb-3 pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          {visibleInvoices.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin facturas.</p>
          ) : (
            <div className="space-y-1.5">
              {visibleInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-foreground">{inv.debtor_name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatCurrency(inv.amount, company.country)}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatDaysSince(inv.days_since_issued)}
                  </span>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function KanbanView({ companies }: { companies: CompanyMetrics[] }) {
  const [openCard, setOpenCard] = useState<{ companyId: string; status: string } | null>(null);

  function handlePillClick(companyId: string, status: string) {
    setOpenCard((prev) =>
      prev?.companyId === companyId && prev.status === status ? null : { companyId, status }
    );
  }

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
                  <CompanyCard
                    key={company.id}
                    company={company}
                    openCard={openCard}
                    onPillClick={handlePillClick}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
