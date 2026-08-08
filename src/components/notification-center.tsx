"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Clock3, CreditCard, PackageCheck, Smartphone, Sparkles, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { appReleases } from "@/lib/app-releases";
import { Button } from "@/components/ui/button";

type AlertItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  orderId?: string;
  kind: "deadline" | "payment" | "ready" | "system" | "update";
  read: boolean;
  persisted?: boolean;
  details?: string[];
  url?: string;
};

const iconByKind = {
  deadline: Clock3,
  payment: CreditCard,
  ready: PackageCheck,
  system: Bell,
  update: Sparkles,
};

export function NotificationCenter() {
  const { user } = useAuth();
  const { orders, cars, clients, statuses, notifications, markNotificationRead, markAllNotificationsRead } = useData();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [phonePermission, setPhonePermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const rootRef = useRef<HTMLDivElement>(null);
  const storageKey = `kovron-read-alerts:${user?.id || "guest"}`;
  const phoneSeenKey = `kovron-phone-seen:${user?.id || "guest"}`;

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPhonePermission("unsupported");
      return;
    }
    setPhonePermission(Notification.permission);
    if (Notification.permission === "granted") {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  useEffect(() => {
    try {
      setDismissed(JSON.parse(localStorage.getItem(storageKey) || "[]"));
    } catch {
      setDismissed([]);
    }
  }, [storageKey]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const derivedAlerts = useMemo<AlertItem[]>(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const result: AlertItem[] = [];
    for (const order of orders) {
      if (order.status === "cancelled") continue;
      const isActive = order.status !== "completed" && order.status !== "delivered";
      const car = cars.find(item => item.id === order.carId);
      const client = clients.find(item => item.id === order.clientId);
      const carName = car ? `${car.brand} ${car.model}` : `заказ №${order.number}`;
      const statusName = statuses.find(item => item.key === order.status)?.label || order.status;
      const details = [
        client ? `Клиент: ${client.name}${client.phone ? ` · ${client.phone}` : ""}` : "",
        `Автомобиль: ${carName}`,
        `Статус: ${statusName}`,
        order.desiredDate ? `Срок: ${formatDate(order.desiredDate)}` : "",
        `Стоимость: ${formatCurrency(order.totalPrice)} · долг: ${formatCurrency(order.remaining)}`,
      ].filter(Boolean);

      if (isActive && order.desiredDate && order.desiredDate.slice(0, 10) < today && order.status !== "ready") {
        result.push({
          id: `deadline:${order.id}`,
          title: "Просрочен срок",
          message: `${carName}, заказ №${order.number} — проверьте готовность`,
          createdAt: order.desiredDate,
          orderId: order.id,
          kind: "deadline",
          read: dismissed.includes(`deadline:${order.id}`),
          details,
        });
      }
      if (isActive && order.desiredDate?.slice(0, 10) === today) {
        result.push({
          id: `today:${order.id}`,
          title: "Сегодня срок готовности",
          message: `${carName}, заказ №${order.number}`,
          createdAt: order.desiredDate,
          orderId: order.id,
          kind: "deadline",
          read: dismissed.includes(`today:${order.id}`),
          details,
        });
      }
      if (order.status === "ready") {
        result.push({
          id: `ready:${order.id}`,
          title: "Заказ готов к выдаче",
          message: `${carName}, заказ №${order.number}`,
          createdAt: order.createdAt,
          orderId: order.id,
          kind: "ready",
          read: dismissed.includes(`ready:${order.id}`),
          details,
        });
      }
      if (order.remaining > 0 && ["ready", "completed", "delivered"].includes(order.status)) {
        result.push({
          id: `payment:${order.id}`,
          title: "Ожидается оплата",
          message: `По заказу №${order.number} осталось получить ${formatCurrency(order.remaining)}`,
          createdAt: order.createdAt,
          orderId: order.id,
          kind: "payment",
          read: dismissed.includes(`payment:${order.id}`),
          details,
        });
      }
      const lastChange = order.statusHistory.reduce((latest, item) => Math.max(latest, +new Date(item.timestamp)), +new Date(order.createdAt));
      if (isActive && now.getTime() - lastChange > 3 * 24 * 60 * 60 * 1000) {
        result.push({
          id: `stuck:${order.id}:${order.status}`,
          title: "Заказ давно без движения",
          message: `${carName}, заказ №${order.number} — проверьте статус`,
          createdAt: new Date(lastChange).toISOString(),
          orderId: order.id,
          kind: "system",
          read: dismissed.includes(`stuck:${order.id}:${order.status}`),
          details,
        });
      }
    }
    return result;
  }, [orders, cars, clients, statuses, dismissed]);

  const releaseAlerts = useMemo<AlertItem[]>(() => appReleases.map(release => ({
    id: release.id,
    title: release.title,
    message: release.summary,
    createdAt: release.publishedAt,
    kind: "update" as const,
    read: dismissed.includes(release.id),
    details: [`Версия ${release.version}`, ...release.details],
  })), [dismissed]);

  const items = useMemo<AlertItem[]>(() => [
    ...notifications.map(item => ({
      id: item.id,
      title: item.title,
      message: item.message,
      createdAt: item.createdAt,
      orderId: item.orderId,
      kind: "system" as const,
      read: item.read,
      persisted: true,
    })),
    ...releaseAlerts,
    ...derivedAlerts,
  ].sort((a, b) => Number(a.read) - Number(b.read) || +new Date(b.createdAt) - +new Date(a.createdAt)), [notifications, releaseAlerts, derivedAlerts]);

  const unreadCount = items.filter(item => !item.read).length;

  const enablePhoneNotifications = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPhonePermission("unsupported");
      return;
    }
    const permission = await Notification.requestPermission();
    setPhonePermission(permission);
    if (permission !== "granted") return;
    const registration = await navigator.serviceWorker.register("/sw.js");
    await registration.showNotification("KOVRON OS", {
      body: "Уведомления на телефоне включены. Здесь будут сроки, оплаты, готовые заказы и новости приложения.",
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      tag: "kovron-phone-enabled",
      data: { url: "/dashboard" },
    });
    try { localStorage.setItem(phoneSeenKey, JSON.stringify(items.map(item => item.id).slice(0, 300))); } catch {}
  };

  useEffect(() => {
    if (phonePermission !== "granted" || !items.length) return;
    let seen: string[] = [];
    try { seen = JSON.parse(localStorage.getItem(phoneSeenKey) || "[]"); } catch {}
    if (!seen.length) {
      try { localStorage.setItem(phoneSeenKey, JSON.stringify(items.map(item => item.id).slice(0, 300))); } catch {}
      return;
    }
    const next = items.find(item => !item.read && !seen.includes(item.id));
    if (!next) return;
    navigator.serviceWorker.ready.then(registration => registration.showNotification(next.title, {
      body: next.message,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      tag: next.id,
      data: { url: next.orderId ? `/orders/${next.orderId}` : next.url || "/dashboard" },
    })).catch(() => {});
    const updatedSeen = Array.from(new Set([next.id, ...seen])).slice(0, 300);
    try { localStorage.setItem(phoneSeenKey, JSON.stringify(updatedSeen)); } catch {}
  }, [items, phonePermission, phoneSeenKey]);

  const dismissDerived = (id: string) => {
    const next = Array.from(new Set([...dismissed, id])).slice(-300);
    setDismissed(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };

  const readItem = (item: AlertItem) => {
    if (item.persisted) void markNotificationRead(item.id);
    else dismissDerived(item.id);
    setOpen(false);
  };

  const readAll = () => {
    void markAllNotificationsRead();
    const ids = derivedAlerts.map(item => item.id);
    const next = Array.from(new Set([...dismissed, ...ids])).slice(-300);
    setDismissed(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen(value => !value)}
        className={cn("relative p-2 rounded-sm transition-colors", open ? "bg-card text-foreground" : "hover:bg-card text-muted-foreground")}
        aria-label={`Уведомления: ${unreadCount} непрочитанных`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-expense text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute z-[80] top-16 sm:top-11 left-3 right-3 sm:left-auto sm:right-0 sm:w-[390px] max-h-[70dvh] overflow-hidden rounded-lg border border-border bg-card shadow-2xl animate-scale-in">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
            <div>
              <h2 className="font-semibold">Уведомления</h2>
              <p className="text-xs text-muted-foreground">{unreadCount ? `Непрочитанных: ${unreadCount}` : "Всё просмотрено"}</p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={readAll} className="p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-background" title="Прочитать все">
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={enablePhoneNotifications}
                className={cn("p-2 rounded-sm hover:bg-background", phonePermission === "granted" ? "text-income" : "text-muted-foreground hover:text-foreground")}
                title={phonePermission === "granted" ? "Уведомления телефона включены" : "Включить уведомления на телефоне"}
              >
                <Smartphone className="h-4 w-4" />
              </button>
              <button onClick={() => setOpen(false)} className="p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-background" aria-label="Закрыть">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {phonePermission !== "granted" && phonePermission !== "unsupported" && (
            <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-4 py-3">
              <Smartphone className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">Уведомления на телефоне</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {phonePermission === "denied" ? "Разрешение отключено. Включите уведомления для KOVRON OS в настройках телефона." : "Получайте сроки, оплаты и новости KOVRON OS."}
                </p>
              </div>
              {phonePermission !== "denied" && <Button type="button" size="sm" onClick={enablePhoneNotifications}>Включить</Button>}
            </div>
          )}

          <div className="overflow-y-auto max-h-[calc(70dvh-72px)]">
            {items.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">Новых уведомлений нет</p>
                <p className="text-xs text-muted-foreground mt-1">Здесь появятся сроки, оплаты и готовые заказы</p>
              </div>
            ) : items.slice(0, 30).map(item => {
              const Icon = iconByKind[item.kind];
              const content = (
                <div className={cn("flex gap-3 p-4 border-b border-border/70 hover:bg-background transition-colors", !item.read && "bg-primary/5")}>
                  <div className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                    item.kind === "deadline" ? "bg-expense/10 text-expense" :
                    item.kind === "payment" ? "bg-warning/10 text-warning" :
                    item.kind === "ready" ? "bg-income/10 text-income" :
                    item.kind === "update" ? "bg-primary/10 text-primary" : "bg-info/10 text-info"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="text-sm font-semibold flex-1">{item.title}</p>
                      {!item.read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.message}</p>
                    {!!item.details?.length && (
                      <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-foreground/80">
                        {item.details.map(detail => <li key={detail} className="flex gap-1.5"><span className="text-primary">•</span><span>{detail}</span></li>)}
                      </ul>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 mt-1.5">{formatDateTime(item.createdAt)}</p>
                  </div>
                </div>
              );
              return item.orderId ? (
                <Link key={item.id} href={`/orders/${item.orderId}`} onClick={() => readItem(item)}>{content}</Link>
              ) : (
                <button key={item.id} onClick={() => readItem(item)} className="block w-full text-left">{content}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
