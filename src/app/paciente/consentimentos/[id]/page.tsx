import { notFound, redirect } from "next/navigation";
import { Brand } from "@/shared/ui/brand";
import { ConsentForm } from "@/features/paciente-pwa/ui/consent-form";
import { createClient } from "@/shared/lib/supabase/server";
import { PatientSignOutButton } from "@/features/paciente-pwa/ui/patient-sign-out";

export default async function PatientConsentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar");
  const { data: link } = await supabase.from("paciente_acesso").select("paciente_id").eq("paciente_id", id).eq("user_id", userId).maybeSingle();
  if (!link) notFound();
  const [{ data: patient }, { data: termRows }] = await Promise.all([
    supabase.from("paciente").select("nome").eq("id", id).single(),
    supabase.from("patient_consent_term").select("finalidade,versao,conteudo").eq("versao", "2026-10-02-v1"),
  ]);
  if (!patient) notFound();
  const terms = Object.fromEntries((termRows ?? []).map((row) => [row.finalidade, row.conteudo]));
  return <main className="page-wrap max-w-2xl py-10"><header className="flex items-center justify-between"><Brand/><PatientSignOutButton userId={userId} patientId={id}/></header><p className="mt-8 text-sm font-semibold text-primary">Privacidade e escolhas</p><h1 className="mt-2 text-3xl font-bold">Acompanhe seu plano com segurança</h1><p className="mt-3 text-muted">Olá, {patient.nome}. Escolha como deseja usar os recursos. As opções marcadas como opcionais podem ser alteradas depois no seu perfil.</p><ConsentForm patientId={id} terms={terms}/><p className="mt-5 text-xs leading-5 text-muted">Versão dos termos: 2026-10-02-v1. Esta tela registra suas escolhas e não substitui os termos e avisos de privacidade definitivos do consultório.</p></main>;
}
