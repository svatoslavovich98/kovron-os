"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, getGreeting, formatDateShort, cn } from "@/lib/utils";
import { demoOrders, demoCars, demoStatuses, kitLabels, demoSeamstressPayments } from "@/lib/demo-data";
import {
  Play, Pause, RotateCcw, CheckCircle2, Calendar,
  Image, Clock, Wallet, ChevronDown,
} from "lucide-react";

type TabKey = "in_progress" | "assigned" | "ready";

export default function SeamstressCabinet() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("assigned");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  if (!user) return null;

  const myOrders = demoOrders
    .filter((o) => o.assigneeId === user.id)
    .map((o) => ({
      ...o,
      car: demoCars.find((c) => c.id === o.carId),
    }));

  const inProgress = myOrders.filter((o) => o.status === "in_progress").length;
  const waiting = myOrders.filter((o) => o.status === "assigned").length;
  const readyCount = myOrders.filter((o) => o.status === "ready" || o.status === "pending_delivery").length;

  const earnings = {
    planned: myOrders.filter((o) => o.seamstressPaymentStatus === "planned").reduce((s, o) => s + o.seamstressPayment, 0),
    accrued: myOrders.filter((o) => o.seamstressPaymentStatus === "accrued").reduce((s, o) => s + o.seamstressPayment, 0),
    paid: myOrders.filter((o) => o.seamstressPaymentStatus === "paid").reduce((s, o) => s + o.seamstressPayment, 0),
  };

  const filteredOrders = myOrders.filter((o) => {
    if (activeTab === "assigned") return o.status === "assigned" || o.status === "pending_production";
    if (activeTab === "in_progress") return o.status === "in_progress" || o.status === "paused";
    return o.status === "ready" || o.status === "pending_delivery";
  });

  const now = new Date();

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">{getGreeting()}, {user.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {formatDateShort(now)} {now.getFullYear()}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{inProgress}</p>
            <p className="text-[10px] text-muted-foreground">В работе</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-warning">{waiting}</p>
            <p className="text-[10px] text-muted-foreground">Ожидают</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-income">{readyCount}</p>
            <p className="text-[10px] text-muted-foreground">Готово</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings */}
      <Card className="bg-gradient-to-br from-card to-secondary2">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Запланировано</span>
            <span className="font-semibold">{formatCurrency(earnings.planned)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Начислено</span>
            <span className="font-semibold text-warning">{formatCurrency(earnings.accrued)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Выплачено</span>
            <span className="font-semibold text-income">{formatCurrency(earnings.paid)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-border">
            <span className="font-medium">Ожидает выплаты</span>
            <span className="font-bold text-expense">{formatCurrency(earnings.accrued)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "assigned" as const, label: "Ожидают", count: waiting },
          { key: "in_progress" as const, label: "В работе", count: inProgress },
          { key: "ready" as const, label: "Готово", count: readyCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 py-2 rounded-sm text-sm font-semibold transition-all",
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground"
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Order cards */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">Нет заказов</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const statusConfig = demoStatuses.find((s) => s.key === order.status);
            const isExpanded = expandedOrder === order.id;

            return (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Order header — always visible */}
                  <button
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="w-full text-left p-4 hover:bg-background/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg">
                          {order.car?.brand} {order.car?.model}
                          {order.car?.generation ? ` ${order.car.generation}` : ""}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {order.kitTypes.map((k) => kitLabels[k] || k).join(", ")}
                        </p>
                      </div>
                      <ChevronDown className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180"
                      )} />
                    </div>

                    {order.desiredDate && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                        <Calendar className="h-4 w-4" />
                        Срок: {formatDate(order.desiredDate)}
                        {new Date(order.desiredDate) < new Date() && (
                          <Badge variant="expense" className="text-[10px] ml-1">Просрочено</Badge>
                        )}
                      </div>
                    )}

                    {/* Colors */}
                    <div className="flex items-center gap-3 text-sm">
                      {[
                        { label: "Материал", value: order.materialColor },
                        { label: "Окантовка", value: order.edgeColor },
                        { label: "Строчка", value: order.stitchColor },
                      ].map((c) => (
                        <div key={c.label} className="flex items-center gap-1">
                          <div
                            className="h-4 w-4 rounded-full border border-border"
                            style={{
                              backgroundColor:
                                c.value === "Чёрный" ? "#1a1a1a" :
                                c.value === "Серый" ? "#6b6b6b" :
                                c.value === "Бежевый" ? "#d4b896" :
                                c.value === "Коричневый" ? "#6b4226" :
                                c.value === "Синий" ? "#2a4494" :
                                c.value === "Красный" ? "#b82020" :
                                c.value === "Зелёный" ? "#2d6b3f" : "#f0f0f0",
                            }}
                          />
                          <span className="text-xs text-muted-foreground">{c.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Payment */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <Wallet className="h-4 w-4 text-primary" />
                      <span className="text-sm">Оплата за работу:</span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(order.seamstressPayment)}
                      </span>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-3 bg-background/30 animate-fade-in">
                      {order.seamstressComment && (
                        <div className="p-3 rounded-md bg-card border border-border">
                          <p className="text-xs text-muted-foreground mb-1">Комментарий</p>
                          <p className="text-sm">{order.seamstressComment}</p>
                        </div>
                      )}

                      {order.layoutImage && (
                        <Button variant="outline" className="w-full">
                          <Image className="h-4 w-4 mr-2" />
                          Открыть раскладку
                        </Button>
                      )}

                      <div className="p-3 rounded-md bg-card border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Статус оплаты</p>
                        <Badge
                          variant={
                            order.seamstressPaymentStatus === "paid" ? "income" :
                            order.seamstressPaymentStatus === "accrued" ? "warning" : "muted"
                          }
                        >
                          {order.seamstressPaymentStatus === "paid" ? "Выплачено" :
                           order.seamstressPaymentStatus === "accrued" ? "Начислено" : "Запланировано"}
                        </Badge>
                      </div>

                      {/* Action buttons */}
                      <div className="space-y-2">
                        {order.status === "assigned" && (
                          <Button className="w-full h-14 text-base" onClick={() => alert("Работа начата! (демо)")}>
                            <Play className="h-5 w-5 mr-2" />
                            Начать работу
                          </Button>
                        )}
                        {order.status === "in_progress" && (
                          <>
                            <Button variant="outline" className="w-full h-14 text-base" onClick={() => alert("Приостановлено (демо)")}>
                              <Pause className="h-5 w-5 mr-2" />
                              Приостановить
                            </Button>
                            <Button className="w-full h-14 text-base bg-income hover:bg-income/90 text-white" onClick={() => alert("Заказ завершён! (демо)")}>
                              <CheckCircle2 className="h-5 w-5 mr-2" />
                              Готово
                            </Button>
                          </>
                        )}
                        {order.status === "paused" && (
                          <Button className="w-full h-14 text-base" onClick={() => alert("Работа продолжена (демо)")}>
                            <RotateCcw className="h-5 w-5 mr-2" />
                            Продолжить
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
