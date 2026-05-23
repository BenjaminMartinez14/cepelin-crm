"use client";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Country, InvoiceStatus, InvoiceWithDebtor } from "@/types";

const STATUS_ORDER: InvoiceStatus[] = [
  "in_collection",
  "assigned_competitor",
  "assigned_cepelin",
  "issued",
  "collected",
];

const STATUS_CONFIG: Record<InvoiceStatus, { emoji: string; label: string; hint: string }> = {
  in_collection:       { emoji: "🔴", label: "En cobranza",           hint: "Hacer seguimiento al deudor" },
  assigned_competitor: { emoji: "🟡", label: "Cedidas a competencia", hint: "Oportunidad: recuperar para Xepelin" },
  assigned_cepelin:    { emoji: "🔵", label: "Cedidas a Xepelin",     hint: "Operación activa" },
  issued:              { emoji: "⚪", label: "Emitidas sin ceder",     hint: "Sin ceder — proponer a cliente" },
  collected:           { emoji: "✅", label: "Cobradas",               hint: "Completada" },
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
  const groups = STATUS_ORDER.reduce<Partial<Record<InvoiceStatus, InvoiceWithDebtor[]>>>(
    (acc, status) => {
      acc[status] = invoices.filter((inv) => inv.status === status);
      return acc;
    },
    {},
  );

  const totalAmount = invoices.reduce((s, inv) => s + inv.amount, 0);
  const xepAmount = invoices
    .filter((inv) => inv.status === "assigned_cepelin" || inv.status === "in_collection")
    .reduce((s, inv) => s + inv.amount, 0);
  const xepPct = totalAmount > 0 ? ((xepAmount / totalAmount) * 100).toFixed(1) : "0";

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
            {/* Summary row */}
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

            {/* Grouped accordion */}
            <Accordion multiple defaultValue={["in_collection", "assigned_competitor"]} className="px-0">
              {STATUS_ORDER.filter((status) => (groups[status]?.length ?? 0) > 0).map((status) => {
                const items = groups[status]!;
                const cfg = STATUS_CONFIG[status];
                const groupTotal = items.reduce((s, inv) => s + inv.amount, 0);
                return (
                  <AccordionItem key={status} value={status} className="border-b border-border last:border-0">
                    <AccordionTrigger className="px-6 hover:no-underline">
                      <div className="flex w-full items-center gap-2 text-sm">
                        <span>{cfg.emoji}</span>
                        <span className="font-medium">{cfg.label}</span>
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
