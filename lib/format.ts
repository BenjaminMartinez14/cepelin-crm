import type { Country, UrgencyLabel } from "@/types";

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
  // Company statuses
  enrolled: "Enrolada",
  active: "Activa",
  recurring: "Recurrente",
  // Invoice statuses (SII/SAT lifecycle)
  emitida: "Emitida",
  aceptada_sii: "Aceptada SII",
  entregada_receptor: "Entregada al receptor",
  acuse_recibo: "Acuse de recibo",
  reclamada: "Reclamada",
  merito_ejecutivo: "Mérito ejecutivo",
  cedida_xepelin: "Cedida a Xepelin",
  cedida_competencia: "Cedida a competencia",
  en_cobranza: "En cobranza",
  cobrada: "Cobrada",
  protestada: "Protestada",
  vigente: "Vigente",
  cancelada: "Cancelada",
  cedida_mx: "Cedida a Xepelin MX",
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

export function urgencyLabel(label: UrgencyLabel): string {
  switch (label) {
    case "gestionar_hoy":    return "Gestionar hoy";
    case "gestionar_semana": return "Esta semana";
    case "al_dia":           return "Al día";
    case "sin_accion":       return "Sin acción";
  }
}

export function urgencyLabelClass(label: UrgencyLabel): string {
  switch (label) {
    case "gestionar_hoy":    return "bg-red-50 text-red-700 border border-red-200";
    case "gestionar_semana": return "bg-amber-50 text-amber-700 border border-amber-200";
    case "al_dia":           return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "sin_accion":       return "bg-slate-100 text-slate-500 border border-slate-200";
  }
}

export function urgencyLabelEmoji(label: UrgencyLabel): string {
  switch (label) {
    case "gestionar_hoy":    return "🔴";
    case "gestionar_semana": return "🟡";
    case "al_dia":           return "🟢";
    case "sin_accion":       return "⚪";
  }
}
