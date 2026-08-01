"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateShort, getGreeting } from "@/lib/utils";
import { useData } from "@/lib/data-context";
import { NotificationCenter } from "@/components/notification-center";
import type { PeriodFilter } from "@/lib/types";
import {
  Plus, ShoppingBag, Factory, CheckCircle2,
  AlertTriangle, Wallet, TrendingUp, TrendingDown, ArrowRight,
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

  const { orders, accounts, transactions, auditLog, seamstressPayments, cars } = useData();

  // Order stats
  const newOrders = orders.filter((o) => o.status === "new").length;
  const inProgress = orders.filter((o) => o.status === "in_progress").length;
  const ready = orders.filter((o) => o.status === "ready").length;
  const completed = orders.filter((o) => o.status === "completed" || o.status === "delivered").length;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  const overdue = orders.filter((o) => {
    if (!o.desiredDate || ["completed", "cancelled", "delivered"].includes(o.status)) return false;
    return new Date(o.desiredDate) < new Date();
  }).length;
  const pendingPayment = orders.filter((o) => o.remaining > 0 && !["cancelled"].includes(o.status)).length;
  const totalDebt = orders.reduce((sum, o) => sum + o.remaining, 0);

  // Границы выбранного периода
  const periodStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (period === "week") d.setDate(d.getDate() - 6);
    if (period === "month") d.setMonth(d.getMonth() - 1);
    return d;
  }, [period]);

  const periodTx = useMemo(
    () => transactions.filter((t) => new Date(t.createdAt) >= periodStart),
    [transactions, periodStart]
  );
  const periodOrders = useMemo(
    () => orders.filter((o) => new Date(o.createdAt) >= periodStart),
    [orders, periodStart]
  );

  // Financial stats — за выбранный период
  const totalIncome = periodTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = periodTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = totalIncome - totalExpense;
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  // Выплаты подрядчикам за период
  const paidToOksana = periodOrders.reduce((s, o) => s + (o.seamstressPayment || 0), 0);
  const paidToChina = periodOrders.reduce((s, o) => s + (o.chineseCost || 0), 0);

  const spPlanned = seamstressPayments.filter((p) => p.status === "planned").reduce((s, p) => s + p.amount, 0);
  const spAccrued = seamstressPayments.filter((p) => p.status === "accrued").reduce((s, p) => s + p.amount, 0);
  const spPaid = seamstressPayments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);

  // График за последние 7 дней — из реальных транзакций
  const chartData = useMemo(() => {
    const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const out: { name: string; income: number; expense: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - i);
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      const dayTx = transactions.filter((t) => {
        const d = new Date(t.createdAt);
        return d >= from && d < to;
      });
      out.push({
        name: days[from.getDay()],
        income: dayTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expense: dayTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      });
    }
    return out;
  }, [transactions]);

  const hasChartData = chartData.some((d) => d.income > 0 || d.expense > 0);

  // Задачи на сегодня — считаются из реальных заказов
  const todayTasks = useMemo(() => {
    const carLabel = (carId: string) => {
      const c = cars.find((x) => x.id === carId);
      return c ? `${c.brand} ${c.model}`.trim() : "заказ";
    };
    const tasks: { text: string; type: string; href: string }[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (const o of orders) {
      if (["completed", "cancelled"].includes(o.status)) continue;

      if (o.status === "ready") {
        tasks.push({
          text: `Выдать ${carLabel(o.carId)} — заказ №${o.number}`,
          type: "delivery",
          href: `/orders/${o.id}`,
        });
      }
      if (o.desiredDate && new Date(o.desiredDate) <= today && o.status !== "ready") {
        tasks.push({
          text: `Срок подошёл: ${carLabel(o.carId)} — заказ №${o.number}`,
          type: "check",
          href: `/orders/${o.id}`,
        });
      }
      if (o.remaining > 0 && ["ready", "completed", "delivered"].includes(o.status)) {
        tasks.push({
          text: `Получить остаток ${formatCurrency(o.remaining)} — заказ №${o.number}`,
          type: "payment",
          href: `/orders/${o.id}`,
        });
      }
    }
    return tasks.slice(0, 8);
  }, [orders, cars]);

  // Проверка пользователя — строго после всех хуков,
  // иначе React ругается на разное количество вызовов хуков.
  if (!user) return null;

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
          <NotificationCenter />
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
          { label: "В работе", value: inProgress, icon: Factory, color: "text-primary" },
          { label: "Готовы", value: ready, icon: CheckCircle2, color: "text-income" },
          { label: "Завершённые", value: completed, icon: CheckCircle2, color: "text-income" },
          { label: "Отменённые", value: cancelled, icon: AlertTriangle, color: "text-muted-foreground" },
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
            <h3 className="text-sm font-semibold mb-4">Доходы и расходы за 7 дней</h3>
            {!hasChartData ? (
              <div className="h-48 flex flex-col items-center justify-center text-center">
                <Wallet className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Операций пока нет</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  График появится после первых платежей
                </p>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        {/* Today's tasks */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Сегодня необходимо</h3>
            {todayTasks.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-8 w-8 text-income/50 mb-2" />
                <p className="text-sm text-muted-foreground">Срочных задач нет</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Здесь появятся выдачи, сроки и недоплаты
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((task, i) => (
                  <Link
                    key={i}
                    href={task.href}
                    className="flex items-center gap-3 p-3 rounded-md bg-background hover:bg-secondary2 transition-colors"
                  >
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      task.type === "delivery" ? "bg-income" : task.type === "payment" ? "bg-warning" : "bg-info"
                    }`} />
                    <span className="text-sm flex-1">{task.text}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            )}
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
          {auditLog.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Действий пока не было
            </p>
          )}
          <div className="space-y-3">
            {auditLog.slice(0, 4).map((entry) => (
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

      {/* Выплаты подрядчикам */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold">Выплаты подрядчикам</h3>
            <span className="text-xs text-muted-foreground">
              {period === "today" ? "за сегодня" : period === "week" ? "за неделю" : "за месяц"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-md bg-[#ADD256]/10 border border-[#ADD256]/20">
              <p className="text-xs text-muted-foreground">Оксане (пошив)</p>
              <p className="text-xl font-bold text-[#ADD256]">{formatCurrency(paidToOksana)}</p>
            </div>
            <div className="p-3 rounded-md bg-[#F59E0B]/10 border border-[#F59E0B]/20">
              <p className="text-xs text-muted-foreground">Китайцам</p>
              <p className="text-xl font-bold text-[#F59E0B]">{formatCurrency(paidToChina)}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-2">Статус расчётов с Оксаной</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-md bg-background">
              <p className="text-xs text-muted-foreground">Запланировано</p>
              <p className="text-base font-bold">{formatCurrency(spPlanned)}</p>
            </div>
            <div className="p-3 rounded-md bg-background">
              <p className="text-xs text-muted-foreground">Начислено</p>
              <p className="text-base font-bold text-warning">{formatCurrency(spAccrued)}</p>
            </div>
            <div className="p-3 rounded-md bg-background">
              <p className="text-xs text-muted-foreground">Выплачено</p>
              <p className="text-base font-bold text-income">{formatCurrency(spPaid)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
