"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(username, password);
    if (result.success) {
      // Redirect based on role
      const saved = localStorage.getItem("kovron_user");
      if (saved) {
        const user = JSON.parse(saved);
        router.replace(user.role === "seamstress" ? "/seamstress" : "/dashboard");
      }
    } else {
      setError(result.error || "Ошибка входа");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground font-bold text-2xl">K</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-center tracking-tight">
              KOVRON <span className="text-primary">OS</span>
            </h1>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Система управления заказами
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Input
              placeholder="Логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-sm bg-expense/10 border border-expense/20 px-4 py-3 text-sm text-expense animate-fade-in">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading || !username || !password}>
            <LogIn className="mr-2 h-5 w-5" />
            {loading ? "Вход..." : "Войти"}
          </Button>
        </form>

        {/* Demo hint */}
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">Демо-доступ</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { login: "ilya", role: "Админ" },
              { login: "artem", role: "Редактор" },
              { login: "ksyusha", role: "Редактор" },
              { login: "oksana", role: "Швея" },
            ].map((u) => (
              <button
                key={u.login}
                type="button"
                onClick={() => { setUsername(u.login); setPassword("kovron2026"); }}
                className="rounded-sm border border-border bg-background px-3 py-2 hover:bg-card transition-colors text-left"
              >
                <span className="font-medium text-foreground">{u.login}</span>
                <span className="block text-muted-foreground">{u.role}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Пароль: kovron2026</p>
        </div>
      </div>
    </div>
  );
}
