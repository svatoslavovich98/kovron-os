"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User } from "./types";
import { demoUsers, demoPasswords } from "./demo-data";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    try {
      const saved = localStorage.getItem("kovron_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        const found = demoUsers.find((u) => u.id === parsed.id && u.active);
        if (found) setUser(found);
      }
    } catch {}
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const trimmed = username.trim().toLowerCase();
    if (demoPasswords[trimmed] === password) {
      const found = demoUsers.find((u) => u.login === trimmed && u.active);
      if (found) {
        setUser(found);
        localStorage.setItem("kovron_user", JSON.stringify(found));
        return { success: true };
      }
    }
    return { success: false, error: "Неверный логин или пароль" };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("kovron_user");
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
