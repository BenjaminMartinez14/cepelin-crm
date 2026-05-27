import { Card } from "@/components/ui/card";
import type { CompanyMetrics } from "@/types";

export function WhatsappSummaryCard({ company }: { company: CompanyMetrics }) {
  return (
    <Card className="border-[#25D366]/20 bg-[#25D366]/5 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Último contacto WhatsApp
      </h3>
      {company.whatsapp_summary ? (
        <p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">
          {company.whatsapp_summary}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Sin resumen de WhatsApp disponible.</p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Integración futura: WhatsApp Business API para sincronización automática.
      </p>
    </Card>
  );
}
