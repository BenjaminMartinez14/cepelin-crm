"use client";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Country, InvoiceStatus, InvoiceWithDebtor } from "@/types";

interface StatusConfig {
  emoji: string;
  label: string;
  hint: string;
  tooltip: string;
}

const CL_STATUS_ORDER: InvoiceStatus[] = [
  "reclamada",
  "protestada",
  "entregada_receptor",
  "emitida",
  "aceptada_sii",
  "acuse_recibo",
  "merito_ejecutivo",
  "cedida_xepelin",
  "cedida_competencia",
  "en_cobranza",
  "cobrada",
];

const MX_STATUS_ORDER: InvoiceStatus[] = [
  "vigente",
  "cedida_mx",
  "cedida_competencia",
  "en_cobranza",
  "cobrada",
  "cancelada",
];

const STATUS_CONFIG: Partial<Record<InvoiceStatus, StatusConfig>> = {
  // CL
  emitida: {
    emoji: "🟠",
    label: "Emitidas",
    hint: "Pendiente de validación SII",
    tooltip: "DTE enviado al SII, pendiente de validación",
  },
  aceptada_sii: {
    emoji: "🟠",
    label: "Aceptadas por SII",
    hint: "SII validó el documento",
    tooltip: "SII validó el documento",
  },
  entregada_receptor: {
    emoji: "🟠",
    label: "Entregadas al receptor",
    hint: "Deudor debe dar acuse de recibo",
    tooltip: "Factura entregada al deudor, pendiente acuse de recibo",
  },
  acuse_recibo: {
    emoji: "🔵",
    label: "Con acuse de recibo",
    hint: "Listas para factorizar",
    tooltip: "Deudor confirmó recepción — otorga mérito ejecutivo para factorizar",
  },
  reclamada: {
    emoji: "🔴",
    label: "Reclamadas",
    hint: "No se puede factorizar — deudor reclamó",
    tooltip: "Deudor reclamó dentro de 8 días — no se puede factorizar",
  },
  merito_ejecutivo: {
    emoji: "🔵",
    label: "Mérito ejecutivo",
    hint: "Aceptación irrevocable — seguro factorizar",
    tooltip: "8 días sin reclamo — aceptación irrevocable, seguro factorizar",
  },
  cedida_xepelin: {
    emoji: "🔵",
    label: "Cedidas a Xepelin",
    hint: "Operación activa",
    tooltip: "Cedida a Xepelin vía RTC del SII",
  },
  cedida_competencia: {
    emoji: "🟡",
    label: "Cedidas a competencia",
    hint: "Oportunidad: recuperar para Xepelin",
    tooltip: "Cedida a otra empresa de factoring",
  },
  en_cobranza: {
    emoji: "🟡",
    label: "En cobranza",
    hint: "Xepelin cobrando al deudor",
    tooltip: "Xepelin está cobrando al deudor",
  },
  cobrada: {
    emoji: "✅",
    label: "Cobradas",
    hint: "Completada",
    tooltip: "Factura pagada",
  },
  protestada: {
    emoji: "🔴",
    label: "Protestadas",
    hint: "En proceso judicial",
    tooltip: "En proceso judicial",
  },
  // MX
  vigente: {
    emoji: "🟠",
    label: "Vigentes (CFDI)",
    hint: "Sin ceder — proponer a cliente",
    tooltip: "CFDI vigente y válido ante el SAT",
  },
  cancelada: {
    emoji: "🔴",
    label: "Canceladas",
    hint: "CFDI cancelado por el emisor",
    tooltip: "CFDI cancelado por el emisor",
  },
  cedida_mx: {
    emoji: "🔵",
    label: "Cedidas a Xepelin MX",
    hint: "Operación activa en México",
    tooltip: "Cedida a Xepelin en México",
  },
};

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export function InvoiceAccordion({
  invoices,
  country,
}: {
  invoices: InvoiceWithDebtor[];
  country: Country;
}) {
  const statusOrder = country === "MX" ? MX_STATUS_ORDER : CL_STATUS_ORDER;

  const groups = statusOrder.reduce<Partial<Record<InvoiceStatus, InvoiceWithDebtor[]>>>(
    (acc, status) => {
      acc[status] = invoices.filter((inv) => inv.status === status);
      return acc;
    },
    {},
  );

  const totalAmount = invoices.reduce((s, inv) => s + inv.amount, 0);
  const xepAmount = invoices
    .filter((inv) => inv.status === "cedida_xepelin" || inv.status === "en_cobranza" || inv.status === "cedida_mx")
    .reduce((s, inv) => s + inv.amount, 0);
  const xepPct = totalAmount > 0 ? ((xepAmount / totalAmount) * 100).toFixed(1) : "0";

  const defaultOpen = country === "MX"
    ? ["vigente", "cedida_competencia"]
    : ["reclamada", "protestada", "entregada_receptor", "cedida_competencia"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Facturas</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {invoices.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            Esta empresa aún no tiene facturas registradas.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-6 border-b border-border px-6 py-4 text-sm">
              <span>
                <span className="tabular-nums font-semibold">{invoices.length}</span>{" "}
                <span className="text-muted-foreground">facturas</span>
              </span>
              <span>
                <span className="tabular-nums font-semibold">{formatCurrency(totalAmount, country)}</span>{" "}
                <span className="text-muted-foreground">total</span>
              </span>
              <span>
                <span className="tabular-nums font-semibold">{xepPct}%</span>{" "}
                <span className="text-muted-foreground">en Xepelin</span>
              </span>
            </div>

            <Accordion multiple defaultValue={defaultOpen} className="px-0">
              {statusOrder.filter((status) => (groups[status]?.length ?? 0) > 0).map((status) => {
                const items = groups[status]!;
                const cfg = STATUS_CONFIG[status];
                if (!cfg) return null;
                const groupTotal = items.reduce((s, inv) => s + inv.amount, 0);
                return (
                  <AccordionItem key={status} value={status} className="border-b border-border last:border-0">
                    <AccordionTrigger className="px-6 hover:no-underline">
                      <div className="flex w-full items-center gap-2 text-sm">
                        <span>{cfg.emoji}</span>
                        <Tooltip>
                          <TooltipTrigger className="font-medium underline decoration-dotted decoration-muted-foreground underline-offset-2 cursor-help bg-transparent p-0 border-0">
                            {cfg.label}
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            {cfg.tooltip}
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-muted-foreground">({items.length})</span>
                        <span className="ml-auto tabular-nums text-muted-foreground pr-2">
                          {formatCurrency(groupTotal, country)}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-6 pb-2">
                        {items.map((inv) => (
                          <div
                            key={inv.id}
                            className="flex items-start justify-between border-b border-border/50 py-2.5 last:border-0"
                          >
                            <div className="space-y-0.5">
                              <div className="text-sm font-medium">{inv.debtor_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(inv.issued_at)} · {daysSince(inv.issued_at)} días
                              </div>
                              <div className="text-xs text-primary/70">{cfg.hint}</div>
                            </div>
                            <div className="ml-4 tabular-nums text-sm font-medium">
                              {formatCurrency(inv.amount, country)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </>
        )}
      </CardContent>
    </Card>
  );
}
