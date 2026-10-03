"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { cachePatientIdentity } from "../infrastructure/offline-diary";

export function PatientShell({ patientId, patientName, children }: { patientId: string; patientName?: string; children: React.ReactNode }) {
  const online = useSyncExternalStore(
    (onChange) => { window.addEventListener("online", onChange); window.addEventListener("offline", onChange); return () => { window.removeEventListener("online", onChange); window.removeEventListener("offline", onChange); }; },
    () => navigator.onLine,
    () => true,
  );
  useEffect(() => {
    const browserClient = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    void browserClient.auth.getUser().then(({ data }) => data.user && cachePatientIdentity(data.user.id, patientId, patientName ?? "")).catch(() => undefined);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, [patientId, patientName]);
  const tabs = [
    ["/paciente", "Hoje"], [`/paciente/plano/${patientId}`, "Plano"],
    [`/paciente/diario/${patientId}`, "Diário"], [`/paciente/progresso/${patientId}`, "Progresso"],
    [`/paciente/perfil/${patientId}`, "Perfil"],
  ];
  return <>
    {!online && <div className="sticky top-0 z-30 bg-[#fff4d7] px-4 py-2 text-center text-sm font-semibold text-[#654e15]" role="status">Sem conexão. Seus registros ficam neste aparelho e serão enviados quando a rede voltar.</div>}
    {children}
    <nav aria-label="Navegação da área do paciente" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
        {tabs.map(([href, label]) => <li key={label}><Link className="flex min-h-16 items-center justify-center px-1 text-center text-xs font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px]" href={href}>{label}</Link></li>)}
      </ul>
    </nav>
    <div className="h-20" aria-hidden="true" />
  </>;
}

export function PatientOfflineStatus() {
  const installed = useSyncExternalStore(
    (onChange) => { const media = window.matchMedia("(display-mode: standalone)"); media.addEventListener("change", onChange); return () => media.removeEventListener("change", onChange); },
    () => window.matchMedia("(display-mode: standalone)").matches,
    () => false,
  );
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const install = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", install);
    return () => window.removeEventListener("beforeinstallprompt", install);
  }, []);
  if (installed) return <p className="text-xs text-muted">Nutreza instalado neste aparelho</p>;
  if (!installPrompt) return <p className="text-xs text-muted">Você pode adicionar esta área à tela inicial pelo menu do navegador.</p>;
  return <button type="button" className="quiet-link text-sm" onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null); }}>Adicionar à tela inicial</button>;
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };
