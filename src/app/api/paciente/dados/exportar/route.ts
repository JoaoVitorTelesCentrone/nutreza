import { createClient } from "@/shared/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { data: links } = await supabase.from("paciente_acesso").select("paciente_id").eq("user_id", userId);
  const ids = (links ?? []).map((link) => link.paciente_id);
  if (!ids.length) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  const [patients, diary, progress, photos, consents, plans, dataRequests] = await Promise.all([
    supabase.from("paciente").select("id,nome,nascimento,email,telefone").in("id", ids),
    supabase.from("patient_diary_entry").select("paciente_id,refeicao,consumido_em,descricao,itens,origem,created_at").in("paciente_id", ids).is("excluido_em", null).order("consumido_em", { ascending: false }),
    supabase.from("patient_progress").select("paciente_id,medida_em,peso_kg,cintura_cm,nota,created_at").in("paciente_id", ids).order("medida_em", { ascending: false }),
    supabase.from("patient_progress_photo").select("paciente_id,foto_path,tirada_em,compartilhado_com_profissional").in("paciente_id", ids).order("tirada_em", { ascending: false }),
    supabase.from("patient_consent_event").select("paciente_id,finalidade,versao_termo,aceito,created_at").in("paciente_id", ids).eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("plano_alimentar").select("id,paciente_id,titulo,objetivo,versao,aprovado_em,status").in("paciente_id", ids).eq("status", "aprovado"),
    supabase.from("patient_data_request").select("paciente_id,tipo,observacao,status,created_at").in("paciente_id", ids).order("created_at", { ascending: false }),
  ]);
  const planIds = (plans.data ?? []).map((plan) => plan.id);
  const [{ data: meals }, { data: items }] = planIds.length ? await Promise.all([
    supabase.from("plano_refeicao").select("id,plano_id,nome,horario,ordem").in("plano_id", planIds).order("ordem"),
    supabase.from("plano_item").select("id,plano_id,refeicao_id,substitui_item_id,ordem,gramas,nome_snapshot,nutrientes_snapshot,observacao").in("plano_id", planIds).order("ordem"),
  ]) : [{ data: [] }, { data: [] }];
  const photoExport = await Promise.all((photos.data ?? []).map(async (photo) => {
    const { data } = await supabase.storage.from("patient-health-images").createSignedUrl(photo.foto_path, 300);
    return { paciente_id: photo.paciente_id, tirada_em: photo.tirada_em, compartilhado_com_profissional: photo.compartilhado_com_profissional, download_temporario: data?.signedUrl ?? null };
  }));
  const payload = { exportado_em: new Date().toISOString(), pacientes: patients.data ?? [], diario: diary.data ?? [], progresso: progress.data ?? [], fotos_progresso: photoExport, consentimentos: consents.data ?? [], solicitacoes_de_dados: dataRequests.data ?? [], planos_aprovados: plans.data ?? [], refeicoes_dos_planos: meals ?? [], itens_dos_planos: items ?? [] };
  return new Response(JSON.stringify(payload, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": "attachment; filename=\"nutreza-meus-dados.json\"", "Cache-Control": "private, no-store" } });
}
