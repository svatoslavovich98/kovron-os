"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LogOut } from "lucide-react";
import { NotificationCenter } from "@/components/notification-center";

export default function SeamstressLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role !== "seamstress") router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="skeleton h-8 w-32 rounded" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border glass px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="-80 -110 160 240" fill="none">
              <rect x="-80" y="-110" width="28" height="220" rx="6" fill="hsl(var(--primary))"/>
              <path d="M-40,-20 L60,-110 L80,-90 L-20,0Z" fill="hsl(var(--primary))"/>
              <path d="M-40,20 L80,110 L60,130 L-52,40Z" fill="hsl(var(--primary))" opacity="0.8"/>
            </svg>
          </div>
          <h1 className="text-lg font-bold">
            KOVRON <span className="text-primary">OS</span>
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <NotificationCenter />
          <button
            onClick={() => { logout(); router.replace("/login"); }}
            className="p-2 hover:bg-background rounded-sm transition-colors text-muted-foreground"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>
      <main className="pb-8">{children}</main>
    </div>
  );
}
