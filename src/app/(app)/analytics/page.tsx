"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import { demoOrders, demoTransactions, demoClients, demoCars, demoAccounts, demoSeamstressPayments } from "@/lib/demo-data";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, ShoppingBag, Users, Car } from "lucide-react";

const periods = ["Неделя", "Месяц", "Квартал", "Год"] as const;

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("Месяц");

  const totalOrders = demoOrders.length;
  const completedOrders = demoOrders.filter((o) => ["completed", "delivered"].includes(o.status)).length;
  const cancelledOrders = demoOrders.filter((o) => o.status === "cancelled").length;
  const totalRevenue = demoOrders.reduce((s, o) => s + o.totalPrice, 0);
  const totalReceived = demoTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = demoTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const avgCheck = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const clientDebt = demoOrders.reduce((s, o) => s + o.remaining, 0);
  const seamstressAccrued = demoSeamstressPayments.filter((p) => p.status === "accrued").reduce((s, p) => s + p.amount, 0);

  const revenueByDay = [
    { name: "Пн", income: 8000, expense: 3000 },
    { name: "Вт", income: 12000, expense: 2500 },
    { name: "Ср", income: 5000, expense: 7500 },
    { name: "Чт", income: 15000, expense: 4000 },
    { name: "Пт", income: 10000, expense: 5500 },
    { name: "Сб", income: 18000, expense: 3000 },
    { name: "Вс", income: 6000, expense: 1500 },
  ];

  const profitByMonth = [
    { name: "Янв", profit: 45000 },
    { name: "Фев", profit: 52000 },
    { name: "Мар", profit: 38000 },
    { name: "Апр", profit: 61000 },
    { name: "Май", profit: 55000 },
    { name: "Июн", profit: 72000 },
    { name: "Июл", profit: 68000 },
  ];

  // Brand popularity
  const brandCounts: Record<string, number> = {};
  demoOrders.forEach((o) => {
    const car = demoCars.find((c) => c.id === o.carId);
    if (car) brandCounts[car.brand] = (brandCounts[car.brand] || 0) + 1;
  });
  const brandData = Object.entries(brandCounts).map(([name, value]) => ({ name, value }));

  // Source stats
  const sourceCounts: Record<string, number> = {};
  demoClients.forEach((c) => {
    if (c.source) sourceCounts[c.source] = (sourceCounts[c.source] || 0) + 1;
  });
  const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));
  const sourceColors = ["#68A7FF", "#6FD08C", "#F4B860", "#FF6B6B", "#ADD256", "#9CA39A"];

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Аналитика</h1>
        <div className="flex gap-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all",
                period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Заказов", value: totalOrders, icon: ShoppingBag },
          { label: "Выручка", value: formatCurrency(totalRevenue), icon: TrendingUp },
          { label: "Получено", value: formatCurrency(totalReceived) },
          { label: "Расходы", value: formatCurrency(totalExpenses) },
          { label: "Прибыль", value: formatCurrency(totalReceived - totalExpenses) },
          { label: "Средний чек", value: formatCurrency(avgCheck) },
          { label: "Долг клиентов", value: formatCurrency(clientDebt) },
          { label: "Начислено швее", value: formatCurrency(seamstressAccrued) },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-xl font-bold mt-1">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Доходы и расходы по дням</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }} formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="income" fill="hsl(var(--income))" radius={[6, 6, 0, 0]} name="Доходы" />
                  <Bar dataKey="expense" fill="hsl(var(--expense))" radius={[6, 6, 0, 0]} name="Расходы" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Прибыль по месяцам</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }} formatter={(v: number) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="profit" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 4 }} name="Прибыль" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Источники клиентов</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {sourceData.map((_, i) => <Cell key={i} fill={sourceColors[i % sourceColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {sourceData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sourceColors[i % sourceColors.length] }} />
                  {s.name} ({s.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Популярные марки</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brandData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} name="Заказов" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
