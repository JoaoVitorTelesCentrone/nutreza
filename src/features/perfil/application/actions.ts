"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createManagementAdmin } from "@/features/gestao/infrastructure/admin-client";
import { requireStaff } from "@/features/pacientes/application/context";

function clean(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function saveBusinessProfile(formData: FormData) {
  const { profile, userId } = await requireStaff();
  const name = clean(formData.get("nome"), 120);
  const crn = clean(formData.get("crn"), 40);
  const clinicName = clean(formData.get("clinica_nome"), 120);

  if (name.length < 2 || (crn.length > 0 && crn.length < 3)) {
    redirect("/app/perfil?erro=campos");
  }
  if (profile.papel === "admin" && clinicName.length < 2) {
    redirect("/app/perfil?erro=campos");
  }

  const admin = createManagementAdmin();
  const { error: profileError } = await admin
    .from("perfil")
    .update({ nome: name, crn: crn || null })
    .eq("user_id", userId)
    .eq("clinica_id", profile.clinica_id);

  if (profileError) redirect("/app/perfil?erro=salvar");

  if (profile.papel === "admin") {
    const { error: clinicError } = await admin
      .from("clinica")
      .update({ nome: clinicName })
      .eq("id", profile.clinica_id);
    if (clinicError) redirect("/app/perfil?erro=salvar");
  }

  await admin.from("audit_log").insert({
    clinica_id: profile.clinica_id,
    ator_id: userId,
    acao: "update",
    entidade: "perfil",
    entidade_id: userId,
    campos_alterados: profile.papel === "admin" ? ["nome", "crn", "clinica_nome"] : ["nome", "crn"],
  });

  revalidatePath("/app/perfil");
  revalidatePath("/app");
  redirect("/app/perfil?salvo=1");
}
