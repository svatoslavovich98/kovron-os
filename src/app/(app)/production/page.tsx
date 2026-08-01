"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useData } from "@/lib/data-context";
import { kitLabels } from "@/lib/demo-data";
import type { OrderStatus } from "@/lib/types";
import { Calendar, GripVertical, Loader2, UserRound, ChevronLeft, ChevronRight, SlidersHorizontal, X, ListChecks, Monitor } from "lucide-react";

export default function ProductionPage() {
  const { orders, clients, cars, users, statuses, updateOrderStatus } = useData();
  const [showToday, setShowToday] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [deadlineFilter, setDeadlineFilter] = useState("all");
  const [compact, setCompact] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [cancelMove, setCancelMove] = useState<{ orderId: string; status: OrderStatus } | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const columns = useMemo(
    () => [...statuses]
      .sort((a, b) => a.order - b.order)
      .filter(status => !activeOnly || !status.isFinal),
    [statuses, activeOnly]
  );

  const visibleOrders = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return orders.filter(order => {
      if (showToday && order.createdAt.slice(0, 10) !== today && order.desiredDate?.slice(0, 10) !== today) return false;
      if (assigneeFilter !== "all" && (assigneeFilter === "none" ? !!order.assigneeId : order.assigneeId !== assigneeFilter)) return false;
      if (priorityFilter !== "all" && order.priority !== priorityFilter) return false;
      if (deadlineFilter === "today" && order.desiredDate?.slice(0, 10) !== today) return false;
      if (deadlineFilter === "overdue" && (!order.desiredDate || new Date(order.desiredDate) >= new Date() || ["completed", "cancelled", "delivered"].includes(order.status))) return false;
      return true;
    });
  }, [orders, showToday, assigneeFilter, priorityFilter, deadlineFilter]);

  const applyMove = async (orderId: string, status: OrderStatus) => {
    setMovingId(orderId);
    await updateOrderStatus(orderId, status);
    setMovingId(null);
  };

  const handleDragEnd = async ({ draggableId, destination }: DropResult) => {
    if (!destination) return;
    const order = orders.find((item) => item.id === draggableId);
    const nextStatus = destination.droppableId as OrderStatus;
    if (!order || order.status === nextStatus) return;

    if (nextStatus === "cancelled") {
      setCancelMove({ orderId: order.id, status: nextStatus });
      return;
    }
    await applyMove(order.id, nextStatus);
  };

  if (isDesktop === null) {
    return <div className="p-4"><div className="h-40 rounded-lg border border-border bg-card skeleton" /></div>;
  }

  if (!isDesktop) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <Card className="overflow-hidden">
          <div className="h-1 bg-primary" />
          <CardContent className="p-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ListChecks className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-xl font-bold">На телефоне удобнее список</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Все заказы, сроки, долги и быстрая смена статуса теперь находятся в разделе «Заказы».
            </p>
            <Link href="/orders" className="mt-5 flex h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground">
              Открыть заказы
            </Link>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Monitor className="h-4 w-4" />
              Канбан остаётся доступен на компьютере
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-full mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Производство</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Перетащите заказ в нужный статус — изменение сохранится автоматически
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Toggle active={showToday} onClick={() => setShowToday(value => !value)}>Сегодня</Toggle>
          <Toggle active={activeOnly} onClick={() => setActiveOnly(value => !value)}>Только активные</Toggle>
          <Toggle active={compact} onClick={() => setCompact(value => !value)}>Компактно</Toggle>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-3 rounded-md border border-border bg-card">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <select className="h-9 rounded-sm border border-border bg-background px-3 text-xs" value={assigneeFilter} onChange={event => setAssigneeFilter(event.target.value)}><option value="all">Все исполнители</option><option value="none">Не назначены</option>{users.filter(item => item.role === "seamstress").map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select className="h-9 rounded-sm border border-border bg-background px-3 text-xs" value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}><option value="all">Любой приоритет</option><option value="normal">Обычный</option><option value="high">Высокий</option><option value="urgent">Срочный</option></select>
        <select className="h-9 rounded-sm border border-border bg-background px-3 text-xs" value={deadlineFilter} onChange={event => setDeadlineFilter(event.target.value)}><option value="all">Любой срок</option><option value="today">Срок сегодня</option><option value="overdue">Просроченные</option></select>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x" style={{ scrollbarWidth: "thin" }}>
          {columns.map((column) => {
            const columnOrders = visibleOrders.filter((order) => order.status === column.key);

            return (
              <div key={column.key} className={cn("flex-shrink-0 snap-start transition-[width]", collapsed.includes(column.key) ? "w-12" : compact ? "w-64" : "w-72 lg:w-80")}>
                <div className={cn("flex items-center gap-2 mb-3 px-1", collapsed.includes(column.key) && "flex-col")}>
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
                  <h3 className="text-sm font-semibold truncate">{column.label}</h3>
                  <span className="text-xs text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-full ml-auto">
                    {columnOrders.length}
                  </span>
                  <button onClick={() => setCollapsed(prev => prev.includes(column.key) ? prev.filter(key => key !== column.key) : [...prev, column.key])} className="p-1 rounded hover:bg-card text-muted-foreground" title={collapsed.includes(column.key) ? "Развернуть" : "Свернуть"}>{collapsed.includes(column.key) ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>
                </div>

                <Droppable droppableId={column.key}>
                  {(dropProvided, dropSnapshot) => (
                    <div
                      ref={dropProvided.innerRef}
                      {...dropProvided.droppableProps}
                      className={cn(
                        "space-y-2 min-h-[220px] rounded-md p-1 transition-colors",
                        collapsed.includes(column.key) && "min-h-[420px]",
                        dropSnapshot.isDraggingOver && "bg-primary/10 ring-2 ring-primary/30"
                      )}
                    >
                      {!collapsed.includes(column.key) && columnOrders.map((order, index) => {
                        const car = cars.find((item) => item.id === order.carId);
                        const client = clients.find((item) => item.id === order.clientId);
                        const assignee = users.find((item) => item.id === order.assigneeId);
                        const creator = users.find((item) => item.id === order.createdById);

                        return (
                          <Draggable key={order.id} draggableId={order.id} index={index} isDragDisabled={movingId === order.id}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                style={{ ...dragProvided.draggableProps.style }}
                              >
                                <Card className={cn(
                                  "transition-all",
                                  dragSnapshot.isDragging && "shadow-xl border-primary rotate-1",
                                  order.desiredDate && new Date(order.desiredDate) < new Date() && !["completed", "cancelled", "delivered"].includes(order.status) && "border-expense/70 bg-expense/5"
                                )}>
                                  <CardContent className="p-3 space-y-2.5">
                                    <div className="flex items-start gap-2">
                                      <Link href={`/orders/${order.id}`} className="min-w-0 flex-1 hover:text-primary transition-colors">
                                        <p className="font-semibold text-sm truncate">{car?.brand} {car?.model}</p>
                                        <p className="text-xs text-muted-foreground truncate">№{order.number} · {client?.name}</p>
                                      </Link>
                                      <button
                                        {...dragProvided.dragHandleProps}
                                        className="p-1 -m-1 rounded text-muted-foreground hover:bg-muted touch-none"
                                        aria-label="Перетащить заказ"
                                      >
                                        {movingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <GripVertical className="h-4 w-4" />}
                                      </button>
                                    </div>

                                    {!compact && <p className="text-xs text-muted-foreground">
                                      {order.kitTypes.map((kit) => kitLabels[kit] || kit).join(", ") || "Комплект не указан"}
                                    </p>}

                                    {order.desiredDate && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {formatDate(order.desiredDate)}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                                      {assignee ? (
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <Avatar name={assignee.name} size="sm" />
                                          <span className="text-xs text-muted-foreground truncate">{assignee.name}</span>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground italic">Не назначен</span>
                                      )}
                                      <span className="text-xs font-medium text-primary shrink-0">{formatCurrency(order.seamstressPayment)}</span>
                                    </div>

                                    {!compact && <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                      <UserRound className="h-3 w-3" />
                                      Создал: {creator?.name || "не указан"}
                                    </div>}

                                    {(order.priority === "high" || order.priority === "urgent") && (
                                      <Badge variant="expense" className="text-[10px]">
                                        {order.priority === "urgent" ? "Срочно" : "Высокий приоритет"}
                                      </Badge>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {dropProvided.placeholder}
                      {!collapsed.includes(column.key) && columnOrders.length === 0 && !dropSnapshot.isDraggingOver && (
                        <div className="border-2 border-dashed border-border rounded-md p-8 text-center">
                          <p className="text-xs text-muted-foreground">Перетащите сюда</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {cancelMove && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCancelMove(null)} />
          <div className="relative w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-2xl">
            <div className="flex justify-between gap-3"><div><h2 className="font-bold">Отменить заказ?</h2><p className="text-sm text-muted-foreground mt-1">Заказ будет перемещён в «Отменён». Действие сохранится в истории.</p></div><button onClick={() => setCancelMove(null)}><X className="h-4 w-4" /></button></div>
            <div className="flex gap-2 mt-5"><button onClick={() => setCancelMove(null)} className="flex-1 h-10 rounded-sm border border-border text-sm">Назад</button><button onClick={() => { const move = cancelMove; setCancelMove(null); void applyMove(move.orderId, move.status); }} className="flex-1 h-10 rounded-sm bg-expense text-white text-sm font-semibold">Отменить заказ</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold transition-all border", active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40")}>{children}</button>;
}
