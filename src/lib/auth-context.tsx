"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User } from "./types";
import { demoUsers, demoPasswords } from "./demo-data";
import { getSupabase, isSupabaseMode } from "./supabase";

interface LoginResult {
  success: boolean;
  error?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    if (isSupabaseMode) {
      restoreSupabaseSession();
    } else {
      restoreDemoSession();
    }
  }, []);

  function restoreDemoSession() {
    try {
      const saved = localStorage.getItem("kovron_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        const found = demoUsers.find((u) => u.id === parsed.id && u.active);
        if (found) setUser(found);
      }
    } catch {}
    setLoading(false);
  }

  async function restoreSupabaseSession() {
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }

    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        const { data: profile } = await sb
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setUser({
            id: profile.id,
            name: profile.name,
            login: profile.login,
            role: profile.role,
            active: profile.active,
            avatar: profile.avatar_url || undefined,
            lastLogin: profile.last_login || undefined,
            createdAt: profile.created_at,
          });
        }
      }
    } catch (err) {
      console.error("Failed to restore session:", err);
    }
    setLoading(false);

    // Listen for auth changes
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      } else if (event === "SIGNED_IN" && session?.user) {
        const { data: profile } = await sb
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setUser({
            id: profile.id,
            name: profile.name,
            login: profile.login,
            role: profile.role,
            active: profile.active,
            avatar: profile.avatar_url || undefined,
            lastLogin: profile.last_login || undefined,
            createdAt: profile.created_at,
          });
        }
      }
    });
  }

  const login = useCallback(async (username: string, password: string) => {
    const trimmed = username.trim().toLowerCase();

    if (isSupabaseMode) {
      return loginSupabase(trimmed, password);
    } else {
      return loginDemo(trimmed, password);
    }
  }, []);

  function loginDemo(username: string, password: string): Promise<LoginResult> {
    if (demoPasswords[username] === password) {
      const found = demoUsers.find((u) => u.login === username && u.active);
      if (found) {
        setUser(found);
        localStorage.setItem("kovron_user", JSON.stringify(found));
        return Promise.resolve({ success: true, role: found.role });
      }
    }
    return Promise.resolve({ success: false, error: "Неверный логин или пароль" });
  }

  async function loginSupabase(username: string, password: string): Promise<LoginResult> {
    const sb = getSupabase();
    if (!sb) return { success: false, error: "Supabase не подключён" };

    // Map login name to email format
    const email = username.includes("@") ? username : `${username}@kovron.local`;

    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("Supabase auth error:", error.message);
        return { success: false, error: "Неверный логин или пароль" };
      }

      if (data.user) {
        const { data: profile, error: profileError } = await sb
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (profileError) {
          console.error("Profile fetch error:", profileError);
          await sb.auth.signOut();
          return {
            success: false,
            error: `Не удалось загрузить профиль: ${profileError.message}`,
          };
        }

        if (!profile) {
          await sb.auth.signOut();
          return { success: false, error: "Профиль сотрудника не создан в базе" };
        }

        if (!profile.active) {
          await sb.auth.signOut();
          return { success: false, error: "Учётная запись отключена" };
        }

        // Сотрудник может числиться в работе (его назначают исполнителем
        // и ему считаются выплаты), но не иметь доступа в приложение
        if (profile.can_login === false) {
          await sb.auth.signOut();
          return { success: false, error: "Для этой учётной записи вход в приложение закрыт" };
        }

        const u: User = {
          id: profile.id,
          name: profile.name,
          login: profile.login,
          role: profile.role,
          active: profile.active,
          avatar: profile.avatar_url || undefined,
          lastLogin: profile.last_login || undefined,
          createdAt: profile.created_at,
        };
        setUser(u);

        // Update last_login (non-blocking — failure must not break login)
        sb.from("profiles")
          .update({ last_login: new Date().toISOString() })
          .eq("id", u.id)
          .then(({ error: e }) => {
            if (e) console.warn("last_login update failed:", e.message);
          });

        return { success: true, role: u.role };
      }

      return { success: false, error: "Не удалось войти" };
    } catch (err) {
      console.error("Login network error:", err);
      return { success: false, error: "Ошибка соединения с сервером" };
    }
  }

  const logout = useCallback(async () => {
    if (isSupabaseMode) {
      const sb = getSupabase();
      if (sb) await sb.auth.signOut();
    } else {
      localStorage.removeItem("kovron_user");
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
