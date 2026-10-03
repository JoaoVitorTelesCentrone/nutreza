import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/shared/config/env";
import type { Database } from "@/shared/lib/supabase/database.types";
import { withPhase8Tables } from "./database.types";

export function createPhase8Admin() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY não configurada.");
  const { NEXT_PUBLIC_SUPABASE_URL } = getSupabaseConfig();
  const client = createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return withPhase8Tables(client);
}
