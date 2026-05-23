import type { Country } from "@/types";

const CURRENCY_BY_COUNTRY: Record<Country, { currency: string; locale: string }> = {
  CL: { currency: "CLP", locale: "es-CL" },
  MX: { currency: "MXN", locale: "es-MX" },
};

export function formatCurrency(amount: number, country: Country): string {
  const { currency, locale } = CURRENCY_BY_COUNTRY[country];
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// CL companies use a RUT; MX companies use an RFC.
export function taxIdLabel(country: Country): string {
  return country === "CL" ? "RUT" : "RFC";
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export type UrgencyLevel = "fresh" | "warning" | "stale";

// Days since last Cepelin operation drives churn urgency.
// null (never operated) is treated as the most urgent.
export function urgencyLevel(daysSinceLastOp: number | null): UrgencyLevel {
  if (daysSinceLastOp === null || daysSinceLastOp > 30) return "stale";
  if (daysSinceLastOp >= 15) return "warning";
  return "fresh";
}

export function urgencyTextClass(level: UrgencyLevel): string {
  switch (level) {
    case "fresh":
      return "text-green-600";
    case "warning":
      return "text-yellow-600";
    case "stale":
      return "text-red-600";
  }
}

export function formatDaysSince(daysSinceLastOp: number | null): string {
  if (daysSinceLastOp === null) return "Sin operaciones";
  if (daysSinceLastOp === 0) return "Hoy";
  return `${daysSinceLastOp} d`;
}

const STATUS_LABELS: Record<string, string> = {
  enrolled: "Enrolada",
  active: "Activa",
  recurring: "Recurrente",
  issued: "Emitida",
  assigned_cepelin: "Cedida a Cepelin",
  assigned_competitor: "Cedida a competencia",
  in_collection: "En cobranza",
  collected: "Cobrada",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function countryFlag(country: Country): string {
  return country === "CL" ? "🇨🇱" : "🇲🇽";
}

export function creditRiskLabel(country: Country): string {
  return country === "CL" ? "DICOM" : "Buró";
}

export function creditRiskClass(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score < 30) return "text-emerald-400";
  if (score <= 60) return "text-amber-400";
  return "text-red-400";
}
