"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderPhotoPicker } from "@/components/order-photo-picker";
import { useData } from "@/lib/data-context";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/lib/types";

export function ReceivePaymentDialog({ order }: { order: Order }) {
  const { accounts, receiveOrderPayment } = useData();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(order.remaining));
  const [accountId, setAccountId] = useState("");
  const [method, setMethod] = useState("Наличные");
  const [comment, setComment] = useState("");
  const [receipt, setReceipt] = useState<string[]>([]);
  const [markDelivered, setMarkDelivered] = useState(false);

  useEffect(() => {
    if (!accountId && accounts.length) setAccountId(accounts.find(item => item.active)?.id || accounts[0].id);
  }, [accounts, accountId]);

  const save = async () => {
    const value = Number(amount);
    if (!value || value <= 0 || value > order.remaining) {
      setError(`Введите сумму от 1 до ${formatCurrency(order.remaining)}`);
      return;
    }
    if (!accountId) { setError("Выберите кассу или счёт"); return; }
    setSaving(true);
    setError(null);
    const ok = await receiveOrderPayment({
      orderId: order.id, amount: value, accountId, method,
      comment: comment || undefined, receiptPhoto: receipt[0], markDelivered,
    });
    setSaving(false);
    if (ok) setOpen(false);
    else setError("Не удалось сохранить оплату. Проверьте соединение и повторите попытку.");
  };

  return (
    <>
      <Button className="w-full mt-4" variant="income" onClick={() => setOpen(true)}>
        <Wallet className="h-4 w-4 mr-2" />Получить оплату
      </Button>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setOpen(false)} />
          <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-lg sm:rounded-lg border border-border bg-card p-5 shadow-2xl animate-slide-up sm:animate-scale-in">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div><h2 className="text-lg font-bold">Получить оплату</h2><p className="text-sm text-muted-foreground">Заказ №{order.number} · осталось {formatCurrency(order.remaining)}</p></div>
              <button onClick={() => setOpen(false)} disabled={saving} className="p-2 rounded-sm hover:bg-background"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <label className="block"><span className="text-sm text-muted-foreground mb-1 block">Сумма</span><Input type="number" min="1" max={order.remaining} value={amount} onChange={event => setAmount(event.target.value)} /></label>
              <label className="block"><span className="text-sm text-muted-foreground mb-1 block">Касса или счёт</span><select className="w-full h-10 rounded-sm border border-border bg-background px-3 text-sm" value={accountId} onChange={event => setAccountId(event.target.value)}>{accounts.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{item.name} · {formatCurrency(item.balance)}</option>)}</select></label>
              <div><span className="text-sm text-muted-foreground mb-2 block">Способ оплаты</span><div className="grid grid-cols-3 gap-2">{["Наличные", "Карта", "Перевод"].map(item => <button type="button" key={item} onClick={() => setMethod(item)} className={`p-2 rounded-sm border text-xs font-medium ${method === item ? "border-primary bg-primary/10" : "border-border"}`}>{item}</button>)}</div></div>
              <label className="block"><span className="text-sm text-muted-foreground mb-1 block">Комментарий</span><Input placeholder="Необязательно" value={comment} onChange={event => setComment(event.target.value)} /></label>
              <OrderPhotoPicker label="Фото чека" hint="Необязательно" kind="receipt" orderId={order.id} urls={receipt} onChange={setReceipt} max={1} />
              <label className="flex items-start gap-3 p-3 rounded-md border border-border cursor-pointer"><input type="checkbox" checked={markDelivered} onChange={event => setMarkDelivered(event.target.checked)} className="mt-1" /><span><span className="text-sm font-medium block">Заказ одновременно выдан клиенту</span><span className="text-xs text-muted-foreground">При полной оплате заказ автоматически перейдёт в «Завершён»</span></span></label>
              {error && <p className="text-sm text-expense">{error}</p>}
              <Button onClick={() => void save()} disabled={saving} className="w-full h-12" variant="income">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}{saving ? "Сохранение…" : `Принять ${formatCurrency(Number(amount) || 0)}`}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
