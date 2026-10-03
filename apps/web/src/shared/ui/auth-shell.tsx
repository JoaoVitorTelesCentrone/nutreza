import Link from "next/link";
import { Brand } from "@/shared/ui/brand";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return <main className="auth-grid">
    <aside className="auth-aside">
      <Brand inverse />
      <div className="relative z-10 max-w-[560px]"><p className="mb-5 text-sm font-semibold text-[#c8e2d2]">Tecnologia que nutre o cuidado</p><p className="text-[clamp(2.7rem,4.5vw,5rem)] leading-[1.06] font-bold tracking-[-.06em]">Seu consultório cresce. O cuidado continua pessoal.</p><p className="mt-6 max-w-[440px] text-lg leading-8 text-[#d6e9dc]">Um espaço mais leve para organizar o trabalho e estar presente em cada atendimento.</p></div>
      <p className="relative z-10 text-sm text-[#c8e2d2]">© Nutreza</p>
    </aside>
    <div className="auth-main"><div className="mb-10 lg:hidden"><Brand /></div><div className="auth-card">{children}</div><p className="mt-12 text-center text-xs text-muted"><Link href="/" className="underline">Voltar ao início</Link></p></div>
  </main>;
}
