import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Brand } from "@/shared/ui/brand";
import { Button } from "@/shared/ui/button";

export default function HomePage() {
  return <main>
    <header className="page-wrap flex h-22 items-center justify-between gap-4">
      <Brand />
      <nav aria-label="Navegação principal" className="flex items-center gap-3">
        <Link className="hidden text-sm font-semibold text-ink sm:inline" href="/precos">Preços</Link>
        <Link className="hidden text-sm font-semibold text-ink sm:inline" href="/entrar">Entrar</Link>
        <Button asChild><Link href="/cadastro">Começar grátis <ArrowRight size={17} /></Link></Button>
      </nav>
    </header>
    <section className="page-wrap grid min-h-[620px] items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
      <div>
        <h1 className="max-w-[690px] text-[clamp(2.9rem,6vw,5.6rem)] leading-[1.03] font-bold tracking-[-.068em]">Mais tempo para cuidar de quem importa.</h1>
        <p className="mt-7 max-w-[550px] text-lg leading-8 text-muted">Organize seu consultório em um lugar só. A Teca ajuda a rascunhar o trabalho repetitivo; você revisa e decide.</p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Button size="lg" asChild><Link href="/cadastro">Criar minha conta <ArrowRight size={18}/></Link></Button>
          <Button size="lg" variant="outline" asChild><Link href="/entrar">Já tenho conta</Link></Button>
        </div>
        <p className="mt-4 text-sm text-muted">Comece a configurar seu consultório. Sem cartão de crédito.</p>
      </div>
      <div className="relative rounded-[32px] bg-[#e5eee6] p-5 sm:p-8">
        <div className="absolute -top-5 right-5 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink shadow-[0_10px_35px_rgba(22,63,49,.12)]"><ShieldCheck size={19} className="text-primary"/> Você aprova cada plano</div>
        <div className="rounded-[24px] bg-white p-6 shadow-[0_20px_60px_rgba(22,63,49,.10)] sm:p-8">
          <div className="flex items-center justify-between border-b border-line pb-5"><span className="font-bold">Seu dia no consultório</span><span className="text-xs text-muted">Exemplo de interface</span></div>
          <div className="mt-7 rounded-2xl bg-cream p-5"><p className="text-sm font-semibold text-primary">Hoje</p><p className="mt-2 text-2xl font-bold tracking-tight">O cuidado começa organizado.</p><p className="mt-2 text-sm leading-6 text-muted">Consultas, prontuários e planos prontos para acompanhar sua rotina.</p></div>
          <div className="mt-5 flex items-start gap-4 rounded-2xl border border-[#f2d7bb] bg-[#fff8ef] p-4"><Image src="/brand/teca-avatar.png" alt="Teca" width={46} height={46} className="rounded-full"/><div><p className="font-semibold">Teca, sua copiloto</p><p className="mt-1 text-sm leading-6 text-muted">“Eu rascunho. Você revisa, ajusta e aprova.”</p></div></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-line p-4 text-sm"><CheckCircle2 size={18} className="mb-3 text-primary"/>Agenda e pacientes</div><div className="rounded-xl border border-line p-4 text-sm"><CheckCircle2 size={18} className="mb-3 text-primary"/>Planos sob seu controle</div></div>
        </div>
      </div>
    </section>
    <footer className="border-t border-line py-6 text-center text-sm text-muted">Nutreza · Tecnologia que nutre o cuidado.</footer>
  </main>;
}
