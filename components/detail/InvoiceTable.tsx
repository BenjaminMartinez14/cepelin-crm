import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Country, InvoiceWithDebtor } from "@/types";

export function InvoiceTable({
  invoices,
  country,
}: {
  invoices: InvoiceWithDebtor[];
  country: Country;
}) {
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emisión</TableHead>
                <TableHead>Pagador</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="tabular-nums">{formatDate(inv.issued_at)}</TableCell>
                  <TableCell>{inv.debtor_name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(inv.amount, country)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={inv.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
