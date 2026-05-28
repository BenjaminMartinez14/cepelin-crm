"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api";
import { RECONTACT_DAYS, GESTION_LABELS } from "@/lib/db/gestiones";
import { formatDate } from "@/lib/format";
import type { Gestion, GestionType } from "@/types";

const GESTION_TYPES: GestionType[] = [
  "llamada_realizada",
  "whatsapp_enviado",
  "email_enviado",
  "reunion_agendada",
  "cliente_pidio_esperar",
  "no_contesto",
];

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface Props {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (gestion: Gestion) => void;
  compact?: boolean;
}

export function GestionModal({ companyId, open, onOpenChange, onSuccess, compact = false }: Props) {
  const [type, setType] = useState<GestionType>("llamada_realizada");
  const [recontactDate, setRecontactDate] = useState(todayPlus(RECONTACT_DAYS["llamada_realizada"]));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType("llamada_realizada");
      setRecontactDate(todayPlus(RECONTACT_DAYS["llamada_realizada"]));
      setNotes("");
      setError(null);
    }
  }, [open]);

  function handleTypeChange(newType: GestionType) {
    setType(newType);
    setRecontactDate(todayPlus(RECONTACT_DAYS[newType]));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const gestion = await apiPost<Gestion>(`/api/companies/${companyId}/gestiones`, {
        type,
        recontact_date: recontactDate,
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
      onSuccess(gestion);
      toast.success(`Gestión registrada. Próximo contacto: ${formatDate(recontactDate)}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la gestión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{compact ? "¿Qué hiciste?" : "Registrar gestión"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tipo de gestión</label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as GestionType)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {GESTION_TYPES.map((t) => (
                <option key={t} value={t}>{GESTION_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Próximo contacto</label>
            <Input type="date" value={recontactDate} onChange={(e) => setRecontactDate(e.target.value)} className="w-full" />
          </div>
          {!compact && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notas (opcional)</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contexto adicional (opcional)..." rows={3} maxLength={500} />
              {notes.length > 0 && <p className="text-right text-xs text-muted-foreground">{notes.length}/500</p>}
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button onClick={submit} disabled={saving || !recontactDate}>{saving ? "Registrando…" : "Registrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
