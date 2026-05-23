import { formatCurrency, formatDaysSince, urgencyLevel, urgencyTextClass } from "@/lib/format";
import type { CompanyMetrics } from "@/types";

function Metric({
  title,
  value,
  hint,
  valueClass,
  accent = false,
}: {
  title: string;
  value: string;
  hint?: string;
  valueClass?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${accent ? "border-l-2 border-l-primary" : ""}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums tracking-tight ${valueClass ?? "text-foreground"}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function MetricsRow({ company }: { company: CompanyMetrics }) {
  const usedPct =
    company.credit_limit > 0
      ? Math.round((company.credit_used / company.credit_limit) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric
        title="Volumen 60 días"
        value={formatCurrency(company.volume_60d, company.country)}
        hint="Procesado con Cepelin"
        accent
      />
      <Metric
        title="Última operación"
        value={formatDaysSince(company.days_since_last_op)}
        valueClass={urgencyTextClass(urgencyLevel(company.days_since_last_op))}
        hint="Días desde la última cesión"
      />
      <Metric
        title="Share of Wallet"
        value={company.sow_percentage === null ? "—" : `${Math.round(company.sow_percentage)}%`}
        hint="Cepelin vs. total cedido"
      />
      <Metric
        title="Línea disponible"
        value={formatCurrency(company.credit_available, company.country)}
        hint={`${usedPct}% usado de ${formatCurrency(company.credit_limit, company.country)}`}
      />
    </div>
  );
}
