import Link from "next/link";
import { Brand } from "@/shared/ui/brand";

export default function PrivacyPage() {
  return <main className="page-wrap max-w-[760px] py-10"><Brand /><article className="mt-12 space-y-5 leading-8 text-muted"><h1 className="text-4xl font-bold text-ink">Privacidade</h1><p><strong className="text-ink">Versão de desenvolvimento.</strong> O cadastro inicial usa nome, e-mail, credencial de acesso e nome do consultório para autenticar você e criar seu espaço.</p><p>A autenticação e o armazenamento são preparados com Supabase. Nesta fase, não há coleta de prontuários, informações de saúde ou dados de pacientes.</p><p>Não use dados clínicos reais até que os fluxos de segurança, direitos do titular e contratos estejam revisados e o ambiente de produção seja liberado.</p><p>A política completa, incluindo contato do controlador, prazos e exercício de direitos, será publicada antes da operação comercial.</p><Link href="/cadastro" className="quiet-link">Voltar ao cadastro</Link></article></main>;
}
