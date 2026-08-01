"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useData } from "@/lib/data-context";
import type { Order, OrderStatus } from "@/lib/types";
import {
  Plus, Search, LayoutGrid, List, Columns3, ChevronRight, Calendar,
  UserRound, Loader2, Download, SlidersHorizontal, Phone,
  Images, AlertTriangle, Check, X, WalletCards,
} from "lucide-react";

const statusFilters: { key: string; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "new", label: "Новые" },
  { key: "in_progress", label: "В работе" },
  { key: "ready", label: "Готовы" },
  { key: "completed", label: "Завершённые" },
  { key: "cancelled", label: "Отменены" },
  { key: "has_debt", label: "Есть долг" },
];

const mobileTabs = [
  { key: "all", label: "Активные" },
  { key: "new", label: "Новые" },
  { key: "in_progress", label: "В работе" },
  { key: "ready", label: "Готовы" },
  { key: "completed", label: "Завершённые" },
  { key: "cancelled", label: "Отменённые" },
] as const;

type MobileTab = (typeof mobileTabs)[number]["key"];
type ViewMode = "cards" | "compact" | "board";

const finalStatuses: OrderStatus[] = ["completed", "cancelled", "delivered"];
const newStatuses: OrderStatus[] = ["new"];
const workStatuses: OrderStatus[] = ["in_progress"];
const readyStatuses: OrderStatus[] = ["ready"];

function matchesMobileTab(order: Order, tab: MobileTab) {
  if (tab === "new") return newStatuses.includes(order.status);
  if (tab === "in_progress") return workStatuses.includes(order.status);
  if (tab === "ready") return readyStatuses.includes(order.status);
  if (tab === "completed") return order.status === "completed" || order.status === "delivered";
  if (tab === "cancelled") return order.status === "cancelled";
  return !finalStatuses.includes(order.status);
}

