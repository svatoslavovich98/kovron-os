"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateShort, getGreeting } from "@/lib/utils";
import { demoOrders, demoAccounts, demoTransactions, demoAuditLog, demoSeamstressPayments, demoClients, demoCars } from "@/lib/demo-data";
import type { PeriodFilter } from "@/lib/types";
import {
  Plus, Bell, ShoppingBag, Factory, Clock, CheckCircle2,
  AlertTriangle, Wallet, TrendingUp, TrendingDown, ArrowRight,
  Package, Truck,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const periods = [
  { key: "today", label: "Сегодня" },
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
] as const;

export default function DashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");

  if (!user) return null;

  const orders = demoOrders;
  const accounts = demoAccounts;

  // Order stats
  const newOrders = orders.filter((o) => o.status === "new").length;
  const pendingProduction = orders.filter((o) => ["pending_production", "assigned"].includes(o.status)).length;
  const inProgress = orders.filter((o) => o.status === "in_progress").length;
  const ready = orders.filter((o) => o.status === "ready").length;
  const pendingDelivery = orders.filter((o) => o.status === "pending_delivery").length;
  const overdue = orders.filter((o) => {
    if (!o.desiredDate || ["completed", "cancelled", "delivered"].includes(o.status)) return false;
    return new Date(o.desiredDate) < new Date();
  }).length;
  const pendingPayment = orders.filter((o) => o.remaining > 0 && !["cancelled"].includes(o.status)).length;
  const totalDebt = orders.reduce((sum, o) => sum + o.remaining, 0);

  // Financial stats
  const totalIncome = demoTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = demoTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = totalIncome - totalExpense;
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const seamstressAccrued = demoSeamstressPayments.filter((p) => p.status === "accrued").reduce((s, p) => s + p.amount, 0);

  // Chart data
  const chartData = [
    { name: "Пн", income: 8000, expense: 3000 },
    { name: "Вт", income: 12000, expense: 2500 },
    { name: "Ср", income: 5000, expense: 7500 },
    { name: "Чт", income: 15000, expense: 4000 },
    { name: "Пт", income: 10000, expense: 5500 },
    { name: "Сб", income: 18000, expense: 3000 },
    { name: "Вс", income: 6000, expense: 1500 },
  ];

  // Today's tasks
  const todayTasks = [
    { text: `Выдать ${demoCars[3]?.brand} ${demoCars[3]?.model}`, type: "delivery" },
    { text: `Получить остаток ${formatCurrency(7000)}`, type: "payment" },
    { text: `Проверить готовность ${demoCars[1]?.brand} ${demoCars[1]?.model}`, type: "check" },
  ];

  const now = new Date();

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{getGreeting()}, {user.name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {formatDateShort(now)} {now.getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/orders/new">
            <Button size="default">
              <Plus className="h-5 w-5 mr-1" />
              Новый заказ
            </Button>
          </Link>
          <button className="relative p-2 rounded-sm hover:bg-card transition-colors">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-expense" />
          </button>
        </div>
      </div>

      {/* Period Switcher */}
      <div className="flex gap-2">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              period === p.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Order KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Новые", value: newOrders, icon: ShoppingBag, color: "text-info" },
          { label: "Ожидают произв.", value: pendingProduction, icon: Clock, color: "text-warning" },
          { label: "В работе", value: inProgress, icon: Factory, color: "text-primary" },
          { label: "Готовы", value: ready, icon: CheckCircle2, color: "text-income" },
          { label: "Ожидают выдачи", value: pendingDelivery, icon: Truck, color: "text-income" },
          { label: "Просрочены", value: overdue, icon: AlertTriangle, color: "text-expense" },
          { label: "Ожидают оплаты", value: pendingPayment, icon: Wallet, color: "text-warning" },
          { label: "Долг клиентов", value: formatCurrency(totalDebt), icon: TrendingDown, color: "text-expense", isAmount: true },
        ].map((item, i) => (
          <Card key={i} className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <p className={`text-2xl font-bold ${item.color}`}>
                {typeof item.value === "number" && !item.isAmount ? item.value : item.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Получено</p>
            <p className="text-xl font-bold text-income">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Расходы</p>
            <p className="text-xl font-bold text-expense">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Прибыль</p>
            <p className={`text-xl font-bold ${profit >= 0 ? "text-income" : "text-expense"}`}>
              {formatCurrency(profit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">На счетах</p>
            <p className="text-xl font-bold">{formatCurrency(totalBalance)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Chart */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-4">Доходы и расходы</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 13 }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Bar dataKey="income" fill="hsl(var(--income))" radius={[6, 6, 0, 0]} name="Доходы" />
                  <Bar dataKey="expense" fill="hsl(var(--expense))" radius={[6, 6, 0, 0]} name="Расходы" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Today's tasks */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Сегодня необходимо</h3>
            <div className="space-y-2">
              {todayTasks.map((task, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-background">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${
                    task.type === "delivery" ? "bg-income" : task.type === "payment" ? "bg-warning" : "bg-info"
                  }`} />
                  <span className="text-sm">{task.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Последние действия</h3>
            <Link href="/admin" className="text-xs text-primary hover:underline">
              Все действия
            </Link>
          </div>
          <div className="space-y-3">
            {demoAuditLog.slice(0, 4).map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 text-sm">
                <div className="mt-1">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {entry.userName[0]}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground">{entry.details}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(entry.timestamp).toLocaleString("ru-RU", {
                      day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seamstress payments summary */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Оксана — выплаты</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-md bg-background">
              <p className="text-xs text-muted-foreground">Начислено</p>
              <p className="text-lg font-bold text-warning">{formatCurrency(seamstressAccrued)}</p>
            </div>
            <div className="p-3 rounded-md bg-background">
              <p className="text-xs text-muted-foreground">Ожидает выплаты</p>
              <p className="text-lg font-bold text-expense">{formatCurrency(seamstressAccrued)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
