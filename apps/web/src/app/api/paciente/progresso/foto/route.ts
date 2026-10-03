import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/server";
import { sanitizePatientImage } from "@/features/paciente-pwa/infrastructure/sanitize-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ patient_id: z.string().uuid(), client_entry_id: z.string().uuid(), tirada_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), compartilhada: z.enum(["true", "false"]) });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const form = await request.formData();
  const parsed = schema.safeParse({ patient_id: form.get("patient_id"), client_entry_id: form.get("client_entry_id"), tirada_em: form.get("tirada_em"), compartilhada: form.get("compartilhada") });
  const photo = form.get("photo");
  if (!parsed.success || !(photo instanceof File)) return Response.json({ error: "invalid_photo" }, { status: 400 });
  const cleanPhoto = await sanitizePatientImage(photo);
  if (!cleanPhoto) return Response.json({ error: "invalid_photo" }, { status: 400 });
  const { data: patient } = await supabase.from("paciente").select("id,clinica_id").eq("id", parsed.data.patient_id).single();
  if (!patient) return Response.json({ error: "forbidden" }, { status: 404 });
  const share = parsed.data.compartilhada === "true";
  if (share) {
    const { data: consent } = await supabase.from("patient_consent_event").select("aceito").eq("paciente_id", patient.id).eq("user_id", userId).eq("finalidade", "compartilhar_fotos_progresso").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!consent?.aceito) return Response.json({ error: "consent_required" }, { status: 403 });
  }
  const extension = cleanPhoto.type === "image/png" ? "png" : cleanPhoto.type === "image/webp" ? "webp" : "jpg";
  const path = patient.clinica_id + "/" + patient.id + "/" + userId + "/progresso-" + parsed.data.client_entry_id + "." + extension;
  const { error: uploadError } = await supabase.storage.from("patient-health-images").upload(path, cleanPhoto, { contentType: cleanPhoto.type, upsert: false });
  if (uploadError) return Response.json({ error: "upload_failed" }, { status: 503 });
  const { error } = await supabase.from("patient_progress_photo").insert({
    clinica_id: patient.clinica_id, paciente_id: patient.id, registrado_por: userId,
    client_entry_id: parsed.data.client_entry_id, foto_path: path,
    tirada_em: parsed.data.tirada_em, compartilhado_com_profissional: share,
  });
  if (error) { await supabase.storage.from("patient-health-images").remove([path]); return Response.json({ error: "save_failed" }, { status: 503 }); }
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