function isOverdue(order: Order) {
  if (!order.desiredDate || finalStatuses.includes(order.status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(order.desiredDate) < today;
}

export default function OrdersPage() {
  const { orders, clients, cars, users, statuses, updateOrderStatus } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mobileTab, setMobileTab] = useState<MobileTab>("all");
  const [view, setView] = useState<ViewMode>("cards");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [mobileAssignee, setMobileAssignee] = useState("all");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [statusOrderId, setStatusOrderId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [statusError, setStatusError] = useState("");

  const enrichedOrders = useMemo(() => orders.map((order) => ({
    ...order,
    client: clients.find((client) => client.id === order.clientId),
    car: cars.find((car) => car.id === order.carId),
    assignee: users.find((user) => user.id === order.assigneeId),
    creator: users.find((user) => user.id === order.createdById),
  })), [orders, clients, cars, users]);

  const matchesSearch = (order: Order) => {
    if (!search.trim()) return true;
    const query = search.trim().toLowerCase();
    return order.number.toLowerCase().includes(query)
      || order.client?.name.toLowerCase().includes(query)
      || order.client?.phone.includes(query)
      || order.car?.brand.toLowerCase().includes(query)
      || order.car?.model.toLowerCase().includes(query);
  };

  const filteredOrders = useMemo(() => {
    let filtered = enrichedOrders;
    if (statusFilter !== "all") {
      filtered = statusFilter === "has_debt"
        ? filtered.filter((order) => order.remaining > 0)
        : filtered.filter((order) => order.status === statusFilter);
    }
    if (statusFilter === "all") {
      filtered = filtered.filter((order) => !finalStatuses.includes(order.status));
    }
    return filtered.filter(matchesSearch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichedOrders, search, statusFilter]);

  const mobileOrders = useMemo(() => enrichedOrders.filter((order) => {
    if (!matchesMobileTab(order, mobileTab) || !matchesSearch(order)) return false;
    if (mobileAssignee !== "all" && order.assigneeId !== mobileAssignee) return false;
    if (attentionOnly && !isOverdue(order) && order.remaining <= 0 && order.priority !== "urgent") return false;
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [enrichedOrders, mobileTab, search, mobileAssignee, attentionOnly]);

  const tabCounts = useMemo(() => Object.fromEntries(mobileTabs.map((tab) => [
    tab.key,
    enrichedOrders.filter((order) => matchesMobileTab(order, tab.key)).length,
  ])), [enrichedOrders]);

  const selectedOrder = enrichedOrders.find((order) => order.id === statusOrderId);

  const changeStatus = async (orderId: string, status: OrderStatus, closeSheet = false) => {
    setUpdatingId(orderId);
    setStatusError("");
    const success = await updateOrderStatus(orderId, status);
    setUpdatingId(null);
    if (!success) {
      setStatusError("Не удалось изменить статус. Проверьте интернет и попробуйте ещё раз.");
      return;
    }
    if (closeSheet) {
      setStatusOrderId(null);
      setConfirmCancel(false);
    }
  };

  const exportOrders = () => {
    const cell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Номер", "Дата", "Клиент", "Телефон", "Автомобиль", "Статус", "Стоимость", "Оплачено", "Долг", "Создал"],
      ...filteredOrders.map((order) => [
        order.number, order.createdAt.slice(0, 10), order.client?.name, order.client?.phone,
        `${order.car?.brand || ""} ${order.car?.model || ""}`.trim(),
        statuses.find((status) => status.key === order.status)?.label,
        order.totalPrice, order.paid, order.remaining, order.creator?.name,
      ]),
    ];
    const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `kovron-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const getStatusConfig = (status: OrderStatus) => statuses.find((item) => item.key === status);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Заказы</h1>
          <p className="text-xs text-muted-foreground mt-0.5 lg:hidden">Быстрый список и смена статусов</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportOrders}><Download className="h-4 w-4 mr-1" />Экспорт</Button>
          </div>
          <Link href="/orders/new"><Button size="sm" className="h-10 px-3 sm:px-4">
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Новый заказ</span>
          </Button></Link>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Номер, клиент, телефон или авто"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10 h-11"
          />
        </div>
        <button
          onClick={() => setShowMobileFilters(true)}
          className={cn(
            "lg:hidden relative h-11 w-11 shrink-0 rounded-md border flex items-center justify-center",
            mobileAssignee !== "all" || attentionOnly
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground"
          )}
          aria-label="Фильтры"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {(mobileAssignee !== "all" || attentionOnly) && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />}
        </button>
      </div>

      <div className="lg:hidden flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1" style={{ scrollbarWidth: "none" }}>
        {mobileTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMobileTab(tab.key)}
            className={cn(
              "min-w-[72px] flex-1 rounded-md px-2 py-2 text-[11px] font-semibold transition-colors",
              mobileTab === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <span className="block truncate">{tab.label}</span>
            <span className={cn("text-[10px]", mobileTab === tab.key ? "opacity-80" : "text-foreground")}>{tabCounts[tab.key] || 0}</span>
          </button>
        ))}
      </div>

      <div className="hidden lg:flex gap-2 overflow-x-auto pb-1 no-select" style={{ scrollbarWidth: "none" }}>
        {statusFilters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setStatusFilter(filter.key)}
            className={cn(
              "shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border",
              statusFilter === filter.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/30"
            )}
          >{filter.label}</button>
        ))}
      </div>

      <div className="hidden lg:flex items-center gap-1 bg-card rounded-sm p-1 w-fit border border-border">
        {[
          { key: "cards" as const, icon: LayoutGrid, label: "Карточки" },
          { key: "compact" as const, icon: List, label: "Список" },
          { key: "board" as const, icon: Columns3, label: "Доска" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setView(item.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all",
              view === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-3.5 w-3.5" />{item.label}
          </button>
        ))}
      </div>

      <div className="lg:hidden space-y-3">
        {mobileOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-14 text-center">
            <p className="font-medium">Заказов нет</p>
            <p className="mt-1 text-xs text-muted-foreground">Измените вкладку, фильтры или поиск</p>
          </div>
        ) : mobileOrders.map((order) => {
          const statusConfig = getStatusConfig(order.status);
          const overdue = isOverdue(order);
          const photoCount = order.photos.length + (order.layoutImage ? 1 : 0);
          const phone = order.client?.phone?.replace(/[^\d+]/g, "");
          return (
            <Card key={order.id} className={cn("overflow-hidden", overdue && "border-expense/60")}>
              <CardContent className="p-0">
                <div className={cn("h-1", overdue ? "bg-expense" : "bg-transparent")} />
                <div className="p-3.5 space-y-3">
                  <div className="flex items-start gap-3">
                    <Link href={`/orders/${order.id}`} className="min-w-0 flex-1">
                      <p className="text-[11px] text-muted-foreground">№ {order.number}</p>
                      <h2 className="mt-0.5 font-bold leading-tight truncate">
                        {[order.car?.brand, order.car?.model, order.car?.generation].filter(Boolean).join(" ") || "Без автомобиля"}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground truncate">{order.client?.name || "Клиент не указан"}</p>
                    </Link>
                    <button
                      onClick={() => { setStatusOrderId(order.id); setConfirmCancel(false); setStatusError(""); }}
                      className="max-w-[48%] shrink-0 rounded-full border px-2.5 py-1.5 text-[10px] font-bold text-left"
                      style={{ color: statusConfig?.color, borderColor: `${statusConfig?.color || "#888"}55`, backgroundColor: `${statusConfig?.color || "#888"}0D` }}
                    >
                      <span className="flex items-center gap-1">
                        {updatingId === order.id && <Loader2 className="h-3 w-3 animate-spin" />}
                        <span className="truncate">{statusConfig?.label || order.status}</span>
                        <ChevronRight className="h-3 w-3 rotate-90 shrink-0" />
                      </span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {overdue && <Badge variant="expense" className="gap-1 text-[10px]"><AlertTriangle className="h-3 w-3" />Просрочен</Badge>}
                    {order.priority === "urgent" && <Badge variant="expense" className="text-[10px]">Срочно</Badge>}
                    {order.priority === "high" && <Badge variant="warning" className="text-[10px]">Высокий приоритет</Badge>}
                    {order.remaining > 0 && <Badge variant="expense" className="gap-1 text-[10px]"><WalletCards className="h-3 w-3" />Долг {formatCurrency(order.remaining)}</Badge>}
                    {order.desiredDate && !overdue && <Badge variant="muted" className="gap-1 text-[10px]"><Calendar className="h-3 w-3" />{formatDate(order.desiredDate)}</Badge>}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="min-w-0">
                      <p className="font-bold">{formatCurrency(order.totalPrice)}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{order.assignee?.name ? `Исполнитель: ${order.assignee.name}` : "Исполнитель не назначен"}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {phone && (
                        <a href={`tel:${phone}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-primary" aria-label={`Позвонить ${order.client?.name || "клиенту"}`}>
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      <Link href={`/orders/${order.id}`} className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-semibold">
                        <Images className="h-4 w-4" />{photoCount > 0 ? photoCount : "Фото"}
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="hidden lg:block">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16"><p className="text-muted-foreground">Заказы не найдены</p></div>
        ) : (
          <div className={cn(view === "cards" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2")}>
            {filteredOrders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              return view === "compact" ? (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-md bg-card border border-border hover:border-primary/30 transition-colors">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: statusConfig?.color }} />
                    <span className="text-sm font-medium w-20 shrink-0 text-muted-foreground">№{order.number}</span>
                    <span className="text-sm font-medium flex-1 truncate">{order.car?.brand} {order.car?.model}</span>
                    <span className="text-sm text-muted-foreground hidden sm:block">{order.client?.name}</span>
                    <span className="text-xs text-muted-foreground hidden md:block">Создал: {order.creator?.name || "не указан"}</span>
                    <span className="text-sm font-semibold w-24 text-right">{formatCurrency(order.totalPrice)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ) : (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <Card className="hover:border-primary/30 transition-all cursor-pointer h-full">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">Заказ №{order.number}</span>
                        <div className="relative" onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}>
                          <select
                            value={order.status}
                            disabled={updatingId === order.id}
                            onChange={(event) => void changeStatus(order.id, event.target.value as OrderStatus)}
                            className="appearance-none max-w-40 rounded-full border bg-card py-1 pl-3 pr-7 text-[10px] font-semibold outline-none cursor-pointer disabled:opacity-60"
                            style={{ color: statusConfig?.color, borderColor: `${statusConfig?.color}55` }}
                            aria-label={`Статус заказа №${order.number}`}
                          >
                            {[...statuses].sort((a, b) => a.order - b.order).map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
                          </select>
                          {updatingId === order.id
                            ? <Loader2 className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin" />
                            : <ChevronRight className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 rotate-90" />}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold">{order.car?.brand} {order.car?.model}{order.car?.generation ? ` ${order.car.generation}` : ""}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{order.client?.name}</p>
                      </div>
                      {order.desiredDate && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" />Срок: {formatDate(order.desiredDate)}</div>}
                      <div className="space-y-1 pt-1 border-t border-border">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Стоимость</span><span className="font-semibold">{formatCurrency(order.totalPrice)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Получено</span><span className="text-income">{formatCurrency(order.paid)}</span></div>
                        {order.remaining > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Осталось</span><span className="text-expense">{formatCurrency(order.remaining)}</span></div>}
                      </div>
                      {order.assignee && <div className="flex items-center gap-2 pt-1"><Avatar name={order.assignee.name} size="sm" /><span className="text-xs text-muted-foreground">{order.assignee.name}</span></div>}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><UserRound className="h-3.5 w-3.5" />Создал: {order.creator?.name || "не указан"}</div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showMobileFilters && (
        <div className="lg:hidden fixed inset-0 z-[80] flex items-end" role="dialog" aria-modal="true" aria-label="Фильтры заказов">
          <button className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)} aria-label="Закрыть фильтры" />
          <div className="relative w-full rounded-t-2xl border-t border-border bg-card p-4 pb-24 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Фильтры</h2><button onClick={() => setShowMobileFilters(false)} className="p-2 text-muted-foreground"><X className="h-5 w-5" /></button></div>
            <div className="mt-4 space-y-4">
              <label className="block text-xs font-semibold text-muted-foreground">Исполнитель
                <select value={mobileAssignee} onChange={(event) => setMobileAssignee(event.target.value)} className="mt-1.5 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                  <option value="all">Все исполнители</option>
                  {users.filter((item) => item.role === "seamstress").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <button onClick={() => setAttentionOnly((value) => !value)} className="flex w-full items-center justify-between rounded-md border border-border bg-background p-3 text-left">
                <div><p className="text-sm font-semibold">Требуют внимания</p><p className="text-xs text-muted-foreground">Просроченные, срочные или с долгом</p></div>
                <span className={cn("flex h-6 w-11 items-center rounded-full p-0.5 transition-colors", attentionOnly ? "bg-primary" : "bg-muted")}><span className={cn("h-5 w-5 rounded-full bg-white shadow transition-transform", attentionOnly && "translate-x-5")} /></span>
              </button>
            </div>
            <div className="mt-5 flex gap-2"><Button variant="outline" className="flex-1" onClick={() => { setMobileAssignee("all"); setAttentionOnly(false); }}>Сбросить</Button><Button className="flex-1" onClick={() => setShowMobileFilters(false)}>Показать {mobileOrders.length}</Button></div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="lg:hidden fixed inset-0 z-[80] flex items-end" role="dialog" aria-modal="true" aria-label="Изменить статус заказа">
          <button className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => { setStatusOrderId(null); setConfirmCancel(false); }} aria-label="Закрыть выбор статуса" />
          <div className="relative max-h-[82vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-24 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs text-muted-foreground">Заказ №{selectedOrder.number}</p><h2 className="text-lg font-bold">Изменить статус</h2></div>
              <button onClick={() => { setStatusOrderId(null); setConfirmCancel(false); }} className="p-2 text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            {confirmCancel ? (
              <div className="mt-5 rounded-lg border border-expense/40 bg-expense/5 p-4">
                <div className="flex gap-3"><AlertTriangle className="h-5 w-5 shrink-0 text-expense" /><div><p className="font-bold">Отменить заказ?</p><p className="mt-1 text-sm text-muted-foreground">Заказ перейдёт в архив, а изменение сохранится в истории.</p></div></div>
                {statusError && <p className="mt-3 text-sm text-expense">{statusError}</p>}
                <div className="mt-4 flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setConfirmCancel(false)}>Назад</Button><Button className="flex-1 bg-expense text-white hover:bg-expense/90" disabled={updatingId === selectedOrder.id} onClick={() => void changeStatus(selectedOrder.id, "cancelled", true)}>{updatingId === selectedOrder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Отменить"}</Button></div>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {[...statuses].sort((a, b) => a.order - b.order).map((status) => {
                  const current = selectedOrder.status === status.key;
                  return <button key={status.key} disabled={current || updatingId === selectedOrder.id} onClick={() => status.key === "cancelled" ? setConfirmCancel(true) : void changeStatus(selectedOrder.id, status.key, true)} className={cn("flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors", current ? "border-primary bg-primary/10" : "border-border bg-background active:bg-muted", status.key === "cancelled" && "text-expense")}><span className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} /><span className="flex-1 text-sm font-semibold">{status.label}</span>{current && <Check className="h-4 w-4 text-primary" />}</button>;
                })}
                {statusError && <p className="pt-2 text-sm text-expense">{statusError}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
