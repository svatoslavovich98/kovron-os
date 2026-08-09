"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export type DayPoint = { name: string; income: number; expense: number };

/**
 * График доходов и расходов.
 * Вынесен в отдельный файл, чтобы библиотека графиков не тормозила
 * первую загрузку — на Android её разбор занимает заметное время.
 */
export default function IncomeExpenseChart({ data }: { data: DayPoint[] }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                 axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                 axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              fontSize: 13,
            }}
            formatter={(v: number) => formatCurrency(v)}
          />
          <Bar dataKey="income" fill="hsl(var(--income))" radius={[6, 6, 0, 0]} name="Доходы" />
          <Bar dataKey="expense" fill="hsl(var(--expense))" radius={[6, 6, 0, 0]} name="Расходы" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
