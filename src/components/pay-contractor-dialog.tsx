"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, cn } from "@/lib/utils";
import { useData } from "@/lib/data-context";
import { getSupabase } from "@/lib/supabase";
import type { Order } from "@/lib/types";
import { X, Loader2, Check, HandCoins, CheckCircle2 } from "lucide-react";

type Kind = "seamstress" | "chinese" | "material";
type Mode = Kind | "all";

const kindLabels: Record<Kind, string> = {
  seamstress: "Оксане",
  chinese: "Китайцам",
  material: "Материалы",
};

const categoryByKind: Record<Kind, string> = {
  seamstress: "Оплата Оксане",
  chinese: "Оплата китайцам",
  material: "Материалы",
};

/**
 * Выплаты подрядчикам по заказу. Деньги списываются только здесь —
 * автоматом ничего не уходит: иногда Оксане и китайцам не платят вовсе.
 */
export function PayContractorDialog({ order, onDone }: { order: Order; onDone?: () => void }) {
  const { accounts, transactions, expenseCategories } = useData();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("seamstress");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [confirmExtra, setConfirmExtra] = useState(false);

  const paidFor = (kind: Kind) => {
    const cat = expenseCategories.find(c => c.name === categoryByKind[kind]);
    if (!cat) return 0;
    return transactions
      .filter(t => t.type === "expense" && t.orderId === order.id && t.categoryId === cat.id)
      .reduce((s, t) => s + t.amount, 0);
  };

  const accrued: Record<Kind, number> = {
    seamstress: order.seamstressPayment || 0,
    chinese: order.chineseCost || 0,
    material: order.materialCost || 0,
  };
  const paid: Record<Kind, number> = {
    seamstress: paidFor("seamstress"),
    chinese: paidFor("chinese"),
    material: paidFor("material"),
  };
  const due: Record<Kind, number> = {
    seamstress: Math.max(0, accrued.seamstress - paid.seamstress),
    chinese: Math.max(0, accrued.chinese - paid.chinese),
    material: Math.max(0, accrued.material - paid.material),
  };

  // Показываем строку, если по ней есть начисление или уже были выплаты
  const visibleKinds = (Object.keys(accrued) as Kind[]).filter(
    k => accrued[k] > 0 || paid[k] > 0
  );
  const totalDue = visibleKinds.reduce((s, k) => s + due[k], 0);
  const unpaidKinds = visibleKinds.filter(k => due[k] > 0);

  const modeAmount = (m: Mode) => (m === "all" ? totalDue : due[m]);
  const modeLabel = (m: Mode) => (m === "all" ? "Полный расчёт" : kindLabels[m]);

  const openWith = (m: Mode) => {
    setMode(m);
    setAmount(String(modeAmount(m) || ""));
    setAccountId(accounts.find(a => a.active)?.id || "");
    setError("");
    setDone(false);
    setConfirmExtra(false);
    setOpen(true);
  };

  const submit = async () => {
    if (!accountId) return setError("Выберите, с какого счёта платите");
    const sb = getSupabase();
    if (!sb) return setError("Нет соединения с базой");

    if (mode !== "all") {
      const value = Number(amount);
      if (!value || value <= 0) return setError("Укажите сумму больше нуля");

      // Доплата сверх начисленного требует подтверждения:
      // вместе с ней вырастет и начисление по заказу
      if (value > due[mode] && !confirmExtra) {
        setConfirmExtra(true);
        return;
      }

      setSaving(true);
      setError("");
      const { error: err } = await sb.rpc("pay_contractor", {
        p_order_id: order.id,
        p_kind: mode,
        p_amount: value,
        p_account_id: accountId,
        p_comment: null,
        p_allow_extra: confirmExtra,
      });
      setSaving(false);
      if (err) return setError(err.message);
    } else {
      setSaving(true);
      setError("");
      const { error: err } = await sb.rpc("settle_order", {
        p_order_id: order.id,
        p_account_id: accountId,
        p_pay_chinese: true,
        p_pay_seamstress: true,
        p_pay_material: true,
      });
      setSaving(false);
      if (err) return setError(err.message);
    }

    setDone(true);
    setTimeout(() => { setOpen(false); onDone?.(); }, 900);
  };

  if (visibleKinds.length === 0) return null;

  const extraAmount = mode !== "all" ? Math.max(0, Number(amount) - due[mode]) : 0;

  return (
    <>
      <div className="mt-3 rounded-md border border-border bg-background p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">Выплаты подрядчикам</p>
          {totalDue > 0
            ? <span className="text-sm font-bold">осталось {formatCurrency(totalDue)}</span>
            : <span className="text-xs text-income font-medium">всё выплачено</span>}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Деньги спишутся со счёта только по нажатию — автоматом ничего не уходит
        </p>

        <div className="mt-3 space-y-2">
          {visibleKinds.map(k => {
            const settled = due[k] === 0;
            return (
              <div key={k} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{kindLabels[k]}</span>
                    {settled && <CheckCircle2 className="h-3.5 w-3.5 text-income shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    начислено {formatCurrency(accrued[k])}
                    {paid[k] > 0 && ` · выплачено ${formatCurrency(paid[k])}`}
                  </p>
                </div>
                <span className={cn("text-sm font-semibold shrink-0", settled && "text-muted-foreground")}>
                  {settled ? "—" : formatCurrency(due[k])}
                </span>
                <Button
                  size="sm"
                  variant={settled ? "outline" : "default"}
                  className={cn("shrink-0", settled && "text-muted-foreground")}
                  onClick={() => openWith(k)}
                >
                  <HandCoins className="h-3.5 w-3.5 mr-1" />
                  {settled ? "Доплатить" : "Выплатить"}
                </Button>
              </div>
            );
          })}
        </div>

        {unpaidKinds.length > 1 && (
          <Button className="w-full mt-3" onClick={() => openWith("all")}>
            <HandCoins className="h-4 w-4 mr-2" />
            Рассчитаться полностью · {formatCurrency(totalDue)}
          </Button>
        )}

        {order.remaining > 0 && totalDue > 0 && (
          <p className="mt-2 text-xs text-warning">
            Клиент ещё должен {formatCurrency(order.remaining)}. Платить подрядчику
            можно и сейчас — например, если работа уже сделана.
          </p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end lg:items-center justify-center" onClick={() => !saving && setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-t-2xl lg:rounded-lg border border-border bg-card p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {done ? (
              <div className="py-6 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-income/15 flex items-center justify-center">
                  <Check className="h-7 w-7 text-income" />
                </div>
                <p className="mt-3 font-semibold text-income">Выплата проведена</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{modeLabel(mode)}</h2>
                    <p className="text-sm text-muted-foreground">
                      Заказ №{order.number}
                      {mode !== "all" && due[mode] === 0 && " · уже выплачено полностью"}
                    </p>
                  </div>
                  <button onClick={() => setOpen(false)} className="p-2 text-muted-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {mode === "all" ? (
                    <div className="rounded-md border border-border bg-background p-3 space-y-1.5">
                      {unpaidKinds.map(k => (
                        <div key={k} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{kindLabels[k]}</span>
                          <span className="font-semibold">{formatCurrency(due[k])}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-border pt-1.5 text-sm">
                        <span className="font-medium">Итого</span>
                        <span className="font-bold">{formatCurrency(totalDue)}</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-sm text-muted-foreground">
                        Сумма · можно изменить и платить частями
                      </label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={amount}
                        onChange={e => { setAmount(e.target.value); setConfirmExtra(false); }}
                        className="h-14 text-center text-2xl font-bold"
                        autoFocus
                      />
                      {extraAmount > 0 && (
                        <p className="mt-1.5 text-xs text-warning">
                          Это на {formatCurrency(extraAmount)} больше начисленного.
                          Начисление по заказу вырастет на эту же сумму — иначе отчёты разойдутся.
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm text-muted-foreground">С какого счёта</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {accounts.filter(a => a.active).map(a => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setAccountId(a.id)}
                          className={cn(
                            "rounded-md border p-3 text-left transition-colors",
                            accountId === a.id ? "border-primary bg-primary/10" : "border-border bg-background"
                          )}
                        >
                          <span className="block text-sm font-medium">{a.name}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {formatCurrency(a.balance)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-sm text-expense">{error}</p>}

                  <Button
                    className={cn("w-full", confirmExtra && "bg-warning text-white hover:bg-warning/90")}
                    size="lg"
                    disabled={saving}
                    onClick={() => void submit()}
                  >
                    {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <HandCoins className="h-5 w-5 mr-2" />}
                    {saving ? "Проводим…" : confirmExtra ? "Подтвердить доплату" : "Выплатить"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
