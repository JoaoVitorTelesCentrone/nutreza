import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/shared/config/env";
import type { FinanceDatabase } from "./database.types";

export function createFinanceAdmin() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY não configurada.");
  const { NEXT_PUBLIC_SUPABASE_URL } = getSupabaseConfig();
  return createClient<FinanceDatabase>(NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
