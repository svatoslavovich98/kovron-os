"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import { useData } from "@/lib/data-context";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { Globe, UserCheck } from "lucide-react";

const periods = ["Неделя", "Месяц", "Квартал", "Год"] as const;

function getPeriodRange(period: string): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  switch (period) {
    case "Неделя": from.setDate(from.getDate() - 7); break;
    case "Месяц": from.setMonth(from.getMonth() - 1); break;
    case "Квартал": from.setMonth(from.getMonth() - 3); break;
    case "Год": from.setFullYear(from.getFullYear() - 1); break;
  }
  return { from, to };
}

export default function AnalyticsPage() {
  const { orders, transactions, clients, cars } = useData();
  const [period, setPeriod] = useState("Месяц");

  const { from, to } = useMemo(() => getPeriodRange(period), [period]);

  const filteredOrders = useMemo(() =>
    orders.filter(o => new Date(o.createdAt) >= from && new Date(o.createdAt) <= to),
    [orders, from, to]
  );

  const filteredTransactions = useMemo(() =>
    transactions.filter(t => new Date(t.createdAt) >= from && new Date(t.createdAt) <= to),
    [transactions, from, to]
  );

  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((s, o) => s + o.totalPrice, 0);
  const totalReceived = filteredTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filteredTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const avgCheck = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const clientDebt = filteredOrders.reduce((s, o) => s + o.remaining, 0);

  // Payment stats for seamstress and Chinese suppliers
  const totalSeamstress = filteredOrders.reduce((s, o) => s + o.seamstressPayment, 0);
  const totalChinese = filteredOrders.reduce((s, o) => s + (o.chineseCost || 0), 0);
  const totalMaterial = filteredOrders.reduce((s, o) => s + o.materialCost, 0);
  const totalPlannedProfit = filteredOrders.reduce((s, o) => s + o.plannedProfit, 0);

  // Доходы/расходы по последним 7 дням — из реальных транзакций
  const revenueByDay = useMemo(() => {
    const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const out: { name: string; income: number; expense: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayTx = transactions.filter((t) => {
        const td = new Date(t.createdAt);
        return td >= d && td < next;
      });
      out.push({
        name: days[d.getDay()],
        income: dayTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expense: dayTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      });
    }
    return out;
  }, [transactions]);

  // Прибыль по последним 7 месяцам — из реальных транзакций
  const profitByMonth = useMemo(() => {
    const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
    const out: { name: string; profit: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      d.setMonth(d.getMonth() - i);
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      const monthTx = transactions.filter((t) => {
        const td = new Date(t.createdAt);
        return td >= d && td < next;
      });
      const inc = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const exp = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      out.push({ name: months[d.getMonth()], profit: inc - exp });
    }
    return out;
  }, [transactions]);

  // Расходы Оксане / китайцам по месяцам — для сравнительного графика
  const payoutsByMonth = useMemo(() => {
    const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
    const out: { name: string; oksana: number; china: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      d.setMonth(d.getMonth() - i);
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      const mOrders = orders.filter((o) => {
        const od = new Date(o.createdAt);
        return od >= d && od < next;
      });
      out.push({
        name: months[d.getMonth()],
        oksana: mOrders.reduce((s, o) => s + (o.seamstressPayment || 0), 0),
        china: mOrders.reduce((s, o) => s + (o.chineseCost || 0), 0),
      });
    }
    return out;
  }, [orders]);

  // Brand popularity (за выбранный период)
  const brandCounts: Record<string, number> = {};
  filteredOrders.forEach((o) => {
    const car = cars.find((c) => c.id === o.carId);
    if (car) brandCounts[car.brand] = (brandCounts[car.brand] || 0) + 1;
  });
  const brandData = Object.entries(brandCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Source stats
  const sourceCounts: Record<string, number> = {};
  clients.forEach((c) => {
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
          { label: "Заказов", value: totalOrders },
          { label: "Выручка", value: formatCurrency(totalRevenue) },
          { label: "Получено", value: formatCurrency(totalReceived) },
          { label: "Расходы", value: formatCurrency(totalExpenses) },
          { label: "Средний чек", value: formatCurrency(avgCheck) },
          { label: "Долг клиентов", value: formatCurrency(clientDebt) },
          { label: "Ожидаемая прибыль", value: formatCurrency(totalPlannedProfit) },
          { label: "Факт. прибыль", value: formatCurrency(totalReceived - totalExpenses) },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-xl font-bold mt-1">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Расходы по контрагентам */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-4">Расходы по контрагентам за период</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-[#ADD256]/10 border border-[#ADD256]/20">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-4 w-4 text-[#ADD256]" />
                <span className="text-xs text-muted-foreground">Оксане (пошив)</span>
              </div>
              <p className="text-2xl font-bold text-[#ADD256]">{formatCurrency(totalSeamstress)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredOrders.filter(o => o.seamstressPayment > 0).length} заказов
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-[#F59E0B]" />
                <span className="text-xs text-muted-foreground">Китайцам</span>
              </div>
              <p className="text-2xl font-bold text-[#F59E0B]">{formatCurrency(totalChinese)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredOrders.filter(o => (o.chineseCost || 0) > 0).length} заказов
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#68A7FF]/10 border border-[#68A7FF]/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground">Материалы</span>
              </div>
              <p className="text-2xl font-bold text-[#68A7FF]">{formatCurrency(totalMaterial)}</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground">Итого себестоимость</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalSeamstress + totalChinese + totalMaterial)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <h3 className="text-sm font-semibold mb-3">Выплаты: Оксана и китайцы по месяцам</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payoutsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }} formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="oksana" fill="#ADD256" radius={[6, 6, 0, 0]} name="Оксане" />
                  <Bar dataKey="china"  fill="#F59E0B" radius={[6, 6, 0, 0]} name="Китайцам" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 justify-center mt-2">
              <div className="flex items-center gap-1.5 text-xs">
                <div className="h-2.5 w-2.5 rounded-full bg-[#ADD256]" /> Оксане
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" /> Китайцам
              </div>
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
