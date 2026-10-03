"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordPatientProgress } from "../application/actions";
import { normalizePatientPhoto } from "../infrastructure/offline-diary";

export function ProgressEntryForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(formData: FormData) {
    setBusy(true); setMessage("");
    const result = await recordPatientProgress(patientId, formData);
    setBusy(false);
    setMessage(result.ok ? "Progresso registrado." : result.message);
    if (result.ok) router.refresh();
  }
  return <form action={submit} className="card space-y-4"><div><h2 className="section-title">Registrar progresso</h2><p className="mt-1 text-sm text-muted">Essas medidas são autorrelatadas e aparecem separadas das avaliações feitas em consulta.</p></div>
    <div className="grid gap-4 sm:grid-cols-3"><div><label className="form-label" htmlFor="progress-date">Data</label><input className="field" id="progress-date" name="medida_em" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required/></div><div><label className="form-label" htmlFor="progress-weight">Peso (kg)</label><input className="field" id="progress-weight" name="peso_kg" type="number" min="0.1" max="500" step="0.1" inputMode="decimal"/></div><div><label className="form-label" htmlFor="progress-waist">Cintura (cm)</label><input className="field" id="progress-waist" name="cintura_cm" type="number" min="0.1" max="300" step="0.1" inputMode="decimal"/></div></div>
    <div><label className="form-label" htmlFor="progress-note">Observação (opcional)</label><textarea className="field min-h-20" id="progress-note" name="nota" maxLength={1000}/></div>
    {message && <p role="status" className="notice">{message}</p>}<button className="action-primary" disabled={busy}>{busy ? "Salvando…" : "Salvar medida"}</button>
  </form>;
}

export function ProgressPhotoForm({ patientId, shareAllowed }: { patientId: string; shareAllowed: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const photo = form.get("photo");
    if (!(photo instanceof File) || photo.size === 0) { setBusy(false); setMessage("Escolha uma foto."); return; }
    const compressed = await normalizePatientPhoto(photo);
    if (compressed.size > 5_000_000) { setBusy(false); setMessage("A foto precisa ter até 5 MB."); return; }
    const body = new FormData();
    body.set("patient_id", patientId); body.set("client_entry_id", crypto.randomUUID());
    body.set("tirada_em", String(form.get("tirada_em") ?? ""));
    body.set("compartilhada", shareAllowed && form.get("compartilhada") === "on" ? "true" : "false");
    body.set("photo", new File([compressed], "progresso.jpg", { type: compressed.type || "image/jpeg" }));
    const response = await fetch("/api/paciente/progresso/foto", { method: "POST", body, cache: "no-store" }).catch(() => null);
    setBusy(false);
    if (!response?.ok) { setMessage("Não foi possível salvar. Confira a conexão e tente novamente."); return; }
    setMessage(shareAllowed && form.get("compartilhada") === "on" ? "Foto registrada e compartilhada com sua nutricionista." : "Foto privada registrada."); event.currentTarget.reset(); router.refresh();
  }
  return <form onSubmit={submit} className="card space-y-4"><div><h2 className="section-title">Fotos de progresso</h2><p className="mt-1 text-sm text-muted">Suas fotos são privadas por padrão.</p></div>
    <div><label className="form-label" htmlFor="progress-photo">Escolher foto</label><input className="field" id="progress-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required/></div>
    <div><label className="form-label" htmlFor="progress-photo-date">Data</label><input className="field" id="progress-photo-date" name="tirada_em" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required/></div>
    {shareAllowed && <label className="flex items-start gap-3 text-sm"><input className="mt-1 size-5" type="checkbox" name="compartilhada"/><span>Compartilhar esta foto com minha nutricionista. Posso mudar isso depois.</span></label>}
    {message && <p className="notice" role="status">{message}</p>}<button className="action-primary" disabled={busy}>{busy ? "Enviando…" : "Salvar foto"}</button>
  </form>;
}
