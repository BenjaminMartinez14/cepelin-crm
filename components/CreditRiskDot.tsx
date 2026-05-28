"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Country } from "@/types";

function config(score: number | null) {
  if (score === null) return { dot: "bg-muted-foreground/30", label: "Sin datos de riesgo crediticio" };
  if (score < 30)     return { dot: "bg-emerald-500", label: "Sin antecedentes de deuda morosa" };
  if (score <= 60)    return { dot: "bg-amber-500",   label: "Deudas menores registradas" };
  return               { dot: "bg-red-500",     label: "Deudas significativas — revisar antes de operar" };
}

interface Props {
  score: number | null;
  country: Country;
  size?: "sm" | "md";
}

export function CreditRiskDot({ score, country, size = "md" }: Props) {
  const { dot, label } = config(score);
  const source = country === "CL" ? "(Fuente: DICOM)" : "(Fuente: Buró de Crédito)";
  const sz = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";

  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex cursor-help items-center border-0 bg-transparent p-0">
        <span className={`inline-block rounded-full ${sz} ${dot}`} />
      </TooltipTrigger>
      <TooltipContent side="top" className="flex flex-col gap-0.5 text-xs">
        <span>{label}</span>
        <span className="text-background/60">{source}</span>
      </TooltipContent>
    </Tooltip>
  );
}
