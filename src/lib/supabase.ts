"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (process.env.NEXT_PUBLIC_DATA_MODE !== "supabase") return null;

  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error("Supabase URL or ANON KEY not set");
      return null;
    }

    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "kovron-auth",
      },
    });
  }

  return supabaseInstance;
}

export const isSupabaseMode = process.env.NEXT_PUBLIC_DATA_MODE === "supabase";
