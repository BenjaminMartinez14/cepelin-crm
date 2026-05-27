"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyHeader } from "@/components/detail/CompanyHeader";
import { MetricsRow } from "@/components/detail/MetricsRow";
import { AiAnalysis } from "@/components/detail/AiAnalysis";
import { WhatsappSummaryCard } from "@/components/detail/WhatsappSummaryCard";
import { VolumeChart } from "@/components/detail/VolumeChart";
import { InvoiceAccordion } from "@/components/detail/InvoiceAccordion";
import { TopDebtors } from "@/components/detail/TopDebtors";
import { NotesSection } from "@/components/detail/NotesSection";
import { apiGet } from "@/lib/api";
import type { CompanyDetail } from "@/types";

export default function CompanyDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<CompanyDetail>(`/api/companies/${params.id}`)
      .then(setDetail)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"));
  }, [params.id]);

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← Volver a mi cartera
      </Link>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</Card>
      )}

      {!detail && !error && (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      )}

      {detail && (
        <>
          <CompanyHeader company={detail.company} contacts={detail.contacts} />
          <MetricsRow company={detail.company} />

          <WhatsappSummaryCard company={detail.company} />

          {detail.company.interaction_summary && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Última interacción KAM
              </h3>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {detail.company.interaction_summary}
              </p>
            </Card>
          )}

          <AiAnalysis company={detail.company} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <VolumeChart
                data={detail.monthly_volume}
                country={detail.company.country}
              />
            </div>
            <TopDebtors debtors={detail.top_debtors} country={detail.company.country} />
          </div>

          <InvoiceAccordion invoices={detail.invoices} country={detail.company.country} />
          <NotesSection companyId={detail.company.id} initialNotes={detail.notes} />
        </>
      )}
    </div>
  );
}
