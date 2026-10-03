"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/features/pacientes/application/context";
import { createManagementAdmin } from "../infrastructure/admin-client";
import { withManagementTables } from "../infrastructure/database.types";
import { canChangeToPlan } from "../domain/plans";
import { createClient } from "@/shared/lib/supabase/server";

const clean = (value: FormDataEntryValue | null, max: number) => String(value ?? "").trim().slice(0, max);

export async function changeSaasPlan(formData: FormData) {
  const { profile } = await requireStaff();
  if (profile.papel !== "admin") redirect("/app/gestao?erro=permissao");
  const slug = clean(formData.get("plan"), 40);
  const admin = createManagementAdmin();
  const [{ data: plan }, { data: usage }, { data: subscription }] = await Promise.all([
    admin.from("saas_plano").select("id,slug,limite_pacientes,limite_membros,limite_teca_mes").eq("slug", slug).eq("ativo", true).maybeSingle(),
    admin.rpc("saas_usage_snapshot", { p_clinica_id: profile.clinica_id }),
    admin.from("saas_assinatura").select("id,plano_id").eq("clinica_id", profile.clinica_id).single(),
  ]);
  if (!plan || !subscription || !usage) redirect("/app/gestao?erro=plano");
  const check = canChangeToPlan(
    { pacientes: usage.pacientes, membros: usage.membros, teca: usage.teca_mes },
    { pacientes: plan.limite_pacientes, membros: plan.limite_membros, teca: plan.limite_teca_mes },
  );
  if (!check.allowed) redirect(`/app/gestao?erro=limite&itens=${encodeURIComponent(check.blockers.join(", "))}`);
  if ((process.env.SAAS_BILLING_MODE ?? "simulated") !== "simulated") redirect("/app/gestao?erro=checkout");
  const now = new Date();
  const { error } = await admin.from("saas_assinatura").update({ plano_id: plan.id, status: "ativa", provedor: "simulado",
    periodo_inicio: now.toISOString(), periodo_fim: new Date(now.getTime() + 30 * 86_400_000).toISOString(), updated_at: now.toISOString() })
    .eq("id", subscription.id).eq("clinica_id", profile.clinica_id);
  if (error) redirect("/app/gestao?erro=checkout");
  const eventId = `manual:${profile.clinica_id}:${randomUUID()}`;
  await admin.from("saas_evento_cobranca").insert({ clinica_id: profile.clinica_id, assinatura_id: subscription.id,
    provedor: "simulado", evento_provedor_id: eventId, tipo: "plan.changed", estado: "processado",
    payload_hash: createHash("sha256").update(`${subscription.plano_id}:${plan.id}`).digest("hex") });
  revalidatePath("/app/gestao");
  redirect("/app/gestao?salvo=plano");
}

export async function inviteTeamMember(formData: FormData) {
  const { profile, userId } = await requireStaff();
  if (profile.papel !== "admin") redirect("/app/equipe?erro=permissao");
  const email = clean(formData.get("email"), 254).toLowerCase();
  const name = clean(formData.get("name"), 120);
  const role = clean(formData.get("role"), 30);
  if (!/^\S+@\S+\.\S+$/.test(email) || name.length < 2 || !["profissional","recepcao"].includes(role)) redirect("/app/equipe?erro=campos");
  const admin = createManagementAdmin();
  const rawToken = randomBytes(32).toString("hex");
  const { data: invite, error } = await admin.from("equipe_convite").insert({ clinica_id: profile.clinica_id, email, nome: name,
    papel: role, token_hash: createHash("sha256").update(rawToken).digest("hex"), criado_por: userId,
    expira_em: new Date(Date.now() + 72 * 60 * 60_000).toISOString() }).select("id").single();
  if (error || !invite) redirect("/app/equipe?erro=convite");
  const headerStore = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${process.env.NODE_ENV === "production" ? "https" : "http"}://${headerStore.get("host") ?? "localhost:3000"}`;
  const redirectTo = `${origin}/auth/confirm?next=${encodeURIComponent(`/convite-equipe/${invite.id}`)}`;
  const result = await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { nome: name } });
  if (result.error) {
    await admin.from("equipe_convite").update({ revogado_em: new Date().toISOString() }).eq("id", invite.id);
    redirect("/app/equipe?erro=email");
  }
  revalidatePath("/app/equipe");
  redirect("/app/equipe?salvo=convite");
}

export async function acceptTeamInvite(inviteId: string) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const email = user.user?.email?.toLowerCase();
  const userId = user.user?.id;
  if (!email || !userId) redirect("/entrar?erro=convite");
  const admin = createManagementAdmin();
  const { data: invite } = await admin.from("equipe_convite").select("*").eq("id", inviteId).eq("email", email)
    .is("aceito_em", null).is("revogado_em", null).gt("expira_em", new Date().toISOString()).maybeSingle();
  if (!invite) redirect("/entrar?erro=convite");
  const { error } = await admin.from("perfil").insert({ user_id: userId, clinica_id: invite.clinica_id, nome: invite.nome, papel: invite.papel });
  if (error) redirect(`/convite-equipe/${inviteId}?erro=limite`);
  await admin.from("equipe_convite").update({ aceito_em: new Date().toISOString() }).eq("id", invite.id).is("aceito_em", null);
  redirect("/app");
}

export async function saveLibraryItem(formData: FormData) {
  const { supabase, profile, userId } = await requireStaff();
  if (!["admin","profissional"].includes(profile.papel)) redirect("/app/biblioteca?erro=permissao");
  const db = withManagementTables(supabase);
  const title = clean(formData.get("title"), 160), content = clean(formData.get("content"), 20000);
  const category = clean(formData.get("category"), 40), published = formData.get("published") === "on";
  if (title.length < 2 || content.length < 10 || !["orientacao","receita","material","resposta_aprovada"].includes(category)) redirect("/app/biblioteca?erro=campos");
  const { error } = await db.from("biblioteca_item").insert({ clinica_id: profile.clinica_id, titulo: title, conteudo: content,
    categoria: category, status: published ? "publicado" : "rascunho", criado_por: userId,
    publicado_por: published ? userId : null, publicado_em: published ? new Date().toISOString() : null });
  if (error) redirect("/app/biblioteca?erro=salvar");
  revalidatePath("/app/biblioteca");
  redirect("/app/biblioteca?salvo=1");
}

export async function createSupportTicket(formData: FormData) {
  const { supabase, profile, userId } = await requireStaff();
  const db = withManagementTables(supabase);
  const subject = clean(formData.get("subject"), 160), description = clean(formData.get("description"), 5000);
  const priority = clean(formData.get("priority"), 20);
  if (subject.length < 4 || description.length < 10 || !["baixa","normal","alta","critica"].includes(priority)) redirect("/app/suporte?erro=campos");
  const { error } = await db.from("suporte_ticket").insert({ clinica_id: profile.clinica_id, aberto_por: userId,
    assunto: subject, descricao: description, prioridade: priority });
  if (error) redirect("/app/suporte?erro=salvar");
  revalidatePath("/app/suporte");
  redirect("/app/suporte?salvo=1");
}
