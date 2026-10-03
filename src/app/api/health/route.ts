import { createClient } from "@/shared/lib/supabase/server";
import { withManagementTables } from "@/features/gestao/infrastructure/database.types";

export const dynamic = "force-dynamic";
export async function GET() {
  const started = Date.now();
  try {
    const supabase = withManagementTables(await createClient());
    const { error } = await supabase.from("saas_plano").select("id", { count: "exact", head: true }).eq("ativo", true);
    if (error) throw error;
    return Response.json({ status: "ok", database: "ok", latency_ms: Date.now() - started, timestamp: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "degraded", database: "unavailable", latency_ms: Date.now() - started, timestamp: new Date().toISOString() }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
