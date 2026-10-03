import { redirect } from "next/navigation";
import { createClinic } from "@/features/auth/application/actions";
import { createClient } from "@/shared/lib/supabase/server";
import { Button } from "@/shared/ui/button";

export default async function ConfigurePage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/entrar");
  const { data: existing } = await supabase.from("perfil").select("user_id").eq("user_id", claims.sub).maybeSingle();
  if (existing) redirect("/app");
  const { data: user } = await supabase.auth.getUser();
  const suggestedName = typeof user.user?.user_metadata?.nome === "string" ? user.user.user_metadata.nome : "";
  return <main className="page-wrap max-w-[640px] py-14 sm:py-20"><p className="text-sm font-semibold text-primary">Primeiro acesso</p><h1 className="mt-3 text-4xl font-bold tracking-tight">Vamos criar seu espaço.</h1><p className="mt-4 leading-7 text-muted">Use o nome pelo qual seus pacientes conhecem seu consultório. Você poderá completar o perfil na próxima fase.</p>
    <div className="mt-8 rounded-3xl border border-line bg-white p-6 sm:p-9">{erro && <p role="alert" className="mb-6 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{erro === "campos" ? "Confira os campos abaixo." : "Não foi possível configurar o consultório. Tente novamente."}</p>}
      <form action={createClinic} className="space-y-5"><div><label htmlFor="nome" className="form-label">Nome do consultório</label><input id="nome" name="nome" className="field" minLength={2} maxLength={120} required placeholder="Ex.: Consultório Ana Souza"/></div><div><label htmlFor="profissional" className="form-label">Seu nome profissional</label><input id="profissional" name="profissional" className="field" minLength={2} maxLength={120} required defaultValue={suggestedName}/></div><Button type="submit" className="w-full">Criar consultório</Button></form>
    </div>
  </main>;
}
