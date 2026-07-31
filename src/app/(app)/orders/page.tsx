"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { demoOrders, demoClients, demoCars, demoUsers, demoStatuses, kitLabels } from "@/lib/demo-data";
import type { Order, OrderStatus } from "@/lib/types";
import {
  Plus, Search, Filter, LayoutGrid, List, Columns3,
  ChevronRight, Calendar, User, Clock,
} from "lucide-react";

const statusFilters: { key: string; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "new", label: "Новые" },
  { key: "pending_prepayment", label: "Ожидают предоплату" },
  { key: "in_progress", label: "В работе" },
  { key: "ready", label: "Готовы" },
  { key: "pending_delivery", label: "Ожидают выдачи" },
  { key: "completed", label: "Завершены" },
  { key: "cancelled", label: "Отменены" },
  { key: "has_debt", label: "Есть долг" },
];

type ViewMode = "cards" | "compact" | "board";

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<ViewMode>("cards");

  const orders = useMemo(() => {
    let filtered = demoOrders.map((o) => ({
      ...o,
      client: demoClients.find((c) => c.id === o.clientId),
      car: demoCars.find((c) => c.id === o.carId),
      assignee: demoUsers.find((u) => u.id === o.assigneeId),
    }));

    if (statusFilter !== "all") {
      if (statusFilter === "has_debt") {
        filtered = filtered.filter((o) => o.remaining > 0);
      } else {
        filtered = filtered.filter((o) => o.status === statusFilter);
      }
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((o) =>
        o.number.toLowerCase().includes(q) ||
        o.client?.name.toLowerCase().includes(q) ||
        o.client?.phone.includes(q) ||
        o.car?.brand.toLowerCase().includes(q) ||
        o.car?.model.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [search, statusFilter]);

  const getStatusConfig = (status: OrderStatus) => {
    return demoStatuses.find((s) => s.key === status);
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Заказы</h1>
        <Link href="/orders/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            Новый заказ
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по номеру, клиенту, авто..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-select" style={{ scrollbarWidth: "none" }}>
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              "shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border",
              statusFilter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/30"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* View toggle (desktop) */}
      <div className="hidden lg:flex items-center gap-1 bg-card rounded-sm p-1 w-fit border border-border">
        {[
          { key: "cards" as const, icon: LayoutGrid, label: "Карточки" },
          { key: "compact" as const, icon: List, label: "Список" },
          { key: "board" as const, icon: Columns3, label: "Доска" },
        ].map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all",
              view === v.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <v.icon className="h-3.5 w-3.5" />
            {v.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Заказы не найдены</p>
        </div>
      ) : (
        <div className={cn(
          view === "cards" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"
        )}>
          {orders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            return view === "compact" ? (
              /* Compact view */
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-md bg-card border border-border hover:border-primary/30 transition-colors">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: statusConfig?.color }}
                  />
                  <span className="text-sm font-medium w-20 shrink-0 text-muted-foreground">
                    №{order.number}
                  </span>
                  <span className="text-sm font-medium flex-1 truncate">
                    {order.car?.brand} {order.car?.model}
                  </span>
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    {order.client?.name}
                  </span>
                  <span className="text-sm font-semibold w-24 text-right">
                    {formatCurrency(order.totalPrice)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
            ) : (
              /* Card view */
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="hover:border-primary/30 transition-all cursor-pointer h-full">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">
                        Заказ №{order.number}
                      </span>
                      <Badge
                        className="text-[10px]"
                        style={{
                          backgroundColor: `${statusConfig?.color}20`,
                          color: statusConfig?.color,
                          borderColor: `${statusConfig?.color}30`,
                        }}
                      >
                        {statusConfig?.label}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-semibold">
                        {order.car?.brand} {order.car?.model}
                        {order.car?.generation ? ` ${order.car.generation}` : ""}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {order.client?.name}
                      </p>
                    </div>

                    {order.desiredDate && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        Срок: {formatDate(order.desiredDate)}
                      </div>
                    )}

                    <div className="space-y-1 pt-1 border-t border-border">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Стоимость</span>
                        <span className="font-semibold">{formatCurrency(order.totalPrice)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Получено</span>
                        <span className="text-income">{formatCurrency(order.paid)}</span>
                      </div>
                      {order.remaining > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Осталось</span>
                          <span className="text-expense">{formatCurrency(order.remaining)}</span>
                        </div>
                      )}
                    </div>

                    {order.assignee && (
                      <div className="flex items-center gap-2 pt-1">
                        <Avatar name={order.assignee.name} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {order.assignee.name}
                        </span>
                      </div>
                    )}

                    {/* Color dots */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-muted-foreground">Цвета:</span>
                      <div className="flex gap-1">
                        {[order.materialColor, order.edgeColor, order.stitchColor]
                          .filter(Boolean)
                          .map((color, i) => (
                            <div
                              key={i}
                              className="h-4 w-4 rounded-full border border-border"
                              title={color}
                              style={{
                                backgroundColor:
                                  color === "Чёрный" ? "#1a1a1a" :
                                  color === "Серый" ? "#6b6b6b" :
                                  color === "Бежевый" ? "#d4b896" :
                                  color === "Коричневый" ? "#6b4226" :
                                  color === "Синий" ? "#2a4494" :
                                  color === "Красный" ? "#b82020" :
                                  color === "Зелёный" ? "#2d6b3f" :
                                  color === "Белый" ? "#f0f0f0" : "#888",
                              }}
                            />
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
