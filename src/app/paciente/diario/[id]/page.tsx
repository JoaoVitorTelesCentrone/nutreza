import Link from "next/link";
import { PatientShell } from "@/features/paciente-pwa/ui/patient-shell";
import { DiaryComposer } from "@/features/paciente-pwa/ui/diary-composer";
import { DiaryEntryActions } from "@/features/paciente-pwa/ui/diary-entry-actions";
import { requirePatientAccount } from "@/features/paciente-pwa/application/access";
import { PatientSignOutButton } from "@/features/paciente-pwa/ui/patient-sign-out";

export const dynamic = "force-dynamic";

export default async function PatientDiaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, patient } = await requirePatientAccount(id);
  const [{ data: entries }, { data: consents }, { data: aiConfig }] = await Promise.all([
    supabase.from("patient_diary_entry").select("id,client_entry_id,versao,refeicao,consumido_em,descricao,itens,origem,foto_path,compartilhado_com_profissional").eq("paciente_id", id).is("excluido_em", null).order("consumido_em", { ascending: false }).limit(60),
    supabase.from("patient_consent_event").select("finalidade,aceito,created_at").eq("paciente_id", id).eq("user_id", userId).in("finalidade", ["diario_foto_ia", "compartilhar_fotos_diario"]).order("created_at", { ascending: false }),
    supabase.from("patient_pwa_config").select("photo_ai_enabled").eq("clinica_id", patient.clinica_id).maybeSingle(),
  ]);
  const latest = new Map<string, boolean>();
  for (const consent of consents ?? []) if (!latest.has(consent.finalidade)) latest.set(consent.finalidade, consent.aceito);
  const allowPhotoAi = latest.get("diario_foto_ia") === true && aiConfig?.photo_ai_enabled === true && process.env.PATIENT_PHOTO_AI_ENABLED === "true";
  const sharePhotos = latest.get("compartilhar_fotos_diario") === true;
  return <PatientShell patientId={id} patientName={patient.nome}><main className="page-wrap max-w-3xl py-8"><header className="flex items-center justify-between"><div><Link className="quiet-link" href="/paciente">← Início</Link><p className="mt-4 text-sm font-semibold text-primary">Diário de {patient.nome}</p><h1 className="mt-1 text-3xl font-bold">Suas refeições</h1></div><PatientSignOutButton userId={userId} patientId={id}/></header>
    <DiaryComposer patientId={id} userId={userId} sharePhotos={sharePhotos} allowPhotoAi={allowPhotoAi}/>
    <section className="mt-6 card"><h2 className="section-title">Registros recentes</h2>{entries?.length ? <ol className="mt-3 divide-y divide-line">{entries.map((entry) => <li key={entry.id} className="py-4"><p className="font-semibold">{new Date(entry.consumido_em).toLocaleString("pt-BR")} · {entry.refeicao.replaceAll("_", " ")}</p><p className="mt-1">{(entry.itens as { nome?: string; quantidade?: string }[]).map((item) => (item.nome ?? "Alimento") + (item.quantidade ? " · " + item.quantidade : "")).join(" / ") || entry.descricao || "Registro sem descrição"}</p>{entry.foto_path && <p className="mt-1 text-sm text-muted">{entry.compartilhado_com_profissional ? "Foto compartilhada com a nutricionista" : "Foto privada"}</p>}{entry.descricao && <p className="mt-1 text-sm text-muted">{entry.descricao}</p>}<DiaryEntryActions patientId={id} entry={{id: entry.id, client_entry_id: entry.client_entry_id, versao: entry.versao, refeicao: entry.refeicao, consumido_em: entry.consumido_em, descricao: entry.descricao, itens: entry.itens as {nome?: string; quantidade?: string}[], compartilhado_com_profissional: entry.compartilhado_com_profissional}}/></li>)}</ol> : <p className="empty">Seus registros aparecerão aqui.</p>}</section>
  </main></PatientShell>;
}
