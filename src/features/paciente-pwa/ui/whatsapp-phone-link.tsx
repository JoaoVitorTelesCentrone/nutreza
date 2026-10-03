"use client";

import { useState } from "react";
import { createWhatsAppPhoneChallenge } from "@/features/comunicacao/application/actions";

export function WhatsAppPhoneLink({ patientId, verifiedPhone }: { patientId: string; verifiedPhone?: string | null }) {
  const [challenge, setChallenge] = useState<{ code: string; link: string; expiresInMinutes: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function generate() {
    setBusy(true); setError("");
    const result = await createWhatsAppPhoneChallenge(patientId);
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setChallenge(result);
  }
  return <section className="card mt-5"><h2 className="section-title">WhatsApp</h2>{verifiedPhone ? <p className="mt-2 text-sm">Número confirmado: <strong>{verifiedPhone}</strong></p> : <p className="mt-2 text-sm text-muted">Vincule seu número enviando um código único ao WhatsApp do consultório. O código vence em 10 minutos e não ativa mensagens; você ainda escolhe cada finalidade separadamente.</p>}
    <button className="action-secondary mt-4" type="button" onClick={generate} disabled={busy}>{busy ? "Gerando código…" : verifiedPhone ? "Trocar número vinculado" : "Vincular meu WhatsApp"}</button>
    {error && <p className="notice-error mt-3" role="alert">{error}</p>}
    {challenge && <div className="notice mt-4"><p>Abra o WhatsApp e envie esta mensagem ao consultório antes de {challenge.expiresInMinutes} minutos:</p><code className="mt-2 block font-bold">VINCULAR {challenge.code}</code><a className="action-primary mt-3" href={challenge.link} target="_blank" rel="noreferrer">Abrir WhatsApp</a><p className="mt-3 text-xs">Após enviar, atualize esta página para conferir a confirmação. Este código não autoriza mensagens de acompanhamento.</p></div>}
  </section>;
}
