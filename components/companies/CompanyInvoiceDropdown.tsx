"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDaysSince } from "@/lib/format";
import type { Country, InvoicePreview } from "@/types";

interface Props {
  invoices: InvoicePreview[];
  country: Country;
}

export function CompanyInvoiceDropdown({ invoices, country }: Props) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={7} className="px-4 pb-3 pt-0">
        <div className="rounded-md border border-border/50 bg-muted/30 overflow-hidden">
          {invoices.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Sin facturas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-xs text-muted-foreground">
                  <th className="px-3 py-1.5 text-left font-medium">Deudor</th>
                  <th className="px-3 py-1.5 text-right font-medium">Monto</th>
                  <th className="px-3 py-1.5 text-right font-medium">Días</th>
                  <th className="px-3 py-1.5 text-left font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/20 last:border-0">
                    <td className="px-3 py-1.5 text-foreground">{inv.debtor_name}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(inv.amount, country)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                      {formatDaysSince(inv.days_since_issued)}
                    </td>
                    <td className="px-3 py-1.5">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
