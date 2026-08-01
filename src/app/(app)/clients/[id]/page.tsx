"use client";

import Link from "next/link";
import { ArrowLeft, Car, MessageCircle, Phone, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/lib/data-context";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const { clients, cars, orders, statuses } = useData();
  const client = clients.find(item => item.id === params.id);
  const clientCars = cars.filter(item => item.clientId === params.id);
  const clientOrders = orders.filter(item => item.clientId === params.id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  if (!client) return <div className="p-8 text-center text-muted-foreground">Клиент не найден</div>;
  const total = clientOrders.reduce((sum, item) => sum + item.totalPrice, 0);
  const paid = clientOrders.reduce((sum, item) => sum + item.paid, 0);
  const debt = clientOrders.reduce((sum, item) => sum + Math.max(0, item.remaining), 0);

  return <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">
    <div className="flex items-center gap-3"><Link href="/clients" className="p-2 rounded-sm hover:bg-card"><ArrowLeft className="h-5 w-5" /></Link><div className="flex-1"><h1 className="text-xl font-bold">{client.name}</h1><p className="text-xs text-muted-foreground">Клиент с {formatDate(client.createdAt)}</p></div><Link href={`/orders/new?clientId=${client.id}`}><Button><Plus className="h-4 w-4 mr-1" />Повторный заказ</Button></Link></div>
    <Card><CardContent className="p-4 grid sm:grid-cols-2 gap-3 text-sm">
      <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{client.phone}</div>
      {client.messenger && <div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-muted-foreground" />{client.messenger}</div>}
      <div><span className="text-muted-foreground">Источник: </span>{client.source || "не указан"}</div>
      <div><span className="text-muted-foreground">Заметки: </span>{client.comment || "нет"}</div>
    </CardContent></Card>
    <div className="grid grid-cols-3 gap-3"><Metric label="Всего покупок" value={formatCurrency(total)} /><Metric label="Оплачено" value={formatCurrency(paid)} good /><Metric label="Задолженность" value={formatCurrency(debt)} danger={debt > 0} /></div>
    <Card><CardContent className="p-4"><h2 className="font-semibold flex items-center gap-2 mb-3"><Car className="h-4 w-4" />Автомобили</h2>{clientCars.length ? <div className="grid sm:grid-cols-2 gap-2">{clientCars.map(item => <div key={item.id} className="p-3 rounded-md border border-border"><p className="font-medium">{item.brand} {item.model}</p><p className="text-xs text-muted-foreground">{[item.generation, item.year, item.plateNumber].filter(Boolean).join(" · ")}</p></div>)}</div> : <p className="text-sm text-muted-foreground">Автомобилей пока нет</p>}</CardContent></Card>
    <Card><CardContent className="p-4"><h2 className="font-semibold flex items-center gap-2 mb-3"><ShoppingBag className="h-4 w-4" />История заказов</h2>{clientOrders.length ? <div className="space-y-2">{clientOrders.map(order => { const car = cars.find(item => item.id === order.carId); const status = statuses.find(item => item.key === order.status); return <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-primary/40"><div className="flex-1 min-w-0"><p className="font-medium text-sm">№{order.number} · {car?.brand} {car?.model}</p><p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p></div><Badge style={{ color: status?.color, borderColor: `${status?.color}55` }} variant="outline">{status?.label}</Badge><span className="text-sm font-semibold">{formatCurrency(order.totalPrice)}</span></Link>})}</div> : <p className="text-sm text-muted-foreground">Заказов пока нет</p>}</CardContent></Card>
  </div>;
}

function Metric({ label, value, good, danger }: { label: string; value: string; good?: boolean; danger?: boolean }) { return <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">{label}</p><p className={`font-bold text-sm sm:text-lg ${good ? "text-income" : danger ? "text-expense" : ""}`}>{value}</p></CardContent></Card>; }
