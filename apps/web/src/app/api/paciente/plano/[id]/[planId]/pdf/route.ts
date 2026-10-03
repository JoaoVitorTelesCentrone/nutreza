import { requirePatientAccount } from "@/features/paciente-pwa/application/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; planId: string }> }) {
  const { id, planId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(planId)) return new Response(null, { status: 404 });
  const { supabase } = await requirePatientAccount(id);
  const { data: plan } = await supabase.from("plano_alimentar").select("id")
    .eq("id", planId).eq("paciente_id", id).eq("status", "aprovado").maybeSingle();
  if (!plan) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const target = new URL("/app/pacientes/" + id + "/planos/" + planId + "/pdf", request.url);
  return new Response(null, { status: 307, headers: { Location: target.toString(), "Cache-Control": "private, no-store" } });
}
