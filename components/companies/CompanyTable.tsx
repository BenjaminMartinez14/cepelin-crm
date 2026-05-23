import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompanyRow } from "@/components/companies/CompanyRow";
import type { CompanyMetrics } from "@/types";

export type SortKey =
  | "volume_60d"
  | "days_since_last_op"
  | "sow_percentage"
  | "credit_risk_score"
  | "health_score";

export type SortDir = "asc" | "desc";

interface CompanyTableProps {
  companies: CompanyMetrics[];
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
  return sortDir === "asc"
    ? <ChevronUp className="ml-1 inline h-3 w-3 text-primary" />
    : <ChevronDown className="ml-1 inline h-3 w-3 text-primary" />;
}

function SortableHead({
  col,
  sortKey,
  sortDir,
  onSort,
  className,
  children,
}: {
  col: SortKey;
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <TableHead
      className={`cursor-pointer select-none py-3 font-semibold text-foreground hover:text-primary transition-colors ${className ?? ""}`}
      onClick={() => onSort(col)}
    >
      {children}
      <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </TableHead>
  );
}

export function CompanyTable({ companies, sortKey, sortDir, onSort }: CompanyTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
          <TableHead className="py-3 font-semibold text-foreground">Empresa</TableHead>
          <TableHead className="py-3 font-semibold text-foreground">Estado</TableHead>
          <SortableHead col="volume_60d" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="text-right">
            Volumen 60d
          </SortableHead>
          <SortableHead col="days_since_last_op" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="text-right">
            Última op.
          </SortableHead>
          <SortableHead col="sow_percentage" sortKey={sortKey} sortDir={sortDir} onSort={onSort}>
            Share of Wallet
          </SortableHead>
          <SortableHead col="credit_risk_score" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="text-right">
            DICOM / Buró
          </SortableHead>
          <SortableHead col="health_score" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="text-right">
            Health
          </SortableHead>
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
