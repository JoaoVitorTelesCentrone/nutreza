"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { enqueue, listPending, normalizePatientPhoto, removePending, type PendingDiary } from "../infrastructure/offline-diary";

const mealOptions = [["cafe", "Café da manhã"], ["lanche_manha", "Lanche da manhã"], ["almoco", "Almoço"], ["lanche_tarde", "Lanche da tarde"], ["jantar", "Jantar"], ["ceia", "Ceia"], ["outro", "Outro"]] as const;

async function sendPending(entry: PendingDiary) {
  const form = new FormData();
  form.set("entry", JSON.stringify({
    client_entry_id: entry.id, patient_id: entry.patientId, refeicao: entry.refeicao,
    consumido_em: entry.consumidoEm, descricao: entry.descricao, itens: entry.itens,
    compartilhado_com_profissional: entry.compartilhado, origem: entry.foto ? "foto" : "manual",
  }));
  if (entry.foto) form.set("photo", new File([entry.foto], "refeicao.jpg", { type: entry.mime ?? "image/jpeg" }));
  const response = await fetch("/api/paciente/diario/sync", { method: "POST", body: form, cache: "no-store" });
  return response.ok;
}

export function DiaryComposer({ patientId, userId, sharePhotos, allowPhotoAi }: { patientId: string; userId: string; sharePhotos: boolean; allowPhotoAi: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingDiary[]>([]);
  const [itemsText, setItemsText] = useState("");
  const [suggestions, setSuggestions] = useState<{ nome: string; porcao: string; confianca: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [online, setOnline] = useState(true);

  const refreshPending = useCallback(async () => {
    try { setPending(await listPending(userId, patientId)); } catch { setMessage("O armazenamento local não está disponível neste aparelho."); }
  }, [patientId, userId]);

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    const rows = await listPending(userId, patientId).catch(() => []);
    let failed = false;
    for (const row of rows) {
      const ok = await sendPending(row).catch(() => false);
      if (!ok) { failed = true; break; }
      await removePending(row.id);
    }
    await refreshPending();
    if (rows.length && failed) setMessage("Alguns registros ainda aguardam conexão ou revisão.");
    else if (rows.length) { setMessage("Sincronização concluída."); router.refresh(); }
  }, [patientId, refreshPending, router, userId]);

  useEffect(() => {
    let active = true;
    void listPending(userId, patientId).then((rows) => {
      if (active) setPending(rows);
      if (active && navigator.onLine && rows.length) void syncQueue();
    }).catch(() => { if (active) setMessage("O armazenamento local não está disponível neste aparelho."); });
    const onOnline = () => { setOnline(true); setMessage("Conexão restabelecida. Enviando registros…"); void syncQueue(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline);
    return () => { active = false; window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [patientId, userId, syncQueue]);

  async function analyzePhoto() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setMessage("Escolha uma foto antes de pedir sugestões."); return; }
    setBusy(true); setMessage("Analisando a foto… confira e corrija as sugestões antes de registrar.");
    const normalized = await normalizePatientPhoto(file);
    const form = new FormData(); form.set("patient_id", patientId); form.set("photo", new File([normalized], "refeicao.jpg", { type: normalized.type || "image/jpeg" }));
    const response = await fetch("/api/paciente/foto/analisar", { method: "POST", body: form, cache: "no-store" }).catch(() => null);
    const body = response?.ok ? await response.json().catch(() => null) as { suggestions?: { nome: string; porcao: string; confianca: string }[] } | null : null;
    setBusy(false);
    if (!body?.suggestions) { setMessage("Não foi possível reconhecer a refeição. Registre os itens manualmente."); return; }
    setSuggestions(body.suggestions);
    setItemsText(body.suggestions.map((item) => item.nome + (item.porcao ? " — " + item.porcao : "")).join("\n"));
    setMessage(body.suggestions.length ? "Sugestões preenchidas. Edite cada item e confirme para registrar." : "Não reconhecemos os alimentos. Você pode registrar manualmente.");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const file = fileRef.current?.files?.[0];
    let photo: Blob | undefined;
    try { if (file) photo = await normalizePatientPhoto(file); } catch { setBusy(false); setMessage("Não foi possível ler a foto; tente escolher outra ou continue sem foto."); return; }
    const items = itemsText.split("\n").map((value) => value.trim()).filter(Boolean).map((value) => {
      const [nome, quantidade = ""] = value.split("—", 2);
      return { nome: nome.trim().slice(0, 120), quantidade: quantidade.trim().slice(0, 80) };
    });
    const entry: PendingDiary = {
      id: crypto.randomUUID(), patientId, userId,
      refeicao: String(data.get("refeicao") ?? "outro"),
      consumidoEm: new Date(String(data.get("consumido_em") ?? new Date().toISOString())).toISOString(),
      descricao: String(data.get("descricao") ?? "").slice(0, 2000), itens: items,
      compartilhado: Boolean(photo && sharePhotos && data.get("compartilhar") === "on"),
      foto: photo, mime: photo?.type || "image/jpeg", createdAt: Date.now(),
    };
    try { await enqueue(entry); } catch { setBusy(false); setMessage("Não foi possível guardar este registro neste aparelho. Tente novamente com conexão."); return; }
    await refreshPending();
    if (navigator.onLine && await sendPending(entry).catch(() => false)) {
      await removePending(entry.id); await refreshPending(); setMessage("Registro salvo."); router.refresh();
    } else setMessage("Registro guardado neste aparelho e aguardando sincronização.");
    formRef.current?.reset(); setItemsText(""); setSuggestions([]); setBusy(false);
  }

  return <div className="space-y-5">
    <form ref={formRef} onSubmit={submit} className="card space-y-4">
      <h2 className="section-title">Registrar refeição</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="form-label" htmlFor="refeicao">Refeição</label><select className="field" id="refeicao" name="refeicao">{mealOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div><label className="form-label" htmlFor="consumido_em">Data e horário</label><input className="field" type="datetime-local" id="consumido_em" name="consumido_em" onFocus={(event) => { if (!event.currentTarget.value) event.currentTarget.value = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }} required/></div>
      </div>
      <div><label className="form-label" htmlFor="itens">Alimentos e porções</label><textarea className="field min-h-28" id="itens" value={itemsText} onChange={(event) => setItemsText(event.target.value)} placeholder={"Um item por linha, por exemplo:\nArroz — 3 colheres"} /><p className="mt-1 text-xs text-muted">Você pode editar as sugestões antes de salvar. O diário registra seu relato.</p></div>
      {suggestions.length > 0 && <ul className="rounded-xl bg-cream p-3 text-sm">{suggestions.map((item, index) => <li key={index}>{item.nome} · {item.porcao || "porção não identificada"} · confiança {item.confianca}</li>)}</ul>}
      <div><label className="form-label" htmlFor="descricao">Observação (opcional)</label><textarea className="field min-h-20" id="descricao" name="descricao" maxLength={2000}/></div>
      <div><label className="form-label" htmlFor="foto">Foto da refeição (opcional)</label><input ref={fileRef} className="field" id="foto" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"/><p className="mt-1 text-xs text-muted">A foto fica privada. Tamanho máximo após redução: 5 MB.</p></div>
      {allowPhotoAi && <button type="button" className="action-secondary" disabled={busy} onClick={analyzePhoto}>Sugerir alimentos pela foto</button>}
      {sharePhotos && <label className="flex items-start gap-3 text-sm"><input className="mt-1 size-5" type="checkbox" name="compartilhar"/><span>Compartilhar esta foto com minha nutricionista.</span></label>}
      {message && <p className="notice" role="status">{message}</p>}
      <button className="action-primary" disabled={busy}>{busy ? "Salvando…" : "Confirmar e registrar"}</button>
    </form>
    {pending.length > 0 && <section className="card"><h2 className="section-title">Aguardando sincronização</h2><ul className="mt-3 space-y-2">{pending.map((row) => <li key={row.id} className="rounded-lg bg-cream p-3 text-sm">{new Date(row.consumidoEm).toLocaleString("pt-BR")} · {row.refeicao.replaceAll("_", " ")} · neste aparelho</li>)}</ul>{online && <button type="button" className="action-secondary mt-4" onClick={() => void syncQueue()}>Sincronizar agora</button>}</section>}
  </div>;
}
