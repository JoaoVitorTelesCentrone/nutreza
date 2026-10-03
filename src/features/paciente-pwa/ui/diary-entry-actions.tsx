"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DiaryEntry = {
  id: string; client_entry_id: string; versao: number; refeicao: string; consumido_em: string;
  descricao: string; itens: { nome?: string; quantidade?: string }[]; compartilhado_com_profissional: boolean;
};

export function DiaryEntryActions({ patientId, entry }: { patientId: string; entry: DiaryEntry }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function mutate(operation: "update" | "delete", values?: FormData) {
    setBusy(true); setMessage("");
    const itemsText = String(values?.get("itens") ?? entry.itens.map((item) => (item.nome ?? "") + (item.quantidade ? " — " + item.quantidade : "")).join("\n"));
    const items = itemsText.split("\n").map((value) => value.trim()).filter(Boolean).map((value) => { const parts = value.split("—", 2); return { nome: parts[0].trim(), quantidade: (parts[1] ?? "").trim() }; });
    const localDate = String(values?.get("consumido_em") ?? new Date(new Date(entry.consumido_em).getTime() - new Date(entry.consumido_em).getTimezoneOffset() * 60_000).toISOString().slice(0, 16));
    const payload = {
      operation, target_id: entry.id, base_version: entry.versao,
      patient_id: patientId, client_entry_id: entry.client_entry_id,
      refeicao: String(values?.get("refeicao") ?? entry.refeicao),
      consumido_em: new Date(localDate).toISOString(),
      descricao: String(values?.get("descricao") ?? entry.descricao),
      itens: items, compartilhado_com_profissional: values?.get("compartilhar") === "on" || (!values && entry.compartilhado_com_profissional),
    };
    const form = new FormData(); form.set("entry", JSON.stringify(payload));
    const response = await fetch("/api/paciente/diario/sync", { method: "POST", body: form, cache: "no-store" }).catch(() => null);
    setBusy(false);
    if (response?.status === 409) { setMessage("Este registro mudou em outro aparelho. Atualizamos a tela; confira a versão atual antes de alterar."); router.refresh(); return; }
    if (!response?.ok) { setMessage("Não foi possível salvar. Tente novamente quando estiver conectado."); return; }
    setMessage(operation === "delete" ? "Registro removido." : "Registro atualizado."); setEditing(false); router.refresh();
  }
  if (!editing) return <div className="mt-2 flex gap-4"><button type="button" className="quiet-link text-sm" onClick={() => setEditing(true)}>Editar</button><button type="button" className="text-sm text-danger underline" disabled={busy} onClick={() => { if (window.confirm("Remover este registro do diário?")) void mutate("delete"); }}>Excluir</button>{message && <span role="status" className="text-sm text-muted">{message}</span>}</div>;
  return <form className="mt-3 space-y-3 rounded-xl bg-cream p-3" onSubmit={(event) => { event.preventDefault(); void mutate("update", new FormData(event.currentTarget)); }}>
    <label className="form-label">Refeição<select className="field mt-1" name="refeicao" defaultValue={entry.refeicao}><option value="cafe">Café</option><option value="lanche_manha">Lanche da manhã</option><option value="almoco">Almoço</option><option value="lanche_tarde">Lanche da tarde</option><option value="jantar">Jantar</option><option value="ceia">Ceia</option><option value="outro">Outro</option></select></label>
    <label className="form-label">Data e horário<input className="field mt-1" type="datetime-local" name="consumido_em" defaultValue={new Date(new Date(entry.consumido_em).getTime() - new Date(entry.consumido_em).getTimezoneOffset() * 60_000).toISOString().slice(0, 16)}/></label>
    <label className="form-label">Alimentos e porções<textarea className="field mt-1 min-h-24" name="itens" defaultValue={entry.itens.map((item) => (item.nome ?? "") + (item.quantidade ? " — " + item.quantidade : "")).join("\n")}/></label>
    <label className="form-label">Observação<textarea className="field mt-1 min-h-20" name="descricao" defaultValue={entry.descricao}/></label>
    {entry.compartilhado_com_profissional && <p className="text-xs text-muted">A foto deste registro foi compartilhada com sua nutricionista.</p>}
    {message && <p role="alert" className="notice-error">{message}</p>}
    <div className="flex gap-2"><button className="action-primary" disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button><button className="action-secondary" type="button" onClick={() => setEditing(false)}>Cancelar</button></div>
  </form>;
}
