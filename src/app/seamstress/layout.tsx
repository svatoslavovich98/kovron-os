"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LogOut } from "lucide-react";

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
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-lg px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">
          KOVRON <span className="text-primary">OS</span>
        </h1>
        <button
          onClick={() => { logout(); router.replace("/login"); }}
          className="p-2 hover:bg-background rounded-sm transition-colors text-muted-foreground"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>
      <main className="pb-8">{children}</main>
    </div>
  );
}
