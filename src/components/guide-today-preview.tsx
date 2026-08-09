"use client";

import { useMemo } from "react";
import { useData } from "@/lib/data-context";
import { formatCurrency, cn } from "@/lib/utils";

/**
 * Предпросмотр блока «Сегодня» с настоящими данными —
 * человек сразу видит свои цифры, а не выдуманный пример.
 */
export function GuideTodayPreview() {
  const { transactions, orders, expenseCategories, incomeCategories } = useData();

  const свод = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const txToday = transactions.filter(t => new Date(t.createdAt) >= start);
    const ordersToday = orders.filter(o => new Date(o.createdAt) >= start);
    const catName = (id?: string) =>
      [...expenseCategories, ...incomeCategories].find(c => c.id === id)?.name || "";

    const income = txToday.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = txToday.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    return {
      newOrders: ordersToday.length,
      newSum: ordersToday.reduce((s, o) => s + o.totalPrice, 0),
      income, expense,
      oksana: txToday.filter(t => t.type === "expense" && catName(t.categoryId) === "Оплата Оксане")
                     .reduce((s, t) => s + t.amount, 0),
      china: txToday.filter(t => t.type === "expense" && catName(t.categoryId) === "Оплата китайцам")
                    .reduce((s, t) => s + t.amount, 0),
      finished: orders.filter(o => o.statusHistory.some(h =>
        new Date(h.timestamp) >= start && h.newStatus === "completed")).length,
      empty: txToday.length === 0 && ordersToday.length === 0,
    };
  }, [transactions, orders, expenseCategories, incomeCategories]);

  const итог = свод.income - свод.expense;

  return (
    <div className="rounded-lg border border-primary/25 bg-gradient-to-br from-primary/8 to-transparent p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">Ваши данные прямо сейчас</p>
        <span className="text-[11px] text-muted-foreground">
          {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
        </span>
      </div>

      {свод.empty ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Сегодня пока тихо — так блок и выглядит в спокойный день
        </p>
      ) : (
        <>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Ячейка подпись="Новых заказов" значение={String(свод.newOrders)}
                    низ={свод.newSum > 0 ? `на ${formatCurrency(свод.newSum)}` : undefined} />
            <Ячейка подпись="Завершено" значение={String(свод.finished)} />
            <Ячейка подпись="Пришло" значение={formatCurrency(свод.income)} цвет="text-income" />
            <Ячейка подпись="Потрачено" значение={formatCurrency(свод.expense)} цвет="text-expense" />
          </div>

          {(свод.oksana > 0 || свод.china > 0) && (
            <div className="mt-2 flex flex-wrap gap-x-4 text-[11px] text-muted-foreground">
              {свод.oksana > 0 && <span>Оксане {formatCurrency(свод.oksana)}</span>}
              {свод.china > 0 && <span>Китайцам {formatCurrency(свод.china)}</span>}
            </div>
          )}

          <div className="mt-2.5 flex items-baseline justify-between border-t border-border pt-2">
            <span className="text-sm text-muted-foreground">Итог дня</span>
            <span className={cn("text-lg font-bold", итог >= 0 ? "text-income" : "text-expense")}>
              {итог >= 0 ? "+" : ""}{formatCurrency(итог)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function Ячейка({ подпись, значение, низ, цвет }: {
  подпись: string; значение: string; низ?: string; цвет?: string;
}) {
  return (
    <div className="rounded-md bg-background p-2">
      <p className="text-[10px] text-muted-foreground">{подпись}</p>
      <p className={cn("text-base font-bold", цвет)}>{значение}</p>
      {низ && <p className="text-[10px] text-muted-foreground">{низ}</p>}
    </div>
  );
}
