"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WebRiskButtonProps {
  companyId: string;
  companyName: string;
}

type Status = "idle" | "searching" | "streaming" | "done" | "error";

export function WebRiskButton({ companyId, companyName }: WebRiskButtonProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [text, setText] = useState("");
  const [errorMsg, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function analyze() {
    setStatus("searching");
    setText("");
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/companies/${companyId}/web-risk`, {
        method: "GET",
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error(`Error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const json = JSON.parse(part.slice(6)) as {
            type: string;
            text?: string;
            message?: string;
          };
          if (json.type === "delta") {
            setText((prev) => prev + (json.text ?? ""));
            setStatus("streaming");
          } else if (json.type === "done") {
            setStatus("done");
          } else if (json.type === "error") {
            setError(json.message ?? "Error desconocido");
            setStatus("error");
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Error desconocido");
      setStatus("error");
    }
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      abortRef.current?.abort();
      setStatus("idle");
    }
    setOpen(value);
  }

  function handleOpen() {
    setOpen(true);
    void analyze();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        🔍 Analizar en web
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Análisis web · {companyName}</DialogTitle>
          </DialogHeader>

          <div className="mt-2">
            {(status === "searching") && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando información de {companyName}…
              </div>
            )}

            {(status === "streaming" || status === "done") && (
              <div className="overflow-y-auto rounded-md bg-muted/40 p-3" style={{ maxHeight: "400px" }}>
                <div className="whitespace-pre-wrap text-sm">{text}</div>
              </div>
            )}

            {status === "done" && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-emerald-600">✓ Guardado como nota</p>
                <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                  Cerrar
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <p className="text-sm text-red-600">{errorMsg}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatus("idle");
                    void analyze();
                  }}
                >
                  Reintentar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
