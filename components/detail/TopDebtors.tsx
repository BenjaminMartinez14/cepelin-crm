import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { Country, TopDebtor } from "@/types";

export function TopDebtors({
  debtors,
  country,
}: {
  debtors: TopDebtor[];
  country: Country;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top pagadores</CardTitle>
        <p className="text-xs text-muted-foreground">Por volumen facturado</p>
      </CardHeader>
      <CardContent>
        {debtors.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos de pagadores.</p>
        ) : (
          <ol className="space-y-3">
            {debtors.map((d, i) => (
              <li key={d.debtor_id} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {i + 1}
                  </span>
                  {d.name}
                </span>
                <span className="tabular-nums text-sm text-muted-foreground">
                  {formatCurrency(d.total, country)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
