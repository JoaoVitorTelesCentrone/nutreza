import { notFound, redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";

export async function requirePatientAccount(patientId: string, checkConsent = true) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(patientId)) notFound();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar");
  const { data: link } = await supabase.from("paciente_acesso").select("paciente_id")
    .eq("paciente_id", patientId).eq("user_id", userId).maybeSingle();
  if (!link) notFound();
  const { data: patient } = await supabase.from("paciente").select("id,nome,clinica_id,email")
    .eq("id", patientId).single();
  if (!patient) notFound();
  if (checkConsent) {
    const { data: consent, error } = await supabase.from("patient_consent_event").select("aceito")
      .eq("paciente_id", patientId).eq("user_id", userId).eq("finalidade", "uso_area_paciente")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error || !consent?.aceito) redirect(`/paciente/consentimentos/${patientId}`);
  }
  return { supabase, userId, patient };
}

export async function requireAnyPatientAccount(checkConsent = true) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar");
  const { data: links } = await supabase.from("paciente_acesso").select("paciente_id").eq("user_id", userId);
  if (!links?.length) return { supabase, userId, links: [] as { paciente_id: string }[] };
  if (checkConsent) {
    const { data: consent } = await supabase.from("patient_consent_event").select("aceito")
      .eq("paciente_id", links[0].paciente_id).eq("user_id", userId).eq("finalidade", "uso_area_paciente")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!consent?.aceito) redirect(`/paciente/consentimentos/${links[0].paciente_id}`);
  }
  return { supabase, userId, links };
}
