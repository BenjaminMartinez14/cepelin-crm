"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GestionModal } from "@/components/detail/GestionModal";
import { GESTION_LABELS } from "@/lib/db/gestiones";
import { formatDate } from "@/lib/format";
import { apiGet } from "@/lib/api";
import type { Gestion } from "@/types";

function timeAgo(isoDate: string): string {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
  if (diff === 0) return "hoy";
  if (diff === 1) return "hace 1 día";
  if (diff <= 7) return `hace ${diff} días`;
  return formatDate(isoDate);
}

function isOverdue(recontactDate: string): boolean {
  return recontactDate < new Date().toISOString().slice(0, 10);
}

interface Props {
  companyId: string;
  pendingGestion?: Gestion | null;
}

export function GestionesSection({ companyId, pendingGestion }: Props) {
  const [gestiones, setGestiones] = useState<Gestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    apiGet<Gestion[]>(`/api/companies/${companyId}/gestiones`)
      .then(setGestiones)
      .catch(() => setGestiones([]))
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    if (pendingGestion) setGestiones((prev) => [pendingGestion, ...prev]);
  }, [pendingGestion]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Gestiones
            {gestiones.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{gestiones.length}</span>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>+ Registrar gestión</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : gestiones.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin gestiones registradas. Registra la primera interacción con este cliente.</p>
          ) : (
            <ul className="space-y-4">
              {gestiones.map((g, idx) => (
                <li key={g.id}>
                  {idx > 0 && <Separator className="mb-4" />}
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{GESTION_LABELS[g.type]}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{timeAgo(g.contacted_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Próximo contacto: {formatDate(g.recontact_date)}</span>
                      {isOverdue(g.recontact_date) && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 border border-red-200">Vencido</span>
                      )}
                    </div>
                    {g.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{g.notes}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <GestionModal companyId={companyId} open={modalOpen} onOpenChange={setModalOpen} onSuccess={(g) => setGestiones((prev) => [g, ...prev])} />
    </>
  );
}
