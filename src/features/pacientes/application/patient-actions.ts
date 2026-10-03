"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { patientSchema } from "../domain/schemas";
import { parsePatientCsv } from "../domain/csv";
import { requirePatient, requireStaff } from "./context";

export async function createPatient(formData: FormData) {
  const { supabase, profile, userId } = await requireStaff();
  const parsed = patientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/app/pacientes/novo?erro=campos");
  const { data, error } = await supabase.from("paciente").insert({
    clinica_id: profile.clinica_id,
    cadastrado_por: userId,
    nome: parsed.data.nome,
    nascimento: parsed.data.nascimento ?? null,
    sexo: parsed.data.sexo ?? null,
    email: parsed.data.email ?? null,
    telefone: parsed.data.telefone ?? null,
  }).select("id").single();
  if (error || !data) redirect("/app/pacientes/novo?erro=salvar");
  revalidatePath("/app/pacientes");
  redirect(`/app/pacientes/${data.id}`);
}

export async function updatePatient(patientId: string, formData: FormData) {
  const { supabase, patient } = await requirePatient(patientId);
  const parsed = patientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/app/pacientes/${patientId}?aba=dados&erro=campos`);
  const { error } = await supabase.from("paciente").update({
    nome: parsed.data.nome,
    nascimento: parsed.data.nascimento ?? null,
    sexo: parsed.data.sexo ?? null,
    email: parsed.data.email ?? null,
    telefone: parsed.data.telefone ?? null,
  }).eq("id", patient.id).eq("clinica_id", patient.clinica_id);
  if (error) redirect(`/app/pacientes/${patientId}?aba=dados&erro=salvar`);
  revalidatePath(`/app/pacientes/${patientId}`);
  revalidatePath("/app/pacientes");
  redirect(`/app/pacientes/${patientId}?aba=dados&salvo=1`);
}

export async function archivePatient(patientId: string) {
  const { supabase, patient } = await requirePatient(patientId);
  const { error } = await supabase.from("paciente")
    .update({ status: "arquivado" })
    .eq("id", patient.id).eq("clinica_id", patient.clinica_id);
  if (error) redirect(`/app/pacientes/${patientId}?aba=dados&erro=salvar`);
  revalidatePath("/app/pacientes");
  redirect("/app/pacientes");
}

export async function importPatients(formData: FormData) {
  const { supabase, profile, userId } = await requireStaff();
  const file = formData.get("arquivo");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv") || file.size > 512_000) {
    redirect("/app/pacientes/importar?erro=arquivo");
  }
  const csv = parsePatientCsv(await file.text());
  if (!csv.ok) redirect(`/app/pacientes/importar?erro=linha&numero=${csv.line}`);
  const rows = csv.patients.map((patient) => ({
    ...patient,
    nascimento: patient.nascimento ?? null,
    sexo: patient.sexo ?? null,
    email: patient.email ?? null,
    telefone: patient.telefone ?? null,
    clinica_id: profile.clinica_id,
    cadastrado_por: userId,
  }));
  const { error } = await supabase.from("paciente").insert(rows);
  if (error) redirect("/app/pacientes/importar?erro=salvar");
  revalidatePath("/app/pacientes");
  redirect(`/app/pacientes?importados=${rows.length}`);
}
