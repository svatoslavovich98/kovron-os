"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { HandCoins, Wallet, RotateCcw, Check, ArrowRight } from "lucide-react";

const PRICE = 12000;
const OKSANA = 1000;
const CHINA = 6000;

type Step = { label: string; cash: number; paidByClient: number; paidOksana: boolean; paidChina: boolean };

/**
 * Живой пример: показывает, что суммы в заказе — это план,
 * а деньги двигаются только по нажатию кнопок.
 */
export function GuideSimulator() {
  const [cash, setCash] = useState(0);
  const [clientPaid, setClientPaid] = useState(0);
  const [oksanaPaid, setOksanaPaid] = useState(false);
  const [chinaPaid, setChinaPaid] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const push = (text: string) => setLog(prev => [text, ...prev].slice(0, 5));

  const reset = () => {
    setCash(0); setClientPaid(0); setOksanaPaid(false); setChinaPaid(false); setLog([]);
  };

  const takePrepay = () => {
    if (clientPaid > 0) return;
    setClientPaid(5000); setCash(c => c + 5000);
    push("Клиент отдал предоплату 5 000 ₽ → касса выросла");
  };
  const takeRest = () => {
    if (clientPaid >= PRICE) return;
    const rest = PRICE - clientPaid;
    setClientPaid(PRICE); setCash(c => c + rest);
    push(`Клиент доплатил ${formatCurrency(rest)} → касса выросла`);
  };
  const payOksana = () => {
    if (oksanaPaid) return;
    setOksanaPaid(true); setCash(c => c - OKSANA);
    push("Выплатили Оксане 1 000 ₽ → деньги ушли из кассы");
  };
  const payChina = () => {
    if (chinaPaid) return;
    setChinaPaid(true); setCash(c => c - CHINA);
    push("Выплатили китайцам 6 000 ₽ → деньги ушли из кассы");
  };

  const clientDebt = PRICE - clientPaid;
  const contractorDebt = (oksanaPaid ? 0 : OKSANA) + (chinaPaid ? 0 : CHINA);
  const finalProfit = PRICE - OKSANA - CHINA;
  const allDone = clientPaid === PRICE && oksanaPaid && chinaPaid;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-background/50 p-4">
        <p className="text-sm font-semibold">Попробуйте сами</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Заказ на {formatCurrency(PRICE)} · Оксане {formatCurrency(OKSANA)} · китайцам {formatCurrency(CHINA)}
        </p>
      </div>

      {/* Показатели */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <div className="p-3 text-center">
          <p className="text-[11px] text-muted-foreground">В кассе</p>
          <p className={cn("mt-0.5 text-lg font-bold tabular-nums transition-colors",
            cash > 0 ? "text-income" : "text-muted-foreground")}>
            {formatCurrency(cash)}
          </p>
        </div>
        <div className="p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Клиент должен</p>
          <p className={cn("mt-0.5 text-lg font-bold tabular-nums",
            clientDebt > 0 ? "text-warning" : "text-income")}>
            {formatCurrency(clientDebt)}
          </p>
        </div>
        <div className="p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Должны им</p>
          <p className={cn("mt-0.5 text-lg font-bold tabular-nums",
            contractorDebt > 0 ? "text-expense" : "text-income")}>
            {formatCurrency(contractorDebt)}
          </p>
        </div>
      </div>

      {/* Действия */}
      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Деньги от клиента</p>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant={clientPaid > 0 ? "outline" : "income"}
                    disabled={clientPaid > 0} onClick={takePrepay}>
              {clientPaid > 0 ? <Check className="h-4 w-4 mr-1" /> : <Wallet className="h-4 w-4 mr-1" />}
              Предоплата 5 000
            </Button>
            <Button size="sm" variant={clientPaid >= PRICE ? "outline" : "income"}
                    disabled={clientPaid >= PRICE} onClick={takeRest}>
              {clientPaid >= PRICE ? <Check className="h-4 w-4 mr-1" /> : <Wallet className="h-4 w-4 mr-1" />}
              Остаток
            </Button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Выплаты подрядчикам</p>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant={oksanaPaid ? "outline" : "default"}
                    disabled={oksanaPaid} onClick={payOksana}>
              {oksanaPaid ? <Check className="h-4 w-4 mr-1" /> : <HandCoins className="h-4 w-4 mr-1" />}
              Оксане 1 000
            </Button>
            <Button size="sm" variant={chinaPaid ? "outline" : "default"}
                    disabled={chinaPaid} onClick={payChina}>
              {chinaPaid ? <Check className="h-4 w-4 mr-1" /> : <HandCoins className="h-4 w-4 mr-1" />}
              Китайцам 6 000
            </Button>
          </div>
        </div>

        {/* Журнал */}
        {log.length > 0 && (
          <div className="rounded-md bg-background p-2.5 space-y-1">
            {log.map((line, i) => (
              <p key={i} className={cn("text-xs flex items-start gap-1.5",
                i === 0 ? "text-foreground" : "text-muted-foreground/60")}>
                <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
                {line}
              </p>
            ))}
          </div>
        )}

        {allDone && (
          <div className="rounded-md border border-income/30 bg-income/10 p-3">
            <p className="text-sm font-semibold text-income">Заказ закрыт полностью</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              В кассе осталось {formatCurrency(finalProfit)} — это ваша прибыль.
              Ровно {formatCurrency(PRICE)} − {formatCurrency(OKSANA)} − {formatCurrency(CHINA)}.
            </p>
          </div>
        )}

        {(clientPaid > 0 || oksanaPaid || chinaPaid) && (
          <button onClick={reset}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw className="h-3.5 w-3.5" />
            Начать заново
          </button>
        )}

        {clientPaid === 0 && !oksanaPaid && !chinaPaid && (
          <p className="text-xs text-muted-foreground">
            Обратите внимание: суммы Оксане и китайцам уже записаны в заказе,
            но касса пустая. Деньги уйдут только по нажатию.
          </p>
        )}
      </div>
    </div>
  );
}
