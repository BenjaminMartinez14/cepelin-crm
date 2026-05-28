"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UrgencyBadge } from "@/components/companies/UrgencyBadge";
import { CreditRiskDot } from "@/components/CreditRiskDot";
import { InvoiceQualityDots } from "@/components/InvoiceQualityDots";
import { countryFlag, formatDaysSince, urgencyTextClass, urgencyLevel } from "@/lib/format";
import type { CompanyMetrics, ManagementStatus } from "@/types";

const COLUMNS: { status: ManagementStatus; label: string; headerClass: string; borderClass: string }[] = [
  { status: "por_gestionar",  label: "Por gestionar",   headerClass: "text-red-600",     borderClass: "border-red-200"     },
  { status: "en_seguimiento", label: "En seguimiento",  headerClass: "text-amber-600",   borderClass: "border-amber-200"   },
  { status: "gestionado",     label: "Gestionado",      headerClass: "text-emerald-600", borderClass: "border-emerald-200" },
  { status: "en_pausa",       label: "En pausa",        headerClass: "text-slate-500",   borderClass: "border-slate-200"   },
];

async function patchManagementStatus(companyId: string, status: ManagementStatus): Promise<boolean> {
  const res = await fetch(`/api/companies/${companyId}/management-status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return res.ok;
}

function CompanyCard({ company, isDragging = false }: { company: CompanyMetrics; isDragging?: boolean }) {
  const router = useRouter();
  const urgency = urgencyLevel(company.days_since_last_op);
  const firstAction = company.recommended_actions?.[0] ?? null;

  return (
    <div
      className={`rounded-md border border-border bg-card p-3 shadow-sm transition-colors ${
        isDragging ? "opacity-50" : "hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={() => router.push(`/dashboard/${company.id}`)}
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="text-sm font-medium leading-tight text-foreground">
            <span className="mr-1">{countryFlag(company.country)}</span>
            {company.name}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <CreditRiskDot score={company.credit_risk_score} country={company.country} size="sm" />
            <UrgencyBadge label={company.urgency_label} />
          </div>
        </div>

        <div className={`text-xs tabular-nums ${urgencyTextClass(urgency)} mb-1`}>
          {formatDaysSince(company.days_since_last_op)}
        </div>

        {company.next_followup_date && (
          <div className="mb-1 text-xs text-muted-foreground">
            Seguimiento:{" "}
            {new Date(company.next_followup_date).toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
            })}
          </div>
        )}

        {company.urgent_invoices?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {company.urgent_invoices.slice(0, 4).map((inv) => (
              <InvoiceQualityDots
                key={inv.id}
                companyStatus={company.status}
                hasReclamada={company.has_reclamada}
                debtorName={inv.debtor_name}
              />
            ))}
          </div>
        )}
        {firstAction && (
          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground italic">
            {firstAction}
          </p>
        )}
      </button>
    </div>
  );
}

function SortableCard({
  company,
  onQuickAction,
}: {
  company: CompanyMetrics;
  onQuickAction: (companyId: string, status: ManagementStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: company.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <CompanyCard company={company} isDragging={isDragging} />
      <div
        className="mt-1 flex gap-1 px-0.5"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onQuickAction(company.id, "gestionado")}
          className="flex-1 rounded py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
        >
          ✓ Gestionado
        </button>
        <button
          type="button"
          onClick={() => onQuickAction(company.id, "en_seguimiento")}
          className="flex-1 rounded py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-50 transition-colors"
        >
          → Seguimiento
        </button>
        <button
          type="button"
          onClick={() => onQuickAction(company.id, "en_pausa")}
          className="flex-1 rounded py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          ⏸ Pausar
        </button>
      </div>
    </div>
  );
}

interface Props {
  companies: CompanyMetrics[];
  onUpdate: () => void;
}

export function ManagementKanbanView({ companies, onUpdate }: Props) {
  const [items, setItems] = useState<CompanyMetrics[]>(companies);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => { setItems(companies); }, [companies]);
  const [resetting, setResetting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const activeCompany = activeId ? items.find((c) => c.id === activeId) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // over.id may be a column status or another company id — determine target column
    const columnStatuses = COLUMNS.map((c) => c.status) as string[];
    let targetStatus: ManagementStatus;

    if (columnStatuses.includes(over.id as string)) {
      targetStatus = over.id as ManagementStatus;
    } else {
      // Dropped over another card — find its column
      const targetCompany = items.find((c) => c.id === over.id);
      if (!targetCompany) return;
      targetStatus = targetCompany.management_status;
    }

    const companyId = active.id as string;
    const prevItems = items;

    setItems((prev) =>
      prev.map((c) => c.id === companyId ? { ...c, management_status: targetStatus } : c),
    );

    try {
      const ok = await patchManagementStatus(companyId, targetStatus);
      if (!ok) {
        setItems(prevItems);
        toast.error("No se pudo mover la empresa. Intenta de nuevo.");
      }
    } catch {
      setItems(prevItems);
      toast.error("No se pudo mover la empresa. Intenta de nuevo.");
    }
  }, [items]);

  const handleQuickAction = useCallback(async (companyId: string, status: ManagementStatus) => {
    const prevItems = items;
    setItems((prev) =>
      prev.map((c) => c.id === companyId ? { ...c, management_status: status } : c),
    );
    const ok = await patchManagementStatus(companyId, status);
    if (!ok) {
      setItems(prevItems);
      toast.error("No se pudo actualizar el estado");
    }
  }, [items]);

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/companies/management-status/reset", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        toast.success(`${json.data?.updated ?? 0} empresa(s) reasignadas a "Por gestionar"`);
        onUpdate();
      } else {
        toast.error("Error al resetear la semana");
      }
    } finally {
      setResetting(false);
    }
  }, [onUpdate]);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
      <div className="mb-3 flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={resetting}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3 w-3 ${resetting ? "animate-spin" : ""}`} />
          Resetear semana
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-4 overflow-hidden">
          {COLUMNS.map(({ status, label, headerClass, borderClass }) => {
            const col = items.filter((c) => c.management_status === status);
            return (
              <div
                key={status}
                className={`flex flex-1 flex-col overflow-hidden rounded-lg border ${borderClass} bg-muted/20`}
                data-column-id={status}
              >
                <div className={`flex items-center justify-between border-b ${borderClass} px-3 py-2.5`}>
                  <span className={`text-sm font-semibold ${headerClass}`}>{label}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{col.length}</span>
                </div>

                <SortableContext
                  items={col.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex-1 overflow-y-auto space-y-2 p-2">
                    {col.length === 0 ? (
                      <p className="py-8 text-center text-xs text-muted-foreground">Sin empresas</p>
                    ) : (
                      col.map((company) => (
                        <SortableCard
                          key={company.id}
                          company={company}
                          onQuickAction={handleQuickAction}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeCompany && <CompanyCard company={activeCompany} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
