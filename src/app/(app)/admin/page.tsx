"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatDateTime, getRoleLabel, cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { demoUsers, demoStatuses, demoExpenseCategories, demoIncomeCategories, demoAccounts, demoAuditLog, materialColors, edgeColors, kitLabels } from "@/lib/demo-data";
import {
  Users, Shield, Tag, CreditCard, Palette, Package,
  Settings, Clock, ChevronRight, Plus, Edit2, Trash2,
  ToggleLeft, Archive, AlertTriangle,
} from "lucide-react";

type AdminSection = "users" | "statuses" | "categories" | "accounts" | "catalogs" | "audit" | "settings";

const sections: { key: AdminSection; label: string; icon: typeof Users; description: string }[] = [
  { key: "users", label: "Пользователи", icon: Users, description: "Управление аккаунтами и правами" },
  { key: "statuses", label: "Статусы заказов", icon: Tag, description: "Настройка статусов и порядка" },
  { key: "categories", label: "Категории", icon: Package, description: "Категории доходов и расходов" },
  { key: "accounts", label: "Счета", icon: CreditCard, description: "Управление счетами и кошельками" },
  { key: "catalogs", label: "Каталоги", icon: Palette, description: "Цвета, комплекты, источники" },
  { key: "audit", label: "Журнал действий", icon: Clock, description: "Полная история изменений" },
  { key: "settings", label: "Настройки", icon: Settings, description: "Общие настройки приложения" },
];

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AdminSection>("users");

  if (!user || user.role !== "admin") {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-expense mx-auto mb-3" />
        <p className="text-lg font-semibold">Доступ запрещён</p>
        <p className="text-sm text-muted-foreground mt-1">Раздел доступен только администратору</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Админка</h1>

      <div className="flex lg:gap-6">
        {/* Section nav */}
        <div className="hidden lg:block w-56 shrink-0 space-y-1">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-sm text-left transition-all",
                activeSection === s.key
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-card"
              )}
            >
              <s.icon className="h-4 w-4 shrink-0" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Mobile: section selector */}
        <div className="lg:hidden w-full space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {sections.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  activeSection === s.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 lg:block hidden">
          <AdminContent section={activeSection} />
        </div>
      </div>

      {/* Mobile content */}
      <div className="lg:hidden">
        <AdminContent section={activeSection} />
      </div>
    </div>
  );
}

function AdminContent({ section }: { section: AdminSection }) {
  switch (section) {
    case "users":
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Пользователи</h2>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Добавить</Button>
          </div>
          {demoUsers.map((u) => (
            <Card key={u.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar name={u.name} />
                <div className="flex-1">
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-xs text-muted-foreground">@{u.login} • {getRoleLabel(u.role as UserRole)}</p>
                  {u.lastLogin && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Последний вход: {formatDateTime(u.lastLogin)}
                    </p>
                  )}
                </div>
                <Badge variant={u.active ? "default" : "muted"}>
                  {u.active ? "Активен" : "Заблокирован"}
                </Badge>
                <button className="p-2 hover:bg-background rounded-sm transition-colors">
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      );

    case "statuses":
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Статусы заказов</h2>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Новый статус</Button>
          </div>
          {demoStatuses.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-md bg-card border border-border">
              <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-sm font-medium flex-1">{s.label}</span>
              {s.isFinal && <Badge variant="muted" className="text-[10px]">Финальный</Badge>}
              <span className="text-xs text-muted-foreground">#{s.order}</span>
              <button className="p-1 hover:bg-background rounded-sm"><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
            </div>
          ))}
        </div>
      );

    case "categories":
      return (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Категории расходов</h2>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Добавить</Button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {demoExpenseCategories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 p-3 rounded-md bg-card border border-border">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                    <span style={{ color: cat.color }} className="text-sm">
                      {cat.icon === "Scissors" ? "✂" :
                       cat.icon === "UserCheck" ? "👤" :
                       cat.icon === "Megaphone" ? "📢" :
                       cat.icon === "Home" ? "🏠" :
                       cat.icon === "Wrench" ? "🔧" : "📋"}
                    </span>
                  </div>
                  <span className="text-sm font-medium flex-1">{cat.name}</span>
                  <button className="p-1"><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Категории доходов</h2>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Добавить</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoIncomeCategories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 p-3 rounded-md bg-card border border-border">
                  <div className="h-8 w-8 rounded-full bg-income/10 flex items-center justify-center">
                    <span className="text-income text-sm">💰</span>
                  </div>
                  <span className="text-sm font-medium flex-1">{cat.name}</span>
                  <button className="p-1"><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "accounts":
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Счета и кошельки</h2>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Новый счёт</Button>
          </div>
          {demoAccounts.map((acc) => (
            <Card key={acc.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold">{acc.name}</p>
                  <p className="text-xs text-muted-foreground">{acc.type}</p>
                </div>
                <Badge variant={acc.active ? "default" : "muted"}>{acc.active ? "Активен" : "Архив"}</Badge>
                <button className="p-1"><Edit2 className="h-4 w-4 text-muted-foreground" /></button>
              </CardContent>
            </Card>
          ))}
        </div>
      );

    case "catalogs":
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Каталоги</h2>
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Виды комплектов</h3>
              <div className="flex flex-wrap gap-2">
                {Object.values(kitLabels).map((label) => (
                  <Badge key={label} variant="outline">{label}</Badge>
                ))}
                <button className="px-2.5 py-0.5 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:border-primary/30">
                  + Добавить
                </button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Цвета материалов</h3>
              <div className="flex flex-wrap gap-2">
                {materialColors.map((c) => (
                  <div key={c.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-xs">
                    <div className="h-3.5 w-3.5 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
                    {c.name}
                  </div>
                ))}
                <button className="px-2.5 py-1 rounded-full border border-dashed border-border text-xs text-muted-foreground">
                  + Добавить
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      );

    case "audit":
      return (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Журнал действий</h2>
          {demoAuditLog.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 p-3 rounded-md bg-card border border-border">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">{entry.userName[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{entry.details}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {entry.userName} • {formatDateTime(entry.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      );

    case "settings":
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Настройки</h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Режим данных</p>
                  <p className="text-xs text-muted-foreground">Демо-режим с встроенными данными</p>
                </div>
                <Badge>Демо</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Часовой пояс</p>
                  <p className="text-xs text-muted-foreground">UTC+7 (Барнаул)</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Валюта</p>
                  <p className="text-xs text-muted-foreground">Российский рубль (₽)</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Формат даты</p>
                  <p className="text-xs text-muted-foreground">ДД.ММ.ГГГГ</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-2">Подключение Supabase</p>
              <p className="text-xs text-muted-foreground mb-3">
                Для работы с реальными данными, создайте проект на supabase.com и укажите ключи в .env.local
              </p>
              <Button variant="outline" size="sm">Инструкция по настройке</Button>
            </CardContent>
          </Card>
        </div>
      );
  }
}
