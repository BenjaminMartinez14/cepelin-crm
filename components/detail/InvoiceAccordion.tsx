"use client";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { InvoiceQualityDots } from "@/components/InvoiceQualityDots";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CompanyStatus, Country, InvoiceStatus, InvoiceWithDebtor } from "@/types";

interface StatusConfig { emoji: string; label: string; hint: string; tooltip: string; }

const ACTIVE_ORDER: InvoiceStatus[] = [
  "reclamada","protestada","cancelada",
  "acuse_recibo","merito_ejecutivo",
  "entregada_receptor","emitida","aceptada_sii",
  "cedida_xepelin","cedida_competencia","cedida_mx",
  "en_cobranza","vigente",
];

const STATUS_CONFIG: Partial<Record<InvoiceStatus, StatusConfig>> = {
  emitida:            { emoji:"🟠", label:"Emitidas",              hint:"Pendiente de validación SII",           tooltip:"DTE enviado al SII, pendiente de validación" },
  aceptada_sii:       { emoji:"🟠", label:"Aceptadas por SII",     hint:"SII validó el documento",               tooltip:"SII validó el documento" },
  entregada_receptor: { emoji:"🟠", label:"Entregadas al receptor",hint:"Deudor debe dar acuse de recibo",       tooltip:"Factura entregada al deudor, pendiente acuse de recibo" },
  acuse_recibo:       { emoji:"🔵", label:"Con acuse de recibo",   hint:"Listas para factorizar",                tooltip:"Deudor confirmó recepción — otorga mérito ejecutivo para factorizar" },
  reclamada:          { emoji:"🔴", label:"Reclamadas",            hint:"No se puede factorizar — deudor reclamó",tooltip:"Deudor reclamó dentro de 8 días — no se puede factorizar" },
  merito_ejecutivo:   { emoji:"🔵", label:"Mérito ejecutivo",      hint:"Aceptación irrevocable — seguro factorizar",tooltip:"8 días sin reclamo — aceptación irrevocable, seguro factorizar" },
  cedida_xepelin:     { emoji:"🔵", label:"Cedidas a Xepelin",     hint:"Operación activa",                      tooltip:"Cedida a Xepelin vía RTC del SII" },
  cedida_competencia: { emoji:"🟡", label:"Cedidas a competencia", hint:"Oportunidad: recuperar para Xepelin",  tooltip:"Cedida a otra empresa de factoring" },
  en_cobranza:        { emoji:"🟡", label:"En cobranza",           hint:"Xepelin cobrando al deudor",            tooltip:"Xepelin está cobrando al deudor" },
  cobrada:            { emoji:"✅", label:"Cobradas",              hint:"Completada",                            tooltip:"Factura pagada" },
  protestada:         { emoji:"🔴", label:"Protestadas",           hint:"En proceso judicial",                   tooltip:"En proceso judicial" },
  vigente:            { emoji:"🟠", label:"Vigentes (CFDI)",       hint:"Sin ceder — proponer a cliente",        tooltip:"CFDI vigente y válido ante el SAT" },
  cancelada:          { emoji:"🔴", label:"Canceladas",            hint:"CFDI cancelado por el emisor",          tooltip:"CFDI cancelado por el emisor" },
  cedida_mx:          { emoji:"🔵", label:"Cedidas a Xepelin MX",  hint:"Operación activa en México",            tooltip:"Cedida a Xepelin en México" },
};

function daysSince(d: string) { return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000); }

