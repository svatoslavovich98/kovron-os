"use client";

import Link from "next/link";
import { ArrowLeft, Car, ChevronRight, CopyPlus, MessageCircle, Phone, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/lib/data-context";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const { clients, cars, orders, statuses } = useData();
  const client = clients.find(item => item.id === params.id);
  const clientCars = cars.filter(item => item.clientId === params.id);
  const clientOrders = orders
    .filter(item => item.clientId === params.id)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  if (!client) return <div className="p-8 text-center text-muted-foreground">Клиент не найден</div>;

  const total = clientOrders.reduce((sum, item) => sum + item.totalPrice, 0);
  const paid = clientOrders.reduce((sum, item) => sum + item.paid, 0);
  const debt = clientOrders.reduce((sum, item) => sum + Math.max(0, item.remaining), 0);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/clients" className="p-2 rounded-sm hover:bg-card"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{client.name}</h1>
          <p className="text-xs text-muted-foreground">Клиент с {formatDate(client.createdAt)}</p>
        </div>
        <Link href={`/orders/new?clientId=${client.id}`}>
          <Button><Plus className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Новый заказ</span><span className="sm:hidden">Заказ</span></Button>
        </Link>
      </div>

      <Card><CardContent className="p-4 grid sm:grid-cols-2 gap-3 text-sm">
        <a href={`tel:${client.phone}`} className="flex items-center gap-2 hover:text-primary"><Phone className="h-4 w-4 text-muted-foreground" />{client.phone}</a>
        {client.messenger && <div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-muted-foreground" />{client.messenger}</div>}
        <div><span className="text-muted-foreground">Источник: </span>{client.source || "не указан"}</div>
        <div><span className="text-muted-foreground">Заметки: </span>{client.comment || "нет"}</div>
      </CardContent></Card>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Metric label="Всего покупок" value={formatCurrency(total)} />
        <Metric label="Оплачено" value={formatCurrency(paid)} good />
        <Metric label="Задолженность" value={formatCurrency(debt)} danger={debt > 0} />
      </div>

      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold flex items-center gap-2"><Car className="h-4 w-4" />Автомобили <span className="text-xs text-muted-foreground font-normal">({clientCars.length})</span></h2>
          <Link href={`/orders/new?clientId=${client.id}`} className="text-xs text-primary hover:underline">Добавить автомобиль</Link>
        </div>
        {clientCars.length ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {clientCars.map(car => {
              const carOrders = clientOrders.filter(order => order.carId === car.id);
              return (
                <div key={car.id} className="p-4 rounded-lg border border-border bg-background/40">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0"><Car className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0"><p className="font-semibold truncate">{car.brand} {car.model}</p><p className="text-xs text-muted-foreground min-h-4">{[car.generation, car.year, car.plateNumber].filter(Boolean).join(" · ") || "Без дополнительных данных"}</p><p className="text-[11px] text-muted-foreground mt-1">Заказов: {carOrders.length}</p></div>
                  </div>
                  <Link href={`/orders/new?clientId=${client.id}&carId=${car.id}`} className="mt-3 block">
                    <Button variant="outline" size="sm" className="w-full"><Plus className="h-3.5 w-3.5 mr-1.5" />Заказать коврики</Button>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : <p className="text-sm text-muted-foreground">Автомобилей пока нет. Он появится после первого заказа.</p>}
      </CardContent></Card>

      <Card><CardContent className="p-4">
        <h2 className="font-semibold flex items-center gap-2 mb-3"><ShoppingBag className="h-4 w-4" />История заказов <span className="text-xs text-muted-foreground font-normal">({clientOrders.length})</span></h2>
        {clientOrders.length ? (
          <div className="space-y-2">
            {clientOrders.map(order => {
              const car = cars.find(item => item.id === order.carId);
              const status = statuses.find(item => item.key === order.status);
              return (
                <div key={order.id} className="flex items-center gap-2 p-3 rounded-md border border-border hover:border-primary/40 transition-colors">
                  <Link href={`/orders/${order.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">№{order.number} · {car?.brand} {car?.model}</p><p className="text-xs text-muted-foreground">{formatDate(order.createdAt)} · {formatCurrency(order.totalPrice)}</p></div>
                    <Badge style={{ color: status?.color, borderColor: `${status?.color}55` }} variant="outline" className="hidden sm:inline-flex">{status?.label}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                  <Link href={`/orders/new?repeatOrderId=${order.id}`} title="Повторить заказ" className="shrink-0">
                    <Button variant="outline" size="sm"><CopyPlus className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Повторить</span></Button>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : <p className="text-sm text-muted-foreground">Заказов пока нет</p>}
      </CardContent></Card>
    </div>
  );
}

function Metric({ label, value, good, danger }: { label: string; value: string; good?: boolean; danger?: boolean }) {
  return <Card><CardContent className="p-3"><p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">{label}</p><p className={`font-bold text-xs sm:text-lg mt-1 truncate ${good ? "text-income" : danger ? "text-expense" : ""}`}>{value}</p></CardContent></Card>;
}
