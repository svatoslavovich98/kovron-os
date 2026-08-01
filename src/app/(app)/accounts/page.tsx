"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useData } from "@/lib/data-context";
import { Banknote, CreditCard, Building2, Wallet } from "lucide-react";

const iconMap: Record<string, typeof Banknote> = {
  Banknote, CreditCard, Building2,
};

export default function AccountsPage() {
  const { accounts } = useData();

  const totalBalance = accounts
    .filter((a) => a.active && a.showInTotal)
    .reduce((s, a) => s + a.balance, 0);

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
      <h1 className="text-xl font-bold">Счета</h1>

      {/* Total */}
      <Card className="bg-gradient-to-br from-card to-secondary2">
        <CardContent className="p-5 text-center">
          <p className="text-sm text-muted-foreground mb-1">Всего на счетах</p>
          <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
        </CardContent>
      </Card>

      {/* Accounts list */}
      <div className="space-y-3">
        {accounts.filter((a) => a.active).map((account) => {
          const Icon = iconMap[account.icon] || Wallet;
          return (
            <Card key={account.id} className="hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{account.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{account.type === "cash" ? "Наличные" : account.type === "card" ? "Банковская карта" : "Расчётный счёт"}</p>
                </div>
                <p className="text-xl font-bold">{formatCurrency(account.balance)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
