"use client";

import { useState } from "react";
import { createPatientInvite, revokePatientInvite, setPatientPhotoAi } from "../application/actions";

type Invite = { id: string; email_normalizado: string; expires_at: string; accepted_at: string | null; revoked_at: string | null };

export function PatientInvitePanel({ patientId, email, invites, photoAiEnabled }: { patientId: string; email: string | null; invites: Invite[]; photoAiEnabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");

  async function invite() {
    setBusy(true); setMessage(""); setUrl("");
    const result = await createPatientInvite(patientId);
    setBusy(false);
    if (!result.ok) { setMessage(result.message); return; }
    if (result.sent) setMessage("Convite enviado. O link expira em 48 horas.");
    else { setUrl(result.inviteUrl); setMessage("Convite criado. Copie o link e envie ao paciente pelo canal combinado."); }
  }

  async function revoke(inviteId: string) {
    setBusy(true);
    const result = await revokePatientInvite(patientId, inviteId);
    setBusy(false);
    setMessage(result.ok ? "Convite revogado." : "Não foi possível revogar o convite.");
    if (result.ok) window.location.reload();
  }

  async function togglePhotoAi() {
    setBusy(true);
    const result = await setPatientPhotoAi(patientId, !photoAiEnabled);
    setBusy(false);
    setMessage(result.ok ? "Configuração da análise por foto atualizada." : "Não foi possível alterar a configuração.");
    if (result.ok) window.location.reload();
  }

  return <section className="card mt-5" aria-labelledby="patient-access-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="section-title" id="patient-access-title">Acesso do paciente</h2><p className="mt-1 text-sm text-muted">O convite é de uso único, vinculado ao e-mail cadastrado e expira em 48 horas.</p></div>
      <button className="action-primary" type="button" disabled={busy || !email} onClick={invite}>{busy ? "Processando…" : "Criar convite"}</button>
    </div>
    {!email && <p className="mt-3 text-sm text-danger">Cadastre um e-mail para criar o convite.</p>}
    <div className="mt-5 border-t border-line pt-4"><h3 className="font-semibold">Sugestões por foto</h3><p className="mt-1 text-sm text-muted">Quando habilitadas e autorizadas pelo paciente, fotos escolhidas para análise são enviadas ao provedor configurado.</p><button className="action-secondary mt-3" type="button" disabled={busy} onClick={togglePhotoAi}>{photoAiEnabled ? "Desativar para esta clínica" : "Ativar para esta clínica"}</button><p className="mt-1 text-xs text-muted">A chave geral do servidor também precisa estar habilitada.</p></div>
    {message && <p className="mt-3 text-sm" role="status">{message}</p>}
    {url && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input className="field" readOnly aria-label="Link do convite" value={url}/><button className="action-secondary" type="button" onClick={() => navigator.clipboard.writeText(url)}>Copiar link</button></div>}
    {invites.length > 0 && <ul className="mt-4 divide-y divide-line">{invites.slice(0, 5).map((inviteRow) => <li key={inviteRow.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <span>{inviteRow.email_normalizado} · {inviteRow.accepted_at ? "Ativado" : inviteRow.revoked_at ? "Revogado" : new Date(inviteRow.expires_at) <= new Date() ? "Expirado" : "Aguardando ativação"}</span>
      {!inviteRow.accepted_at && !inviteRow.revoked_at && new Date(inviteRow.expires_at) > new Date() && <button className="text-danger underline" type="button" disabled={busy} onClick={() => revoke(inviteRow.id)}>Revogar</button>}
    </li>)}</ul>}
  </section>;
}
