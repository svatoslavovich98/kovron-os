"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { demoAccounts, demoTransactions, demoExpenseCategories, demoIncomeCategories } from "@/lib/demo-data";
import {
  TrendingUp, TrendingDown, ArrowLeftRight, Wallet,
  Plus, Minus, X, Check, ChevronDown,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";
import * as LucideIcons from "lucide-react";

const periods = [
  { key: "day", label: "День" },
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "year", label: "Год" },
] as const;

type ModalType = "income" | "expense" | "transfer" | null;

export default function FinancePage() {
  const [period, setPeriod] = useState<string>("month");
  const [modal, setModal] = useState<ModalType>(null);

  const totalBalance = demoAccounts.reduce((s, a) => s + a.balance, 0);
  const totalIncome = demoTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = demoTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = totalIncome - totalExpense;

  // Expense by category for pie chart
  const expenseByCategory = demoExpenseCategories.map((cat) => ({
    name: cat.name,
    value: demoTransactions
      .filter((t) => t.type === "expense" && t.categoryId === cat.id)
      .reduce((s, t) => s + t.amount, 0),
    color: cat.color,
    icon: cat.icon,
  })).filter((c) => c.value > 0);

  const sortedTransactions = [...demoTransactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
      <h1 className="text-xl font-bold">Финансы</h1>

      {/* Balance */}
      <Card className="bg-gradient-to-br from-card to-secondary2">
        <CardContent className="p-5 text-center">
          <p className="text-sm text-muted-foreground mb-1">Баланс</p>
          <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
        </CardContent>
      </Card>

      {/* Income / Expense / Profit */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Доходы</p>
            <p className="text-lg font-bold text-income">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Расходы</p>
            <p className="text-lg font-bold text-expense">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Прибыль</p>
            <p className={`text-lg font-bold ${profit >= 0 ? "text-income" : "text-expense"}`}>
              {formatCurrency(profit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period switcher */}
      <div className="flex gap-2 justify-center">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
              period === p.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Pie chart */}
      {expenseByCategory.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Расходы по категориям</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenseByCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: 13,
                    }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Category grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
              {expenseByCategory.map((cat) => (
                <div key={cat.name} className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-background transition-colors cursor-pointer">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                    <span style={{ color: cat.color }} className="text-lg">
                      {cat.icon === "Scissors" ? "✂" :
                       cat.icon === "UserCheck" ? "👤" :
                       cat.icon === "Megaphone" ? "📢" :
                       cat.icon === "Home" ? "🏠" : "📋"}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">{cat.name}</span>
                  <span className="text-xs font-semibold">{formatCurrency(cat.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button variant="income" className="h-14" onClick={() => setModal("income")}>
          <Plus className="h-5 w-5 mr-1" />
          Доход
        </Button>
        <Button variant="destructive" className="h-14" onClick={() => setModal("expense")}>
          <Minus className="h-5 w-5 mr-1" />
          Расход
        </Button>
        <Button variant="outline" className="h-14" onClick={() => setModal("transfer")}>
          <ArrowLeftRight className="h-5 w-5 mr-1" />
          Перевод
        </Button>
      </div>

      {/* Transaction history */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">История операций</h3>
          <div className="space-y-1">
            {sortedTransactions.map((t) => {
              const cat = t.type === "income"
                ? demoIncomeCategories.find((c) => c.id === t.categoryId)
                : demoExpenseCategories.find((c) => c.id === t.categoryId);
              const account = demoAccounts.find((a) => a.id === t.accountId);

              return (
                <div key={t.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                    t.type === "income" ? "bg-income/10" : t.type === "expense" ? "bg-expense/10" : "bg-info/10"
                  )}>
                    {t.type === "income" ? (
                      <TrendingUp className="h-5 w-5 text-income" />
                    ) : t.type === "expense" ? (
                      <TrendingDown className="h-5 w-5 text-expense" />
                    ) : (
                      <ArrowLeftRight className="h-5 w-5 text-info" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {cat?.name || t.description || "Перевод"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {account?.name}
                      {t.description ? ` • ${t.description}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn(
                      "text-sm font-semibold",
                      t.type === "income" ? "text-income" : t.type === "expense" ? "text-expense" : "text-info"
                    )}>
                      {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
                      {formatCurrency(t.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(t.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal overlay for adding income/expense/transfer */}
      {modal && (
        <div className="fixed inset-0 z-[70] flex items-end lg:items-center justify-center" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg mx-0 lg:mx-4 rounded-t-2xl lg:rounded-lg bg-card border border-border p-5 animate-fade-in max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                {modal === "income" ? "Новый доход" : modal === "expense" ? "Новый расход" : "Перевод"}
              </h2>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-background rounded-sm transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Сумма</label>
                <Input type="number" placeholder="0" autoFocus className="text-2xl font-bold h-16 text-center" />
              </div>

              {modal !== "transfer" && (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Категория</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(modal === "income" ? demoIncomeCategories : demoExpenseCategories).map((cat) => (
                      <button
                        key={cat.id}
                        className="flex flex-col items-center gap-1 p-3 rounded-md border border-border hover:border-primary/30 transition-colors"
                      >
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${cat.color}20` }}
                        >
                          <span style={{ color: cat.color }}>
                            {cat.icon === "ShoppingBag" ? "🛍" :
                             cat.icon === "TrendingUp" ? "📈" :
                             cat.icon === "Scissors" ? "✂" :
                             cat.icon === "UserCheck" ? "👤" :
                             cat.icon === "Megaphone" ? "📢" :
                             cat.icon === "Home" ? "🏠" :
                             cat.icon === "Wrench" ? "🔧" :
                             cat.icon === "Hammer" ? "🔨" :
                             cat.icon === "Truck" ? "🚚" :
                             cat.icon === "Receipt" ? "🧾" :
                             cat.icon === "Phone" ? "📱" :
                             cat.icon === "RotateCcw" ? "↩" : "📋"}
                          </span>
                        </div>
                        <span className="text-[10px] text-center leading-tight">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  {modal === "transfer" ? "Откуда" : "Счёт"}
                </label>
                <div className="flex gap-2">
                  {demoAccounts.filter((a) => a.active).map((acc) => (
                    <button
                      key={acc.id}
                      className="flex-1 p-3 rounded-md border border-border hover:border-primary/30 transition-colors text-center"
                    >
                      <p className="text-sm font-medium">{acc.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(acc.balance)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {modal === "transfer" && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Куда</label>
                  <div className="flex gap-2">
                    {demoAccounts.filter((a) => a.active).map((acc) => (
                      <button
                        key={acc.id}
                        className="flex-1 p-3 rounded-md border border-border hover:border-primary/30 transition-colors text-center"
                      >
                        <p className="text-sm font-medium">{acc.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Комментарий</label>
                <Input placeholder="Комментарий..." />
              </div>

              <Button className="w-full" size="lg" onClick={() => { alert("Сохранено! (демо)"); setModal(null); }}>
                <Check className="h-5 w-5 mr-1" />
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
