"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { useData } from "@/lib/data-context";
import {
  TrendingUp, TrendingDown, ArrowLeftRight, Wallet,
  Plus, Minus, X, Check, ChevronDown, Download,
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
  const { user } = useAuth();
  const { accounts, transactions, expenseCategories, incomeCategories, createTransaction } = useData();
  const [period, setPeriod] = useState<string>("month");
  const [modal, setModal] = useState<ModalType>(null);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<{ tone: "saving" | "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!modal) return;
    const active = accounts.filter(item => item.active);
    setAccountId(active[0]?.id || ""); setToAccountId(active[1]?.id || active[0]?.id || "");
    setCategoryId((modal === "income" ? incomeCategories : expenseCategories)[0]?.id || "");
    setAmount(""); setComment(""); setFormError(null);
  }, [modal, accounts, incomeCategories, expenseCategories]);

  const saveTransaction = async () => {
    if (savingRef.current) return;
    const value = Number(amount);
    if (!modal || !value || value <= 0 || !accountId || (modal === "transfer" && (!toAccountId || toAccountId === accountId))) {
      setFormError("Проверьте сумму, счёт и выбранные параметры"); return;
    }
    savingRef.current = true;
    setSaving(true); setFormError(null);
    setSaveNotice({ tone: "saving", text: "Операция уже добавлена. Синхронизируем с базой в фоне…" });
    const savePromise = createTransaction({
      type: modal, amount: value, categoryId: modal === "transfer" ? undefined : categoryId,
      accountId, toAccountId: modal === "transfer" ? toAccountId : undefined,
      description: comment || undefined, userId: user?.id, userName: user?.name,
      createdAt: new Date().toISOString(),
    });
    setModal(null);
    const created = await savePromise;
    savingRef.current = false;
    setSaving(false);
    setSaveNotice(created
      ? { tone: "success", text: "Операция сохранена. Баланс пересчитан автоматически." }
      : { tone: "error", text: "Операцию не удалось добавить. Проверьте подключение и повторите попытку." });
  };

  const periodStart = new Date();
  periodStart.setHours(0, 0, 0, 0);
  if (period === "week") periodStart.setDate(periodStart.getDate() - 6);
  if (period === "month") periodStart.setMonth(periodStart.getMonth() - 1);
  if (period === "year") periodStart.setFullYear(periodStart.getFullYear() - 1);
  const periodTransactions = transactions.filter(item => new Date(item.createdAt) >= periodStart);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalIncome = periodTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = periodTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = totalIncome - totalExpense;

  // Expense by category for pie chart
  const expenseByCategory = expenseCategories.map((cat) => ({
    name: cat.name,
    value: periodTransactions
      .filter((t) => t.type === "expense" && t.categoryId === cat.id)
      .reduce((s, t) => s + t.amount, 0),
    color: cat.color,
    icon: cat.icon,
  })).filter((c) => c.value > 0);

  const sortedTransactions = [...periodTransactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const exportFinance = () => {
    const cell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Дата", "Тип", "Сумма", "Счёт", "Категория", "Комментарий", "Сотрудник"],
      ...sortedTransactions.map(item => {
        const category = item.type === "income" ? incomeCategories.find(cat => cat.id === item.categoryId) : expenseCategories.find(cat => cat.id === item.categoryId);
        const account = accounts.find(acc => acc.id === item.accountId);
        return [item.createdAt, item.type === "income" ? "Доход" : item.type === "expense" ? "Расход" : "Перевод", item.amount, account?.name, category?.name, item.description, item.userName];
      }),
    ];
    const blob = new Blob(["\uFEFF" + rows.map(row => row.map(cell).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `kovron-finance-${period}-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3"><h1 className="text-xl font-bold">Финансы</h1><Button variant="outline" size="sm" onClick={exportFinance}><Download className="h-4 w-4 mr-1" />Экспорт</Button></div>

      {saveNotice && (
        <div className={cn(
          "flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm",
          saveNotice.tone === "error" ? "border-expense/30 bg-expense/10 text-expense" :
          saveNotice.tone === "success" ? "border-income/30 bg-income/10 text-income" :
          "border-primary/30 bg-primary/10 text-foreground",
        )}>
          <span>{saveNotice.text}</span>
          <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setSaveNotice(null)} aria-label="Закрыть сообщение"><X className="h-4 w-4" /></button>
        </div>
      )}

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
                ? incomeCategories.find((c) => c.id === t.categoryId)
                : expenseCategories.find((c) => c.id === t.categoryId);
              const account = accounts.find((a) => a.id === t.accountId);

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
                <Input type="number" placeholder="0" autoFocus value={amount} onChange={event => setAmount(event.target.value)} className="text-2xl font-bold h-16 text-center" />
              </div>

              {modal !== "transfer" && (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Категория</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(modal === "income" ? incomeCategories : expenseCategories).map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryId(cat.id)}
                        className={cn("flex flex-col items-center gap-1 p-3 rounded-md border hover:border-primary/30 transition-colors", categoryId === cat.id ? "border-primary bg-primary/10" : "border-border")}
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
                             cat.icon === "RotateCcw" ? "↩" :
                             cat.icon === "Globe" ? "🌐" : "📋"}
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
                  {accounts.filter((a) => a.active).map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => setAccountId(acc.id)}
                      className={cn("flex-1 p-3 rounded-md border hover:border-primary/30 transition-colors text-center", accountId === acc.id ? "border-primary bg-primary/10" : "border-border")}
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
                    {accounts.filter((a) => a.active).map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => setToAccountId(acc.id)}
                        className={cn("flex-1 p-3 rounded-md border hover:border-primary/30 transition-colors text-center", toAccountId === acc.id ? "border-primary bg-primary/10" : "border-border")}
                      >
                        <p className="text-sm font-medium">{acc.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Комментарий</label>
                <Input placeholder="Комментарий..." value={comment} onChange={event => setComment(event.target.value)} />
              </div>

              {formError && <p className="text-sm text-expense">{formError}</p>}
              <Button className="w-full" size="lg" disabled={saving} onClick={() => void saveTransaction()}>
                <Check className="h-5 w-5 mr-1" />
                {saving ? "Сохранение…" : "Сохранить"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
