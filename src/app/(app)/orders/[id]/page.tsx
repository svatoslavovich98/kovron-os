"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatCurrency, formatDate, formatDateTime, cn } from "@/lib/utils";
import { demoOrders, demoClients, demoCars, demoUsers, demoStatuses, kitLabels } from "@/lib/demo-data";
import {
  ArrowLeft, Phone, MessageCircle, Calendar, Clock,
  User, Wallet, Package, Palette, Camera, ChevronRight,
  CheckCircle2, AlertTriangle,
} from "lucide-react";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const order = demoOrders.find((o) => o.id === id);
  const client = order ? demoClients.find((c) => c.id === order.clientId) : null;
  const car = order ? demoCars.find((c) => c.id === order.carId) : null;
  const assignee = order?.assigneeId ? demoUsers.find((u) => u.id === order.assigneeId) : null;
  const statusConfig = order ? demoStatuses.find((s) => s.key === order.status) : null;

  if (!order) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Заказ не найден</p>
        <Link href="/orders" className="text-primary hover:underline text-sm mt-2 inline-block">
          К списку заказов
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/orders" className="p-2 rounded-sm hover:bg-card transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Заказ №{order.number}</h1>
          <p className="text-sm text-muted-foreground">
            {car?.brand} {car?.model} {car?.generation}
          </p>
        </div>
        <Badge
          className="text-xs"
          style={{
            backgroundColor: `${statusConfig?.color}20`,
            color: statusConfig?.color,
          }}
        >
          {statusConfig?.label}
        </Badge>
      </div>

      {/* Client */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <User className="h-4 w-4" /> Клиент
          </h3>
          <div className="space-y-2">
            <p className="font-medium">{client?.name}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              {client?.phone}
            </div>
            {client?.messenger && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageCircle className="h-3.5 w-3.5" />
                {client.messenger}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Car */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" /> Автомобиль и комплект
          </h3>
          <div className="space-y-2">
            <p className="font-medium text-lg">
              {car?.brand} {car?.model} {car?.generation}
            </p>
            {car?.year && <p className="text-sm text-muted-foreground">{car.year} год, {car.body}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              {order.kitTypes.map((kit) => (
                <Badge key={kit} variant="outline">{kitLabels[kit] || kit}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4" /> Производственные параметры
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Материал", value: order.materialColor },
              { label: "Окантовка", value: order.edgeColor },
              { label: "Строчка", value: order.stitchColor },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div
                  className="h-10 w-10 rounded-full border-2 border-border mx-auto mb-1"
                  style={{
                    backgroundColor:
                      item.value === "Чёрный" ? "#1a1a1a" :
                      item.value === "Серый" ? "#6b6b6b" :
                      item.value === "Бежевый" ? "#d4b896" :
                      item.value === "Коричневый" ? "#6b4226" :
                      item.value === "Синий" ? "#2a4494" :
                      item.value === "Красный" ? "#b82020" :
                      item.value === "Зелёный" ? "#2d6b3f" :
                      "#f0f0f0",
                  }}
                />
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium">{item.value}</p>
              </div>
            ))}
          </div>
          {order.seamstressComment && (
            <div className="mt-3 p-3 rounded-md bg-background text-sm">
              <span className="text-muted-foreground">Для Оксаны: </span>
              {order.seamstressComment}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dates & Assignee */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Сроки
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Создан</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
            {order.desiredDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Желаемая дата</span>
                <span className={new Date(order.desiredDate) < new Date() ? "text-expense font-medium" : ""}>
                  {formatDate(order.desiredDate)}
                </span>
              </div>
            )}
            {assignee && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-muted-foreground">Исполнитель</span>
                <div className="flex items-center gap-2">
                  <Avatar name={assignee.name} size="sm" />
                  <span className="font-medium">{assignee.name}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Finance */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Финансы
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Стоимость</span>
              <span className="font-bold text-lg">{formatCurrency(order.totalPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Получено</span>
              <span className="text-income font-semibold">{formatCurrency(order.paid)}</span>
            </div>
            {order.remaining > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Осталось</span>
                <span className="text-expense font-semibold">{formatCurrency(order.remaining)}</span>
              </div>
            )}
            <div className="border-t border-border my-2 pt-2" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Оплата Оксане</span>
              <span className="font-medium">{formatCurrency(order.seamstressPayment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Материалы</span>
              <span>{formatCurrency(order.materialCost)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Плановая прибыль</span>
              <span className={order.plannedProfit >= 0 ? "text-income" : "text-expense"}>
                {formatCurrency(order.plannedProfit)}
              </span>
            </div>
          </div>

          {order.remaining > 0 && (
            <Button className="w-full mt-4" variant="income">
              <Wallet className="h-4 w-4 mr-2" />
              Получить оплату
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Status History */}
      {order.statusHistory.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" /> История статусов
            </h3>
            <div className="space-y-3">
              {order.statusHistory.map((change) => {
                const oldS = demoStatuses.find((s) => s.key === change.oldStatus);
                const newS = demoStatuses.find((s) => s.key === change.newStatus);
                return (
                  <div key={change.id} className="flex items-center gap-3 text-sm">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary">{change.userName[0]}</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-muted-foreground">{oldS?.label}</span>
                      <span className="mx-1">&rarr;</span>
                      <span className="font-medium" style={{ color: newS?.color }}>{newS?.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDateTime(change.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
