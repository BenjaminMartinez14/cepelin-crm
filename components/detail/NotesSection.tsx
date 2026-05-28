"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { apiPost } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Note } from "@/types";

export function NotesSection({
  companyId,
  initialNotes,
}: {
  companyId: string;
  initialNotes: Note[];
}) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const note = await apiPost<Note>(`/api/companies/${companyId}/notes`, {
        content: trimmed,
      });
      setNotes((prev) => [note, ...prev]);
      setContent("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la nota");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Registra una interacción, acuerdo o riesgo…"
            rows={3}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end">
            <Button onClick={submit} disabled={saving || !content.trim()} size="sm">
              {saving ? "Guardando…" : "Agregar nota"}
            </Button>
          </div>
        </div>

        <Separator />

        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay notas.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => {
              const isWebAnalysis = note.content.startsWith("[Análisis Web]");
              const displayContent = isWebAnalysis
                ? note.content.replace(/^\[Análisis Web\] \S+\n\n/, "")
                : note.content;
              return (
                <li key={note.id} className="text-sm">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(note.created_at)}
                    {isWebAnalysis && (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        🔍 Web
                      </span>
                    )}
                  </p>
                  <p className="whitespace-pre-wrap">{displayContent}</p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
