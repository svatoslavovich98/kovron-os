"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, cn } from "@/lib/utils";
import { Pencil, Trash2, RotateCcw, Check, TrendingDown, X } from "lucide-react";

type Row = { id: number; label: string; amount: number; account: string };

const НАЧАЛО: Row[] = [
  { id: 1, label: "Реклама · Авито", amount: 4335, account: "Карта Kovron" },
  { id: 2, label: "Реклама · Авито", amount: 4335, account: "Карта Kovron" },
  { id: 3, label: "Ремонт · Мастеру", amount: 1000, account: "Наличные" },
];

const ПРИХОД = 17000;

/**
 * Живой пример: как исправить ошибочную операцию.
 * Показан типичный случай — реклама записалась дважды.
 */
export function GuideFixSimulator() {
  const [rows, setRows] = useState<Row[]>(НАЧАЛО);
  const [open, setOpen] = useState<Row | null>(null);
  const [draft, setDraft] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const card = ПРИХОД - rows.filter(r => r.account === "Карта Kovron").reduce((s, r) => s + r.amount, 0);
  const дубльЕсть = rows.filter(r => r.label.includes("Авито")).length > 1;
  const исправлено = rows.length < НАЧАЛО.length || rows.some((r, i) => r.amount !== НАЧАЛО[i]?.amount);

  const openRow = (r: Row) => { setOpen(r); setDraft(String(r.amount)); setDone(null); };

  const save = () => {
    if (!open) return;
    const value = Number(draft);
    if (!value || value <= 0) return;
    setRows(prev => prev.map(r => r.id === open.id ? { ...r, amount: value } : r));
    setDone(`Сумма изменена на ${formatCurrency(value)} — баланс пересчитан`);
    setOpen(null);
  };

  const remove = () => {
    if (!open) return;
    setRows(prev => prev.filter(r => r.id !== open.id));
    setDone(`Операция удалена — ${formatCurrency(open.amount)} вернулись на счёт`);
    setOpen(null);
  };

  const reset = () => { setRows(НАЧАЛО); setOpen(null); setDone(null); };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-background/50 p-3">
        <p className="text-sm font-semibold">Попробуйте исправить</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Реклама случайно записалась дважды. Нажмите на лишнюю строку.
        </p>
      </div>

      {/* Баланс */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-xs text-muted-foreground">Карта Kovron</span>
        <span className={cn("text-lg font-bold tabular-nums transition-colors",
          дубльЕсть ? "text-expense" : "text-income")}>
          {formatCurrency(card)}
        </span>
      </div>

      {/* Список операций */}
      <div className="divide-y divide-border">
        {rows.map(r => (
          <button
            key={r.id}
            onClick={() => openRow(r)}
            className="flex w-full items-center gap-3 p-3 text-left hover:bg-background/60 transition-colors"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-expense/10">
              <TrendingDown className="h-4 w-4 text-expense" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{r.label}</p>
              <p className="text-[11px] text-muted-foreground">{r.account}</p>
            </div>
            <span className="text-sm font-semibold text-expense">−{formatCurrency(r.amount)}</span>
            <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
          </button>
        ))}
        {rows.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">Операций не осталось</p>
        )}
      </div>

      {/* Результат */}
      {done && (
        <div className="border-t border-border bg-income/5 p-3">
          <p className="flex items-start gap-2 text-sm text-income">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            {done}
          </p>
        </div>
      )}

      {(исправлено || done) && (
        <div className="border-t border-border p-3">
          <button onClick={reset}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw className="h-3.5 w-3.5" />
            Вернуть как было
          </button>
        </div>
      )}

      {/* Окно правки */}
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center lg:items-center" onClick={() => setOpen(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-t-2xl border border-border bg-card p-4 shadow-2xl lg:rounded-lg"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">{open.label}</p>
                <p className="text-xs text-muted-foreground">{open.account}</p>
              </div>
              <button onClick={() => setOpen(null)} className="p-1.5 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-3 block text-sm text-muted-foreground">Сумма</label>
            <Input
              type="number"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="mt-1 h-12 text-center text-xl font-bold"
            />

            <div className="mt-3 flex gap-2">
              <Button variant="outline" className="flex-1 text-expense" onClick={remove}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Удалить
              </Button>
              <Button className="flex-1" onClick={save}>
                <Check className="mr-1.5 h-4 w-4" />
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
