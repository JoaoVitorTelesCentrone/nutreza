import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/shared/config/env";
import type { Database } from "./database.types";

export function createClient() {
  const config = getSupabaseConfig();
  return createBrowserClient<Database>(config.NEXT_PUBLIC_SUPABASE_URL, config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
