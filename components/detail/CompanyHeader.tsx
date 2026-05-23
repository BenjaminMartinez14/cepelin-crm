"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CompanyStatusBadge } from "@/components/StatusBadge";
import { apiPatch } from "@/lib/api";
import { formatDate, taxIdLabel } from "@/lib/format";
import type { CompanyMetrics, Contact } from "@/types";

export function CompanyHeader({
  company,
  contacts,
}: {
  company: CompanyMetrics;
  contacts: Contact[];
}) {
  const [followup, setFollowup] = useState<string | null>(company.next_followup_date);
  const [draft, setDraft] = useState(company.next_followup_date ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contact = contacts[0];

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const date = draft === "" ? null : draft;
      const res = await apiPatch<{ next_followup_date: string | null }>(
        `/api/companies/${company.id}/followup`,
        { date },
      );
      setFollowup(res.next_followup_date);
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
            <CompanyStatusBadge status={company.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {taxIdLabel(company.country)} {company.tax_id} · Enrolada{" "}
            {formatDate(company.enrolled_at)}
          </p>
          {contact && (
            <p className="text-sm text-muted-foreground">
              {contact.name}
              {contact.phone ? ` · ${contact.phone}` : ""}
              {contact.email ? ` · ${contact.email}` : ""}
            </p>
          )}
        </div>

        <div className="text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Próximo seguimiento
          </p>
          {editing ? (
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="date"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-8 w-40"
              />
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? "…" : "Guardar"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <button
              className="mt-1 font-medium underline-offset-4 hover:underline"
              onClick={() => {
                setDraft(followup ?? "");
                setEditing(true);
              }}
            >
              {followup ? formatDate(followup) : "Programar"}
            </button>
          )}
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
