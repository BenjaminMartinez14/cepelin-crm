"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { Country, MonthlyVolumePoint } from "@/types";

const MONTH_LABELS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function monthLabel(month: string): string {
  const idx = Number(month.slice(5, 7)) - 1;
  return MONTH_LABELS[idx] ?? month;
}

export function VolumeChart({
  data,
  country,
}: {
  data: MonthlyVolumePoint[];
  country: Country;
}) {
  const chartData = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  const hasVolume = data.some((d) => d.volume > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Volumen mensual con Cepelin</CardTitle>
        <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
      </CardHeader>
      <CardContent>
        {hasVolume ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}M`}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={40}
              />
              <Tooltip
                formatter={(v) => formatCurrency(Number(v), country)}
                labelClassName="text-xs"
              />
              <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            Sin volumen procesado con Cepelin en el período.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
