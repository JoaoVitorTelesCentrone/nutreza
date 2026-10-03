import { notFound, redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";

export async function requireStaff() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/entrar");
  const { data: profile, error } = await supabase
    .from("perfil")
    .select("user_id, clinica_id, nome, papel")
    .eq("user_id", userId)
    .single();
  if (error || !profile) redirect("/app/configurar");
  return { supabase, profile, userId };
}

export async function requirePatient(patientId: string) {
  const context = await requireStaff();
  const { data: patient, error } = await context.supabase
    .from("paciente")
    .select("*")
    .eq("id", patientId)
    .eq("clinica_id", context.profile.clinica_id)
    .single();
  if (error || !patient) notFound();
  return { ...context, patient };
}

export function canAccessClinical(role: string) {
  return role === "admin" || role === "profissional";
}

export function clinicalPath(patientId: string, tab: string, message?: string) {
  const query = new URLSearchParams({ aba: tab });
  if (message) query.set("erro", message);
  return `/app/pacientes/${patientId}?${query.toString()}`;
}
