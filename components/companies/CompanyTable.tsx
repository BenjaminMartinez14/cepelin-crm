"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompanyRow } from "@/components/companies/CompanyRow";
import { CompanyInvoiceDropdown } from "@/components/companies/CompanyInvoiceDropdown";
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
  const [openRow, setOpenRow] = useState<{ companyId: string; status: string } | null>(null);

  function handlePillClick(companyId: string, status: string) {
    setOpenRow((prev) =>
      prev?.companyId === companyId && prev.status === status ? null : { companyId, status }
    );
  }

  return (
    <Table className="min-w-[920px]">
      <TableHeader>
        <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
          <TableHead className="w-24 py-3 font-semibold text-foreground">Prioridad</TableHead>
          <TableHead className="py-3 font-semibold text-foreground">Empresa</TableHead>
          <TableHead className="w-32 py-3 font-semibold text-foreground">Estado</TableHead>
          <SortableHead col="volume_60d" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-32 text-right">
            Volumen 60d
          </SortableHead>
          <SortableHead col="days_since_last_op" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-28 text-right">
            Última op.
          </SortableHead>
          <SortableHead col="sow_percentage" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-40">
            Share of Wallet
          </SortableHead>
          <SortableHead col="credit_risk_score" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-32 text-right">
            DICOM / Buró
          </SortableHead>
          <SortableHead col="health_score" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-24 text-right">
            Health
          </SortableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((company) => (
          <CompanyTableSection
            key={company.id}
            company={company}
            openRow={openRow}
            onPillClick={handlePillClick}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function CompanyTableSection({
  company,
  openRow,
  onPillClick,
}: {
  company: CompanyMetrics;
  openRow: { companyId: string; status: string } | null;
  onPillClick: (companyId: string, status: string) => void;
}) {
  const isOpen = openRow?.companyId === company.id;
  const visibleInvoices = isOpen
    ? (company.urgent_invoices ?? []).filter((inv) => inv.status === openRow!.status)
    : [];
  return (
    <>
      <CompanyRow
        company={company}
        onPillClick={onPillClick}
        activePillStatus={isOpen ? openRow!.status : undefined}
      />
      {isOpen && (
        <CompanyInvoiceDropdown
          invoices={visibleInvoices}
          country={company.country}
        />
      )}
    </>
  );
}
