"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatCurrency, formatDate, formatDateTime, cn } from "@/lib/utils";
import { useData } from "@/lib/data-context";
import { kitLabels } from "@/lib/demo-data";
import { OrderPhotoGallery } from "@/components/order-photo-gallery";
import { isFinishedPhoto } from "@/lib/order-media";
import { ReceivePaymentDialog } from "@/components/receive-payment-dialog";
import { PayContractorDialog } from "@/components/pay-contractor-dialog";
import { LayoutImageViewer } from "@/components/layout-image-viewer";
import type { OrderStatus } from "@/lib/types";
import {
  ArrowLeft, Phone, MessageCircle, Calendar, Clock,
  User, Wallet, Package, Loader2, ChevronsUpDown, UserRound, Pencil, Printer, CopyPlus, Trash2, AlertTriangle,
} from "lucide-react";

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { orders, clients, cars, users, statuses, auditLog, updateOrderStatus, deleteOrder } = useData();
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const { id } = params;
  const order = orders.find((o) => o.id === id);
  const client = order ? clients.find((c) => c.id === order.clientId) : null;
  const car = order ? cars.find((c) => c.id === order.carId) : null;
  const assignee = order?.assigneeId ? users.find((u) => u.id === order.assigneeId) : null;
  const creator = order?.createdById ? users.find((u) => u.id === order.createdById) : null;
  const statusConfig = order ? statuses.find((s) => s.key === order.status) : null;
  const salonPhotos = order?.photos.filter(url => !isFinishedPhoto(url)) || [];
  const finishedPhotos = order?.photos.filter(isFinishedPhoto) || [];
  const orderEdits = auditLog.filter(entry => entry.entityType === "order" && entry.entityId === id);

  const changeStatus = async (status: OrderStatus) => {
    if (!order || status === order.status) return;
    setUpdatingStatus(true);
    await updateOrderStatus(order.id, status);
    setUpdatingStatus(false);
  };

  const confirmDelete = async () => {
    if (!order || deleting) return;
    if (deleteReason.trim().length < 3) {
      setDeleteError("Коротко укажите причину удаления");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    const result = await deleteOrder(order.id, deleteReason.trim());
    if (!result.ok) {
      setDeleteError(result.error || "Не удалось удалить заказ");
      setDeleting(false);
      return;
    }
    router.replace("/orders");
  };

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
        <div className="relative shrink-0">
          <select
            value={order.status}
            onChange={(event) => changeStatus(event.target.value as OrderStatus)}
            disabled={updatingStatus}
            className="appearance-none rounded-md border bg-card py-2 pl-3 pr-9 text-xs font-semibold outline-none cursor-pointer disabled:opacity-60"
            style={{ color: statusConfig?.color, borderColor: `${statusConfig?.color}66` }}
            aria-label="Изменить статус заказа"
          >
            {[...statuses].sort((a, b) => a.order - b.order).map((status) => (
              <option key={status.key} value={status.key}>{status.label}</option>
            ))}
          </select>
          {updatingStatus
            ? <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
            : <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />}
        </div>
        <Link href={`/orders/${order.id}/edit`} className="p-2 rounded-sm border border-border bg-card hover:border-primary/40 transition-colors" title="Редактировать заказ">
          <Pencil className="h-4 w-4" />
        </Link>
        <button onClick={() => window.print()} className="print-hide p-2 rounded-sm border border-border bg-card hover:border-primary/40 transition-colors" title="Печать заказа"><Printer className="h-4 w-4" /></button>
        <button onClick={() => setShowDelete(true)} className="print-hide p-2 rounded-sm border border-expense/30 bg-card text-expense hover:bg-expense/10 transition-colors" title="Удалить ошибочный заказ"><Trash2 className="h-4 w-4" /></button>
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
            {/* Раскладка лекал — открывается сразу, без поиска по фотографиям */}
            <div className="pt-3">
              <LayoutImageViewer url={order.layoutImage} orderNumber={order.number} />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {client && <Link href={`/clients/${client.id}`}><Button variant="outline" size="sm" className="w-full"><User className="h-3.5 w-3.5 mr-1.5" />История клиента</Button></Link>}
              <Link href={`/orders/new?repeatOrderId=${order.id}`}><Button variant="outline" size="sm" className="w-full"><CopyPlus className="h-3.5 w-3.5 mr-1.5" />Повторить заказ</Button></Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {order.seamstressComment && <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Комментарий для Оксаны</p><p className="text-sm">{order.seamstressComment}</p></CardContent></Card>}

      {(order.layoutImage || salonPhotos.length > 0 || finishedPhotos.length > 0) && (
        <Card><CardContent className="p-4 space-y-5">
          <h3 className="text-sm font-semibold text-muted-foreground">Фотографии заказа</h3>
          <OrderPhotoGallery title="Раскладка" photos={order.layoutImage ? [order.layoutImage] : []} />
          <OrderPhotoGallery title="Салон автомобиля" photos={salonPhotos} />
          <OrderPhotoGallery title="Готовые коврики" photos={finishedPhotos} />
        </CardContent></Card>
      )}

      {/* Dates & Assignee */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Сроки
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Создан</span>
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Создал заказ</span>
              <div className="flex items-center gap-2">
                {creator ? <Avatar name={creator.name} size="sm" /> : <UserRound className="h-4 w-4 text-muted-foreground" />}
                <span className="font-medium">{creator?.name || "не указан"}</span>
              </div>
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
              <span className="text-muted-foreground">Оплата китайцам</span>
              <span className="font-medium">{formatCurrency(order.chineseCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Материалы</span>
              <span>{formatCurrency(order.materialCost)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Плановая прибыль после полной оплаты</span>
              <span className={order.plannedProfit >= 0 ? "text-income" : "text-expense"}>
                {formatCurrency(order.plannedProfit)}
              </span>
            </div>
            {order.remaining > 0 && <p className="text-xs text-muted-foreground pt-1">Это прогноз. Клиент ещё должен {formatCurrency(order.remaining)}, поэтому эта прибыль пока не получена полностью.</p>}
          </div>

          {order.remaining > 0 && (
            <ReceivePaymentDialog order={order} />
          )}

          {/* Выплаты подрядчикам — только вручную, автоматом ничего не списывается */}
          <PayContractorDialog order={order} />
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
                const oldS = statuses.find((s) => s.key === change.oldStatus);
                const newS = statuses.find((s) => s.key === change.newStatus);
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

      {showDelete && (
        <div className="fixed inset-0 z-[190] flex items-end sm:items-center justify-center sm:p-4">
          <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setShowDelete(false)} aria-label="Закрыть" />
          <div className="relative w-full sm:max-w-md rounded-t-xl sm:rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-expense/10 text-expense"><AlertTriangle className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-bold">Удалить заказ №{order.number}?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Заказ исчезнет из рабочих списков, а причина удаления останется в журнале действий. Администратор сможет найти архивную копию в корзине.</p>
              </div>
            </div>
            {order.paid > 0 ? (
              <div className="mt-4 rounded-md border border-expense/30 bg-expense/10 p-3 text-sm text-expense">
                Удаление заблокировано: по заказу получено {formatCurrency(order.paid)}. Сначала оформите возврат или исправьте ошибочную оплату.
              </div>
            ) : (
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-medium">Причина удаления</span>
                <textarea
                  value={deleteReason}
                  onChange={(event) => { setDeleteReason(event.target.value); setDeleteError(""); }}
                  placeholder="Например: заказ создан по ошибке или продублирован"
                  rows={3}
                  className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                />
              </label>
            )}
            {deleteError && <p className="mt-3 text-sm text-expense">{deleteError}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>Отмена</Button>
              <Button onClick={() => void confirmDelete()} disabled={deleting || order.paid > 0} className="bg-expense text-white hover:bg-expense/90">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="mr-2 h-4 w-4" />Удалить</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {orderEdits.length > 0 && (
        <Card><CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2"><Pencil className="h-4 w-4" /> История изменений</h3>
          <div className="space-y-3">
            {orderEdits.map(entry => (
              <div key={entry.id} className="flex items-start gap-3 text-sm">
                <Avatar name={entry.userName || "?"} size="sm" />
                <div className="flex-1 min-w-0"><p className="font-medium">{entry.userName}</p><p className="text-xs text-muted-foreground break-words">{entry.details}</p></div>
                <span className="text-[10px] text-muted-foreground shrink-0">{formatDateTime(entry.timestamp)}</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
