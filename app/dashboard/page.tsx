"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyTable } from "@/components/companies/CompanyTable";
import { apiGet } from "@/lib/api";
import type { CompanyMetrics } from "@/types";

export default function DashboardPage() {
  const [companies, setCompanies] = useState<CompanyMetrics[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<CompanyMetrics[]>("/api/companies")
      .then(setCompanies)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  const atRisk = companies?.filter((c) => (c.days_since_last_op ?? 0) > 30).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Mi cartera</h1>
          <p className="text-sm text-muted-foreground">
            Ordenada por urgencia · cuentas sin operaciones recientes primero
          </p>
        </div>
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
      {companies && companies.length > 0 && (
        <Card className="overflow-hidden p-0">
          <CompanyTable companies={companies} />
        </Card>
      )}
    </div>
  );
}