function StatusGroup({
  status, items, country, companyStatus, hasReclamada,
}: {
  status: InvoiceStatus; items: InvoiceWithDebtor[]; country: Country;
  companyStatus: CompanyStatus; hasReclamada: boolean;
}) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg || items.length === 0) return null;
  const groupTotal = items.reduce((s, inv) => s + inv.amount, 0);
  return (
    <AccordionItem value={status} className="border-b border-border last:border-0">
      <AccordionTrigger className="px-6 hover:no-underline">
        <div className="flex w-full items-center gap-2 text-sm">
          <span>{cfg.emoji}</span>
          <Tooltip>
            <TooltipTrigger className="cursor-help border-0 bg-transparent p-0 font-medium underline decoration-dotted decoration-muted-foreground underline-offset-2">
              {cfg.label}
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">{cfg.tooltip}</TooltipContent>
          </Tooltip>
          <span className="text-muted-foreground">({items.length})</span>
          <span className="ml-auto pr-2 tabular-nums text-muted-foreground">{formatCurrency(groupTotal, country)}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="px-6 pb-2">
          {items.map((inv) => (
            <div key={inv.id} className="flex items-start justify-between border-b border-border/50 py-2.5 last:border-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <InvoiceQualityDots companyStatus={companyStatus} hasReclamada={hasReclamada} debtorName={inv.debtor_name} />
                  {inv.debtor_name}
                </div>
                <div className="text-xs text-muted-foreground">{formatDate(inv.issued_at)} · {daysSince(inv.issued_at)} días</div>
                <div className="text-xs text-primary/70">{cfg.hint}</div>
              </div>
              <div className="ml-4 tabular-nums text-sm font-medium">{formatCurrency(inv.amount, country)}</div>
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function InvoiceAccordion({
  invoices, country, companyStatus, hasReclamada,
}: {
  invoices: InvoiceWithDebtor[]; country: Country;
  companyStatus: CompanyStatus; hasReclamada: boolean;
}) {
  const active = invoices.filter((i) => i.is_active);
  const historical = invoices.filter((i) => !i.is_active);

  const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);
  const xepAmount = invoices
    .filter((i) => ["cedida_xepelin","en_cobranza","cedida_mx"].includes(i.status))
    .reduce((s, i) => s + i.amount, 0);
  const xepPct = totalAmount > 0 ? ((xepAmount / totalAmount) * 100).toFixed(1) : "0";

  const activeDefaultOpen = ACTIVE_ORDER.filter((s) => active.some((i) => i.status === s));

  // Group active by status
  const activeGroups = ACTIVE_ORDER.map((s) => ({ status: s, items: active.filter((i) => i.status === s) })).filter((g) => g.items.length > 0);
  // Group historical by status (cobrada + anything not active)
  const histStatuses = Array.from(new Set(historical.map((i) => i.status)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Facturas</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {invoices.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">Esta empresa aún no tiene facturas registradas.</p>
        ) : (
          <>
            <div className="flex items-center gap-6 border-b border-border px-6 py-4 text-sm">
              <span><span className="tabular-nums font-semibold">{invoices.length}</span> <span className="text-muted-foreground">facturas</span></span>
              <span><span className="tabular-nums font-semibold">{formatCurrency(totalAmount, country)}</span> <span className="text-muted-foreground">total</span></span>
              <span><span className="tabular-nums font-semibold">{xepPct}%</span> <span className="text-muted-foreground">en Xepelin</span></span>
            </div>

            {/* Facturas vigentes */}
            {active.length > 0 && (
              <div className="border-b border-border px-6 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Facturas vigentes ({active.length})
              </div>
            )}
            {active.length > 0 && (
              <Accordion multiple defaultValue={activeDefaultOpen} className="px-0">
                {activeGroups.map((g) => (
                  <StatusGroup key={g.status} status={g.status} items={g.items} country={country} companyStatus={companyStatus} hasReclamada={hasReclamada} />
                ))}
              </Accordion>
            )}

            {/* Historial */}
            {historical.length > 0 && (
              <Accordion defaultValue={[]} className="px-0">
                <AccordionItem value="historial" className="border-t border-border">
                  <AccordionTrigger className="px-6 hover:no-underline">
                    <span className="text-sm font-medium text-muted-foreground">Historial ({historical.length})</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {histStatuses.map((s) => {
                      const items = historical.filter((i) => i.status === s);
                      return (
                        <StatusGroup key={s} status={s} items={items} country={country} companyStatus={companyStatus} hasReclamada={hasReclamada} />
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
