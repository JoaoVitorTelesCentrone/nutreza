import { Brand } from "@/shared/ui/brand";
import { ActivationClient } from "@/features/paciente-pwa/ui/activation-client";

export default function ActivatePatientPage() {
  return <main className="page-wrap max-w-xl py-10 sm:py-16"><Brand/><div className="mt-10"><p className="text-sm font-semibold text-primary">Acesso do paciente</p><h1 className="mt-2 text-3xl font-bold">Ative sua conta</h1><p className="mt-3 text-muted">Confirme seu e-mail para acessar o plano e o acompanhamento do consultório.</p><ActivationClient/></div></main>;
}
