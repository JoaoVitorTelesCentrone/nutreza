import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/server";
import { sanitizePatientImage } from "@/features/paciente-pwa/infrastructure/sanitize-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const suggestionSchema = z.object({
  items: z.array(z.object({ nome: z.string().trim().min(1).max(100), porcao: z.string().trim().max(60), confianca: z.enum(["baixa", "media", "alta"]) })).max(12),
});

export async function POST(request: Request) {
  if (process.env.PATIENT_PHOTO_AI_ENABLED !== "true") return Response.json({ error: "analysis_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const form = await request.formData();
  const patientId = String(form.get("patient_id") ?? "");
  const photo = form.get("photo");
  if (!/^[0-9a-f-]{36}$/i.test(patientId) || !(photo instanceof File)) {
    return Response.json({ error: "invalid_photo" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const cleanPhoto = await sanitizePatientImage(photo);
  if (!cleanPhoto) return Response.json({ error: "invalid_photo" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const { data: patient } = await supabase.from("paciente").select("clinica_id").eq("id", patientId).single();
  if (!patient) return Response.json({ error: "forbidden" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const { data: config } = await supabase.from("patient_pwa_config").select("photo_ai_enabled").eq("clinica_id", patient.clinica_id).maybeSingle();
  if (!config?.photo_ai_enabled) return Response.json({ error: "analysis_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const { data: allowed, error: quotaError } = await supabase.rpc("consume_patient_photo_ai_call", { p_paciente_id: patientId });
  if (quotaError || !allowed) return Response.json({ error: "consent_required_or_limit_reached" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.PATIENT_PHOTO_MODEL;
  if (!apiKey || !model) return Response.json({ error: "analysis_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const encoded = Buffer.from(await cleanPhoto.arrayBuffer()).toString("base64");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      model, store: false, max_output_tokens: 500,
      input: [{ role: "user", content: [
        { type: "input_text", text: "Identifique apenas alimentos visíveis nesta foto de refeição. Não estime calorias nem faça recomendações de saúde. Se não reconhecer algo, omita ou marque confiança baixa. Responda somente pelo esquema." },
        { type: "input_image", image_url: "data:" + cleanPhoto.type + ";base64," + encoded, detail: "low" },
      ] }],
      text: { format: { type: "json_schema", name: "meal_photo_suggestions", strict: true, schema: {
        type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", maxItems: 12, items: {
          type: "object", additionalProperties: false, required: ["nome", "porcao", "confianca"], properties: {
            nome: { type: "string" }, porcao: { type: "string" }, confianca: { type: "string", enum: ["baixa", "media", "alta"] },
          },
        } } },
      } } },
    }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!response?.ok) return Response.json({ error: "analysis_failed" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const payload = await response.json().catch(() => null) as { output_text?: string } | null;
  let output: unknown = null;
  try { output = payload?.output_text ? JSON.parse(payload.output_text) : null; } catch { output = null; }
  const parsed = suggestionSchema.safeParse(output);
  if (!parsed.success) return Response.json({ error: "analysis_failed" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return Response.json({ suggestions: parsed.data.items }, { headers: { "Cache-Control": "no-store" } });
}
