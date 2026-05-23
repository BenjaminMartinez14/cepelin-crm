import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompanyRow } from "@/components/companies/CompanyRow";
import type { CompanyMetrics } from "@/types";

export function CompanyTable({ companies }: { companies: CompanyMetrics[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
          <TableHead className="py-3 font-semibold text-foreground">Empresa</TableHead>
          <TableHead className="py-3 font-semibold text-foreground">Estado</TableHead>
          <TableHead className="py-3 text-right font-semibold text-foreground">Volumen 60d</TableHead>
          <TableHead className="py-3 text-right font-semibold text-foreground">Última op.</TableHead>
          <TableHead className="py-3 font-semibold text-foreground">Share of Wallet</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((company) => (
          <CompanyRow key={company.id} company={company} />
        ))}
      </TableBody>
    </Table>
  );
}
