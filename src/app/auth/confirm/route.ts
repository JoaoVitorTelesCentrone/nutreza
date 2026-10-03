import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/shared/config/env";
import type { Database } from "@/shared/lib/supabase/database.types";

export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? request.url;
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const requestedNext = request.nextUrl.searchParams.get("next") ?? "/app";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/app";
  if (token_hash && (type === "email" || type === "recovery" || type === "invite")) {
    const response = NextResponse.redirect(new URL(type === "recovery" ? "/redefinir-senha/nova" : next, origin));
    const config = getSupabaseConfig();
    const supabase = createServerClient<Database>(config.NEXT_PUBLIC_SUPABASE_URL, config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    });
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return response;
  }
  return NextResponse.redirect(new URL("/entrar?erro=link", origin));
}
