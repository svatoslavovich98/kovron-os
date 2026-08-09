"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  Home, ShoppingBag, Factory, Wallet, BarChart3,
  Users, Settings, ChevronRight, Plus, ArrowLeftRight,
  TrendingUp, TrendingDown, LogOut, Bell, User,
  CreditCard, BookOpen, X, Menu, GraduationCap, Globe2,
  ArrowUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

const mainNav = [
  { href: "/dashboard", label: "Главная", icon: Home },
  { href: "/orders", label: "Заказы", icon: ShoppingBag },
  { href: "/production", label: "Производство", icon: Factory },
  { href: "/finance", label: "Финансы", icon: Wallet },
  { href: "/accounts", label: "Счета", icon: CreditCard },
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/clients", label: "Клиенты", icon: Users },
  { href: "/templates", label: "Лекала", icon: BookOpen },
  { href: "/china-catalog", label: "Китайский каталог", icon: Globe2 },
  { href: "/guide", label: "Инструкция", icon: GraduationCap },
  { href: "/profile", label: "Профиль", icon: User },
];

const bottomNav = [
  { href: "/dashboard", label: "Главная", icon: Home },
  { href: "/orders", label: "Заказы", icon: ShoppingBag },
  { href: "add", label: "Добавить", icon: Plus, isAction: true },
  { href: "/finance", label: "Финансы", icon: Wallet },
  { href: "more", label: "Ещё", icon: Menu, isMenu: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user?.role === "seamstress") router.replace("/seamstress");
  }, [user, loading, router]);

  if (loading || !user || user.role === "seamstress") {
    return (
      <div className="app-viewport flex items-center justify-center bg-background">
        <div className="skeleton h-8 w-32 rounded" />
      </div>
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="app-viewport flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card shrink-0">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
              <svg width="18" height="18" viewBox="-80 -110 160 240" fill="none">
                <rect x="-80" y="-110" width="28" height="220" rx="6" fill="hsl(var(--primary))"/>
                <path d="M-40,-20 L60,-110 L80,-90 L-20,0Z" fill="hsl(var(--primary))"/>
                <path d="M-40,20 L80,110 L60,130 L-52,40Z" fill="hsl(var(--primary))" opacity="0.8"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              KOVRON <span className="text-primary">OS</span>
            </h1>
          </div>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {mainNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-5 py-2.5 mx-2 rounded-sm text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 mx-2 rounded-sm text-sm font-medium transition-all",
                pathname.startsWith("/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-card"
              )}
            >
              <Settings className="h-5 w-5 shrink-0" />
              Админка
            </Link>
          )}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {user.role === "admin" ? "Администратор" : "Редактор"}
              </p>
            </div>
            <button onClick={logout} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
        <div
          ref={scrollContainerRef}
          onScroll={(event) => setShowScrollTop(event.currentTarget.scrollTop > 500)}
          className="app-scroll app-mobile-content flex-1 overflow-y-auto pb-20 lg:pb-0"
        >
          {children}
        </div>
      </main>

      {showScrollTop && (
        <button
          type="button"
          onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/75 text-muted-foreground shadow-md backdrop-blur-md transition-all hover:bg-card hover:text-foreground active:scale-95 lg:bottom-6 lg:right-6"
          aria-label="Вернуться в начало страницы"
          title="Наверх"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}

      {/* Mobile bottom nav */}
      <nav className="app-mobile-nav app-fixed-safe lg:hidden fixed bottom-0 border-t border-border glass z-50">
        <div className="app-mobile-nav-inner flex items-center justify-around h-16 px-2 safe-bottom">
          {bottomNav.map((item) => {
            if (item.isAction) {
              return (
                <button
                  key="add"
                  onClick={() => { setShowAddMenu(!showAddMenu); setShowMoreMenu(false); }}
                  className="app-mobile-action flex items-center justify-center w-14 h-14 -mt-5 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
                >
                  <Plus className="h-7 w-7" />
                </button>
              );
            }
            if (item.isMenu) {
              return (
                <button
                  key="more"
                  onClick={() => { setShowMoreMenu(!showMoreMenu); setShowAddMenu(false); }}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-1 px-3 text-xs transition-colors",
                    showMoreMenu ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Menu className="h-5 w-5" />
                  <span className="app-mobile-nav-label">{item.label}</span>
                </button>
              );
            }
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => { setShowAddMenu(false); setShowMoreMenu(false); }}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-3 text-xs transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="app-mobile-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Add menu overlay (mobile) */}
      {showAddMenu && (
        <div className="lg:hidden fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowAddMenu(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="app-mobile-sheet relative w-full max-w-lg mx-4 mb-20 rounded-lg bg-card border border-border p-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/orders/new"
                onClick={() => setShowAddMenu(false)}
                className="flex items-center gap-3 p-4 rounded-md bg-background hover:bg-secondary2 transition-colors"
              >
                <ShoppingBag className="h-5 w-5 text-primary" />
                <span className="font-medium text-sm">Новый заказ</span>
              </Link>
              <Link
                href="/finance?action=income"
                onClick={() => setShowAddMenu(false)}
                className="flex items-center gap-3 p-4 rounded-md bg-background hover:bg-secondary2 transition-colors"
              >
                <TrendingUp className="h-5 w-5 text-income" />
                <span className="font-medium text-sm">Доход</span>
              </Link>
              <Link
                href="/finance?action=expense"
                onClick={() => setShowAddMenu(false)}
                className="flex items-center gap-3 p-4 rounded-md bg-background hover:bg-secondary2 transition-colors"
              >
                <TrendingDown className="h-5 w-5 text-expense" />
                <span className="font-medium text-sm">Расход</span>
              </Link>
              <Link
                href="/finance?action=transfer"
                onClick={() => setShowAddMenu(false)}
                className="flex items-center gap-3 p-4 rounded-md bg-background hover:bg-secondary2 transition-colors"
              >
                <ArrowLeftRight className="h-5 w-5 text-info" />
                <span className="font-medium text-sm">Перевод</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* More menu overlay (mobile) */}
      {showMoreMenu && (
        <div className="lg:hidden fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="app-mobile-sheet relative w-full max-w-lg mx-4 mb-20 max-h-[calc(var(--app-height)-6rem)] overflow-y-auto rounded-lg bg-card border border-border p-2 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { href: "/accounts", label: "Счета", icon: CreditCard },
              { href: "/analytics", label: "Аналитика", icon: BarChart3 },
              { href: "/clients", label: "Клиенты", icon: Users },
              { href: "/templates", label: "Лекала", icon: BookOpen },
              { href: "/china-catalog", label: "Китайский каталог", icon: Globe2 },
              { href: "/guide", label: "Инструкция", icon: GraduationCap },
              { href: "/profile", label: "Профиль", icon: User },
              ...(isAdmin ? [{ href: "/admin", label: "Админка", icon: Settings }] : []),
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMoreMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-background transition-colors"
              >
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
