import { supabase } from "@/lib/supabase";

export async function getCurrentPatient() {
  const { data: access, error } = await supabase.from("paciente_acesso")
    .select("paciente_id,clinica_id").limit(1).maybeSingle();
  if (error) throw error;
  if (!access) return null;
  const { data: patient, error: patientError } = await supabase.from("paciente")
    .select("id,clinica_id,nome,email,telefone").eq("id", access.paciente_id).maybeSingle();
  if (patientError) throw patientError;
  return patient;
}
