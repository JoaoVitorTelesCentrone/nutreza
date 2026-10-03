"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { allergySchema, anamnesisSchema, evolutionSchema, measurementSchema, nextVersion } from "../domain/schemas";
import { canAccessClinical, clinicalPath, requirePatient } from "./context";

async function clinician(patientId: string) {
  const context = await requirePatient(patientId);
  if (!canAccessClinical(context.profile.papel)) redirect(`/app/pacientes/${patientId}`);
  return context;
}

function done(patientId: string, tab: string, error?: string): never {
  revalidatePath(`/app/pacientes/${patientId}`);
  redirect(error ? clinicalPath(patientId, tab, error) : `/app/pacientes/${patientId}?aba=${tab}&salvo=1`);
}

export async function addAllergy(patientId: string, formData: FormData) {
  const { supabase, patient, userId } = await clinician(patientId);
  const parsed = allergySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) done(patientId, "alergias", "campos");
  const { error } = await supabase.from("alergia").insert({
    ...parsed.data, observacao: parsed.data.observacao ?? null,
    paciente_id: patient.id, clinica_id: patient.clinica_id, registrado_por: userId,
  });
  done(patientId, "alergias", error ? "salvar" : undefined);
}

export async function archiveAllergy(patientId: string, allergyId: string) {
  const { supabase, patient } = await clinician(patientId);
  const { data, error } = await supabase.from("alergia").update({ ativo: false })
    .eq("id", allergyId).eq("paciente_id", patient.id).eq("clinica_id", patient.clinica_id).select("id").single();
  done(patientId, "alergias", error || !data ? "salvar" : undefined);
}

export async function saveAnamnesis(patientId: string, formData: FormData) {
  const { supabase, patient, userId } = await clinician(patientId);
  const parsed = anamnesisSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) done(patientId, "anamnese", "campos");
  const { data: previous } = await supabase.from("anamnese").select("versao")
    .eq("paciente_id", patient.id).order("versao", { ascending: false }).limit(1);
  const { error } = await supabase.from("anamnese").insert({
    clinica_id: patient.clinica_id, paciente_id: patient.id, registrado_por: userId,
    versao: nextVersion((previous ?? []).map((row) => row.versao)), dados: parsed.data,
  });
  done(patientId, "anamnese", error ? "salvar" : undefined);
}

export async function addMeasurement(patientId: string, formData: FormData) {
  const { supabase, patient, userId } = await clinician(patientId);
  const parsed = measurementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) done(patientId, "medidas", "campos");
  const { error } = await supabase.from("antropometria").insert({
    ...parsed.data, observacao: parsed.data.observacao ?? null,
    paciente_id: patient.id, clinica_id: patient.clinica_id, registrado_por: userId,
  });
  done(patientId, "medidas", error ? "salvar" : undefined);
}

export async function saveEvolution(patientId: string, formData: FormData) {
  const { supabase, patient, userId } = await clinician(patientId);
  const parsed = evolutionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) done(patientId, "evolucoes", "campos");
  const seriesId = formData.get("serie_id");
  let version = 1;
  let validSeries: string | undefined;
  if (typeof seriesId === "string" && /^[0-9a-f-]{36}$/i.test(seriesId)) {
    const { data: previous } = await supabase.from("evolucao").select("versao")
      .eq("paciente_id", patient.id).eq("serie_id", seriesId)
      .order("versao", { ascending: false }).limit(1);
    if (!previous?.length) done(patientId, "evolucoes", "campos");
    validSeries = seriesId;
    version = nextVersion(previous.map((row) => row.versao));
  }
  const { error } = await supabase.from("evolucao").insert({
    clinica_id: patient.clinica_id, paciente_id: patient.id, registrado_por: userId,
    ...(validSeries ? { serie_id: validSeries } : {}), versao: version,
    consulta_em: parsed.data.consulta_em, queixa: parsed.data.queixa ?? "",
    avaliacao: parsed.data.avaliacao ?? "", conduta: parsed.data.conduta ?? "",
  });
  done(patientId, "evolucoes", error ? "salvar" : undefined);
}

export async function uploadDocument(patientId: string, formData: FormData) {
  const { supabase, patient, userId } = await clinician(patientId);
  const file = formData.get("arquivo");
  if (!(file instanceof File) || !file.size || file.size > 10_485_760 ||
      !["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
    done(patientId, "documentos", "arquivo");
  }
  const id = crypto.randomUUID();
  const path = `${patient.clinica_id}/${patient.id}/${id}`;
  const { error: metadataError } = await supabase.from("documento").insert({
    id, clinica_id: patient.clinica_id, paciente_id: patient.id, storage_path: path,
    nome_original: file.name.slice(0, 180), mime_type: file.type,
    tamanho_bytes: file.size, enviado_por: userId,
  });
  if (metadataError) done(patientId, "documentos", "salvar");
  const { error: storageError } = await supabase.storage.from("prontuarios")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (storageError) done(patientId, "documentos", "upload");
  const { error: statusError } = await supabase.from("documento").update({ status: "pronto" })
    .eq("id", id).eq("paciente_id", patient.id);
  done(patientId, "documentos", statusError ? "salvar" : undefined);
}

export async function archiveDocument(patientId: string, documentId: string) {
  const { supabase, patient } = await clinician(patientId);
  const { data, error } = await supabase.from("documento").update({ status: "arquivado" })
    .eq("id", documentId).eq("paciente_id", patient.id).select("id").single();
  done(patientId, "documentos", error || !data ? "salvar" : undefined);
}
