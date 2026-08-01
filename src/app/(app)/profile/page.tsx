"use client";

import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getRoleLabel } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { LogOut, Shield, Clock, Moon, Sun } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="p-4 lg:p-6 max-w-lg mx-auto space-y-5">
      <h1 className="text-xl font-bold">Профиль</h1>

      <Card>
        <CardContent className="p-5 flex flex-col items-center gap-3">
          <Avatar name={user.name} size="lg" />
          <div className="text-center">
            <h2 className="text-lg font-bold">{user.name}</h2>
            <p className="text-sm text-muted-foreground">{getRoleLabel(user.role as UserRole)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3 py-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Роль</p>
              <p className="text-xs text-muted-foreground">{getRoleLabel(user.role as UserRole)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Последний вход</p>
              <p className="text-xs text-muted-foreground">{user.lastLogin ? new Date(user.lastLogin).toLocaleString("ru-RU") : "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Оформление</h3>
          <div className="flex gap-3">
            {[
              { key: "dark" as const, label: "Тёмная", Icon: Moon },
              { key: "light" as const, label: "Светлая", Icon: Sun },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                aria-pressed={theme === key}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 p-3 rounded-md border text-sm font-medium transition-colors",
                  theme === key
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button variant="destructive" className="w-full" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" />
        Выйти
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        KOVRON OS v1.0.0
      </p>
    </div>
  );
}
