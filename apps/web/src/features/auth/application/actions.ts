"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { clinicSchema, emailSchema, passwordSchema, signInSchema, signUpSchema } from "../domain/schemas";

function originFromHeaders(headerStore: Headers) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return new URL(configured).origin;
  const host = headerStore.get("host") ?? "localhost:3000";
  return `${process.env.NODE_ENV === "production" ? "https" : "http"}://${host}`;
}

export async function signIn(formData: FormData) {
  const input = signInSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) redirect("/entrar?erro=campos");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(input.data);
  if (error) redirect("/entrar?erro=credenciais");
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (userId) {
    const [{ data: profile }, { data: patientLink }] = await Promise.all([
      supabase.from("perfil").select("user_id").eq("user_id", userId).maybeSingle(),
      supabase.from("paciente_acesso").select("paciente_id").eq("user_id", userId).limit(1).maybeSingle(),
    ]);
    if (!profile && patientLink) redirect("/paciente");
  }
  redirect("/app");
}

export async function signUp(formData: FormData) {
  const input = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) redirect("/cadastro?erro=campos");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: input.data.email,
    password: input.data.password,
    options: {
      data: { nome: input.data.nome },
      emailRedirectTo: `${originFromHeaders(await headers())}/auth/confirm`,
    },
  });
  if (error) redirect("/cadastro?erro=indisponivel");
  redirect("/cadastro?enviado=1");
}

export async function signInWithGoogle() {
  if (process.env.GOOGLE_AUTH_ENABLED !== "true") redirect("/entrar?erro=google");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${originFromHeaders(await headers())}/auth/callback` },
  });
  if (error || !data.url) redirect("/entrar?erro=google");
  redirect(data.url);
}

export async function requestMagicLink(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) redirect("/entrar/link?erro=email");
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${originFromHeaders(await headers())}/auth/confirm`,
    },
  });
  redirect("/entrar/link?enviado=1");
}

export async function requestPasswordReset(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) redirect("/redefinir-senha?erro=email");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${originFromHeaders(await headers())}/auth/confirm`,
  });
  redirect("/redefinir-senha?enviado=1");
}

export async function updatePassword(formData: FormData) {
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) redirect("/redefinir-senha/nova?erro=senha");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/redefinir-senha?erro=expirado");
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) redirect("/redefinir-senha/nova?erro=indisponivel");
  redirect("/app");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

export async function createClinic(formData: FormData) {
  const input = clinicSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) redirect("/app/configurar?erro=campos");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/entrar");
  const { data: existing } = await supabase.from("perfil").select("user_id").eq("user_id", claims.sub).maybeSingle();
  if (existing) redirect("/app");
  let { data: clinic } = await supabase.from("clinica").select("id").eq("created_by", claims.sub).maybeSingle();
  if (!clinic) {
    const result = await supabase.from("clinica").insert({ nome: input.data.nome, created_by: claims.sub }).select("id").single();
    clinic = result.data;
  }
  if (!clinic) redirect("/app/configurar?erro=indisponivel");
  const { error } = await supabase.from("perfil").insert({
    user_id: claims.sub,
    clinica_id: clinic.id,
    nome: input.data.profissional,
    papel: "admin",
  });
  if (error) redirect("/app/configurar?erro=indisponivel");
  redirect("/app");
}
