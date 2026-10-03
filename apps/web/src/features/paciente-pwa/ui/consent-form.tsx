"use client";

import { useState } from "react";
import { savePatientConsents } from "../application/actions";
import { useRouter } from "next/navigation";

const options = [
  ["diario_foto_ia", "Analisar fotos de refeições com inteligência artificial", "Opcional. A foto é enviada ao serviço configurado para sugerir alimentos; você revisa antes de registrar."],
  ["compartilhar_fotos_diario", "Compartilhar fotos de refeições com minha nutricionista", "Opcional. Sem esta autorização, as fotos continuam privadas para o consultório."],
  ["compartilhar_fotos_progresso", "Compartilhar fotos de progresso com minha nutricionista", "Opcional. Fotos de progresso ficam privadas até você autorizar."],
  ["exibir_nutrientes", "Mostrar metas e informações de nutrientes no meu plano", "Opcional. Você pode mudar esta escolha no perfil."],
] as const;

const whatsAppPurposes = [
  ["contato_whatsapp", "Receber mensagens do consultório pelo WhatsApp"],
  ["checkin_whatsapp", "Receber check-ins de acompanhamento pelo WhatsApp"],
] as const;

export function ConsentForm({ patientId, initialConsents = {}, requireAccessConsent = true, terms = {}, whatsAppTerms = {}, verifiedPhone = null }: { patientId: string; initialConsents?: Record<string, boolean>; requireAccessConsent?: boolean; terms?: Record<string, string>; whatsAppTerms?: Record<string, string>; verifiedPhone?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(formData: FormData) {
    setBusy(true); setError("");
    const result = await savePatientConsents(patientId, formData);
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    router.replace(result.redirect);
  }
  return <form action={submit} className="mt-6 space-y-4">
    <label className="flex gap-3 rounded-xl border border-line bg-white p-4"><input className="mt-1 size-5" type="checkbox" name="uso_area_paciente" defaultChecked={initialConsents.uso_area_paciente} required={requireAccessConsent}/><span><strong>Usar a área do paciente</strong><span className="mt-1 block text-sm text-muted">{terms.uso_area_paciente ?? "Necessário para consultar seu plano, registrar seu diário e acompanhar seus dados."}</span></span></label>
    {options.map(([name, title, detail]) => <label key={name} className="flex gap-3 rounded-xl border border-line bg-white p-4"><input className="mt-1 size-5" type="checkbox" name={name} defaultChecked={initialConsents[name]}/><span><strong>{title}</strong><span className="mt-1 block text-sm text-muted">{terms[name] ?? detail}</span></span></label>)}
    {whatsAppPurposes.map(([name, title]) => whatsAppTerms[name] && verifiedPhone ? <label key={name} className="flex gap-3 rounded-xl border border-line bg-white p-4"><input className="mt-1 size-5" type="checkbox" name={name} defaultChecked={initialConsents[name]}/><span><strong>{title}</strong><span className="mt-1 block text-sm text-muted">{whatsAppTerms[name]} Destino confirmado: {verifiedPhone}. Você pode desativar esta opção no perfil.</span></span></label> : null)}
    {!verifiedPhone && <p className="notice">Para ativar mensagens pelo WhatsApp, confirme o número no seu perfil depois de entrar. Essa confirmação não ativa mensagens automaticamente.</p>}
    {error && <p className="notice-error" role="alert">{error}</p>}
    <button className="action-primary" disabled={busy}>{busy ? "Salvando…" : "Salvar escolhas e continuar"}</button>
  </form>;
}
