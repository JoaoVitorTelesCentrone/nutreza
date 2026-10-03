import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/server";
import { sanitizePatientImage } from "@/features/paciente-pwa/infrastructure/sanitize-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  operation: z.enum(["create", "update", "delete"]).default("create"),
  target_id: z.string().uuid().optional(), base_version: z.number().int().positive().optional(),
  client_entry_id: z.string().uuid(), patient_id: z.string().uuid(),
  refeicao: z.enum(["cafe", "lanche_manha", "almoco", "lanche_tarde", "jantar", "ceia", "outro"]),
  consumido_em: z.string().datetime(), descricao: z.string().max(2000).default(""),
  itens: z.array(z.object({ nome: z.string().trim().min(1).max(120), quantidade: z.string().trim().max(80) })).max(30),
  compartilhado_com_profissional: z.boolean().default(false),
});

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  const form = await request.formData();
  let body: unknown;
  try { body = JSON.parse(String(form.get("entry") ?? "{}")); } catch { return Response.json({ error: "invalid_entry" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_entry" }, { status: 400 });
  const entry = parsed.data;
  const { data: patient } = await supabase.from("paciente").select("id,clinica_id").eq("id", entry.patient_id).single();
  if (!patient) return Response.json({ error: "forbidden" }, { status: 404, headers: noStore });

  if (entry.operation !== "create") {
    if (!entry.target_id || !entry.base_version) return Response.json({ error: "invalid_entry" }, { status: 400 });
    const { data: current } = await supabase.from("patient_diary_entry").select("id,versao,foto_path")
      .eq("id", entry.target_id).eq("paciente_id", patient.id).maybeSingle();
    if (!current) return Response.json({ error: "not_found" }, { status: 404, headers: noStore });
    if (current.versao !== entry.base_version) return Response.json({ error: "conflict", current_version: current.versao }, { status: 409, headers: noStore });
    const updates = entry.operation === "delete" ? { excluido_em: new Date().toISOString() } : {
      refeicao: entry.refeicao, consumido_em: entry.consumido_em, descricao: entry.descricao,
      itens: entry.itens, compartilhado_com_profissional: entry.compartilhado_com_profissional,
    };
    const { data: changed, error: changeError } = await supabase.from("patient_diary_entry").update(updates)
      .eq("id", current.id).eq("paciente_id", patient.id).eq("versao", entry.base_version).select("id,versao").maybeSingle();
    if (changeError) return Response.json({ error: "save_failed" }, { status: 503, headers: noStore });
    if (!changed) {
      const { data: latest } = await supabase.from("patient_diary_entry").select("versao").eq("id", current.id).maybeSingle();
      return Response.json({ error: "conflict", current_version: latest?.versao ?? null }, { status: 409, headers: noStore });
    }
    if (entry.operation === "delete" && current.foto_path) await supabase.storage.from("patient-health-images").remove([current.foto_path]);
    return Response.json({ status: entry.operation === "delete" ? "deleted" : "updated", version: changed.versao }, { headers: noStore });
  }

  const { data: existing } = await supabase.from("patient_diary_entry").select("id,versao")
    .eq("paciente_id", patient.id).eq("client_entry_id", entry.client_entry_id).maybeSingle();
  if (existing) return Response.json({ status: "synced", id: existing.id, version: existing.versao }, { headers: noStore });

  const upload = form.get("photo");
  let photoPath: string | null = null;
  if (upload instanceof File && upload.size > 0) {
    const cleanPhoto = await sanitizePatientImage(upload);
    if (!cleanPhoto) return Response.json({ error: "invalid_photo" }, { status: 400, headers: noStore });
    const extension = cleanPhoto.type === "image/png" ? "png" : cleanPhoto.type === "image/webp" ? "webp" : "jpg";
    photoPath = patient.clinica_id + "/" + patient.id + "/" + userId + "/" + entry.client_entry_id + "." + extension;
    const { error: uploadError } = await supabase.storage.from("patient-health-images").upload(photoPath, cleanPhoto, { contentType: cleanPhoto.type, upsert: false });
    if (uploadError && !uploadError.message.toLowerCase().includes("already exists")) return Response.json({ error: "photo_upload_failed" }, { status: 503, headers: noStore });
  }
  const { data, error } = await supabase.from("patient_diary_entry").insert({
    clinica_id: patient.clinica_id, paciente_id: patient.id, registrado_por: userId,
    client_entry_id: entry.client_entry_id, refeicao: entry.refeicao, consumido_em: entry.consumido_em,
    descricao: entry.descricao, itens: entry.itens, compartilhado_com_profissional: entry.compartilhado_com_profissional,
    origem: photoPath ? "foto" : "manual", foto_path: photoPath,
  }).select("id,versao").single();
  if (error || !data) {
    if (photoPath) await supabase.storage.from("patient-health-images").remove([photoPath]);
    const { data: duplicate } = await supabase.from("patient_diary_entry").select("id,versao")
      .eq("paciente_id", patient.id).eq("client_entry_id", entry.client_entry_id).maybeSingle();
    if (duplicate) return Response.json({ status: "synced", id: duplicate.id, version: duplicate.versao }, { headers: noStore });
    return Response.json({ error: "save_failed" }, { status: 503, headers: noStore });
  }
  return Response.json({ status: "synced", id: data.id, version: data.versao }, { headers: noStore });
}
