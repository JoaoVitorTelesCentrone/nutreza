import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/shared/config/env";
import type { Database } from "@/shared/lib/supabase/database.types";
import { withManagementTables } from "./database.types";

export function createManagementAdmin() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY não configurada.");
  const { NEXT_PUBLIC_SUPABASE_URL } = getSupabaseConfig();
  return withManagementTables(createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}
