"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { acceptPatientInvite, registerPatientAccount, signInAndAcceptPatientInvite } from "../application/actions";

export function ActivationClient() {
  const router = useRouter();
  const token = useSyncExternalStore(
    (onChange) => { window.addEventListener("hashchange", onChange); return () => window.removeEventListener("hashchange", onChange); },
    () => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "",
    () => "",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function register(formData: FormData) {
    setBusy(true); setMessage("");
    const result = await registerPatientAccount(token, formData);
    setBusy(false);
    if (!result.ok) { setMessage(result.message); return; }
    if (result.redirect) { router.replace(result.redirect); return; }
    setMessage("Enviamos um link de confirmação para seu e-mail. Depois de confirmar, você voltará para concluir a ativação.");
  }

  async function signIn(formData: FormData) {
    setBusy(true); setMessage("");
    const result = await signInAndAcceptPatientInvite(token, formData);
    setBusy(false);
    if (!result.ok) { setMessage(result.message); return; }
    router.replace(result.redirect);
  }

  async function accept() {
    setBusy(true); setMessage("");
    const result = await acceptPatientInvite(token);
    setBusy(false);
    if (!result.ok) { setMessage(result.message); return; }
    router.replace(result.redirect);
  }

  if (!token) return <p className="notice-error mt-5" role="alert">O link está incompleto. Peça ao consultório para enviar um novo convite.</p>;
  return <div className="mt-6 space-y-5">
    <section className="card"><h2 className="section-title">Criar sua conta</h2><p className="mt-2 text-sm text-muted">Use o mesmo e-mail que recebeu o convite. A confirmação do e-mail protege o vínculo com seu cadastro.</p>
      <form action={register} className="mt-4 space-y-4"><div><label className="form-label" htmlFor="invite-email">E-mail do convite</label><input className="field" id="invite-email" name="email" type="email" autoComplete="email" required/></div><div><label className="form-label" htmlFor="invite-password">Crie uma senha</label><input className="field" id="invite-password" name="password" type="password" minLength={12} autoComplete="new-password" required/><p className="mt-1 text-xs text-muted">Use pelo menos 12 caracteres.</p></div><button className="action-primary" disabled={busy}>{busy ? "Aguarde…" : "Criar conta e continuar"}</button></form>
    </section>
    <details className="card"><summary className="cursor-pointer font-semibold">Já tenho uma conta</summary><form action={signIn} className="mt-4 space-y-4"><div><label className="form-label" htmlFor="existing-email">E-mail</label><input className="field" id="existing-email" name="email" type="email" autoComplete="email" required/></div><div><label className="form-label" htmlFor="existing-password">Senha</label><input className="field" id="existing-password" name="password" type="password" autoComplete="current-password" required/></div><button className="action-secondary" disabled={busy}>Entrar e ativar convite</button></form></details>
    <button type="button" className="quiet-link" disabled={busy} onClick={accept}>Já confirmei meu e-mail · concluir ativação</button>
    {message && <p role="status" className="notice mt-3">{message}</p>}
  </div>;
}
