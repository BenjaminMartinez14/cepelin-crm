"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CompanyStatus } from "@/types";

const KNOWN_KEYWORDS = [
  "Falabella", "Walmart", "Cencosud", "Codelco", "FEMSA",
  "Grupo Bimbo", "Arca Continental", "Cemex", "CMPC", "Sodimac",
  "Antofagasta Minerals",
];

function isKnown(name: string): boolean {
  return KNOWN_KEYWORDS.some((kw) => name.includes(kw));
}

function clientDot(status: CompanyStatus, hasReclamada: boolean) {
  if (status === "recurring" && !hasReclamada) return { dot: "bg-emerald-500", label: "Recurrente", detail: "3+ operaciones previas con Xepelin" };
  if (status === "active"    && !hasReclamada) return { dot: "bg-amber-500",   label: "Activo",     detail: "1–2 operaciones previas con Xepelin" };
  return { dot: "bg-red-500", label: "Sin historial", detail: hasReclamada ? "Historial de facturas reclamadas" : "0 operaciones previas con Xepelin" };
}

function debtorDot(name: string) {
  if (!name || name === "—") return { dot: "bg-red-500",     label: name || "Desconocido", detail: "Deudor desconocido" };
  if (isKnown(name))          return { dot: "bg-emerald-500", label: name,                  detail: "Sin deudas registradas" };
  return                             { dot: "bg-amber-500",   label: name,                  detail: "Deudas menores registradas" };
}

function recommendation(cDot: string, dDot: string): string {
  if (cDot === "bg-red-500" || dDot === "bg-red-500") return "Revisar antes de ceder";
  if (cDot === "bg-emerald-500" && dDot === "bg-emerald-500") return "Factura de alta prioridad";
  return "Factura con riesgo moderado";
}

interface Props {
  companyStatus: CompanyStatus;
  hasReclamada: boolean;
  debtorName: string;
}

export function InvoiceQualityDots({ companyStatus, hasReclamada, debtorName }: Props) {
  const c = clientDot(companyStatus, hasReclamada);
  const d = debtorDot(debtorName);
  const rec = recommendation(c.dot, d.dot);

  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex cursor-help items-center gap-0.5 border-0 bg-transparent p-0">
        <span className={`inline-block h-2 w-2 rounded-full ${c.dot}`} />
        <span className={`inline-block h-2 w-2 rounded-full ${d.dot}`} />
      </TooltipTrigger>
      <TooltipContent side="top" className="flex max-w-xs flex-col gap-1 text-xs">
        <div><span className="font-medium">Cliente:</span> {c.label} — {c.detail}</div>
        <div><span className="font-medium">Deudor:</span> {d.label} — {d.detail}</div>
        <div className="border-t border-background/20 pt-1 font-medium">→ {rec}</div>
      </TooltipContent>
    </Tooltip>
  );
}
