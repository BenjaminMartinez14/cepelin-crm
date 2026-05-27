"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, List, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyTable } from "@/components/companies/CompanyTable";
import { KanbanView } from "@/components/companies/KanbanView";
import type { SortKey, SortDir } from "@/components/companies/CompanyTable";
import { apiGet, apiPost } from "@/lib/api";
import type { CompanyMetrics } from "@/types";

type ViewMode = "table" | "kanban";

function useViewMode(): [ViewMode, (v: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "table";
    return (localStorage.getItem("dashboard-view") as ViewMode) ?? "table";
  });
  function set(v: ViewMode) {
    setView(v);
    localStorage.setItem("dashboard-view", v);
  }
  return [view, set];
}

export default function DashboardPage() {
  const [companies, setCompanies] = useState<CompanyMetrics[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [view, setView] = useViewMode();

  const fetchCompanies = useCallback(() => {
    apiGet<CompanyMetrics[]>("/api/companies")
      .then((data) => {
        setCompanies(data);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  async function handleRefreshScores() {
    if (!companies) return;
    setRefreshing(true);
    let processed = 0;
    let errors = 0;
    try {
      for (const company of companies) {
        try {
          await apiPost<{ processed: number; errors: number }>(
            "/api/health-scores/generate",
            { companyId: company.id },
          );
          processed++;
        } catch {
          errors++;
        }
      }
      toast.success(
        `${processed} empresa${processed !== 1 ? "s" : ""} analizada${processed !== 1 ? "s" : ""}${errors > 0 ? ` · ${errors} error${errors !== 1 ? "es" : ""}` : ""}`,
      );
    } finally {
      setRefreshing(false);
      fetchCompanies();
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortedCompanies = (() => {
    if (!companies || !sortKey) return companies;
    return [...companies].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // Nulls always last
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const diff = (av as number) - (bv as number);
      return sortDir === "asc" ? diff : -diff;
    });
  })();

  const atRisk = companies?.filter((c) => (c.days_since_last_op ?? 0) > 30).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Mi cartera</h1>
          <p className="text-sm text-muted-foreground">
            Ordenada por urgencia · cuentas sin operaciones recientes primero
          </p>
        </div>
        <div className="flex items-center gap-4">
          {companies && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="tabular-nums font-semibold">{companies.length}</span>
                <span className="text-muted-foreground">empresas</span>
              </div>
              {atRisk > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  <span className="tabular-nums font-semibold text-destructive">{atRisk}</span>
                  <span className="text-muted-foreground">en riesgo</span>
                </div>
              )}
            </div>
          )}
          {/* View toggle */}
          <div className="flex items-center rounded-md border border-border bg-card">
            <button
              type="button"
              onClick={() => setView("table")}
              className={`flex items-center rounded-l-md px-2.5 py-1.5 text-xs transition-colors ${view === "table" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}
              title="Vista tabla"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={`flex items-center rounded-r-md border-l border-border px-2.5 py-1.5 text-xs transition-colors ${view === "kanban" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}
              title="Vista kanban"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefreshScores}
            disabled={refreshing || !companies}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analizando…
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Actualizar scores
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </Card>
      )}

      {/* Skeleton */}
      {!companies && !error && (
        <Card className="overflow-hidden p-0">
          <div className="divide-y">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="ml-auto h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-2 w-28 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty */}
      {companies?.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Aún no tienes empresas asignadas.</p>
        </Card>
      )}

      {/* Table */}
      {sortedCompanies && sortedCompanies.length > 0 && view === "table" && (
        <Card className="overflow-hidden p-0">
          <CompanyTable
            companies={sortedCompanies}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </Card>
      )}

      {/* Kanban */}
      {sortedCompanies && sortedCompanies.length > 0 && view === "kanban" && (
        <KanbanView companies={sortedCompanies} />
      )}
    </div>
  );
}
