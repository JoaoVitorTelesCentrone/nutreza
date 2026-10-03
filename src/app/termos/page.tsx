import Link from "next/link";
import { Brand } from "@/shared/ui/brand";

export default function TermsPage() {
  return <main className="page-wrap max-w-[760px] py-10"><Brand /><article className="mt-12 space-y-5 leading-8 text-muted"><h1 className="text-4xl font-bold text-ink">Termos de uso</h1><p><strong className="text-ink">Versão de desenvolvimento.</strong> A Nutreza está em construção e, nesta fase, oferece cadastro, autenticação e configuração inicial do consultório. Os recursos clínicos, financeiros e de acompanhamento ainda não estão disponíveis.</p><p>O acesso deve ser usado apenas com dados de teste até a publicação dos termos definitivos, da política de privacidade revisada e da infraestrutura de produção.</p><p>Ao criar sua conta, você se compromete a usar dados corretos, proteger sua senha e não cadastrar dados de pacientes neste ambiente inicial.</p><p>Os termos finais serão apresentados antes da liberação do produto para uso profissional.</p><Link href="/cadastro" className="quiet-link">Voltar ao cadastro</Link></article></main>;
}
