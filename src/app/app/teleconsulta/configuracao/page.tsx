import Link from "next/link";
import { requireStaff } from "@/features/pacientes/application/context";
import { createPhase8Admin } from "@/features/comunicacao/infrastructure/admin-client";
import { publishTelehealthTerms } from "@/features/teleconsulta/application/actions";

export const dynamic = "force-dynamic";

export default async function TelehealthConfigurationPage() {
  const { profile } = await requireStaff();
  const admin = createPhase8Admin();
  const [{ data: current }, { data: history }] = await Promise.all([
    admin.from("teleconsulta_termo").select("id,versao,conteudo,publicado_em,status").eq("clinica_id", profile.clinica_id).eq("status", "publicado").maybeSingle(),
    admin.from("teleconsulta_termo").select("id,versao,publicado_em,status").eq("clinica_id", profile.clinica_id).order("created_at", { ascending: false }).limit(10),
  ]);
  if (profile.papel !== "admin") return <main className="page-wrap py-10"><p className="notice-error">Somente o admin pode publicar versões do TCLE.</p></main>;
  return <main className="page-wrap max-w-3xl py-8"><Link href="/app/agenda" className="quiet-link">← Agenda</Link><h1 className="mt-4 text-3xl font-bold">Configuração de teleconsulta</h1><p className="mt-2 text-muted">Publique o TCLE revisado pela equipe responsável. Cada aceite fica ligado à versão apresentada.</p>
    <section className="card mt-6"><h2 className="section-title">Versão publicada</h2>{current ? <><p className="mt-2 text-sm text-muted">{current.versao} · publicada em {new Date(current.publicado_em!).toLocaleString("pt-BR")}</p><div className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-white p-4 text-sm leading-6">{current.conteudo}</div></> : <p className="notice-error mt-3">Nenhuma versão publicada. A entrada em vídeo ficará bloqueada até a publicação.</p>}</section>
    {profile.papel === "admin" && <form action={publishTelehealthTerms} className="card mt-5 grid gap-4"><h2 className="section-title">Publicar nova versão</h2><label className="form-label">Versão<input className="field" name="version" placeholder="tcle-2026-10-v1" maxLength={80} required/></label><label className="form-label">Texto do TCLE<textarea className="field min-h-56" name="content" minLength={20} maxLength={20000} required/></label><label className="flex gap-3 text-sm"><input type="checkbox" name="approved" required/><span>Confirmo que esta versão foi revisada e aprovada para uso pela clínica.</span></label><button className="action-primary justify-self-start" type="submit">Publicar TCLE</button></form>}
    {history?.length ? <section className="card mt-5"><h2 className="section-title">Histórico</h2><ul className="mt-3 divide-y divide-line">{history.map((item) => <li className="py-3 text-sm" key={item.id}>{item.versao} · {item.status}{item.publicado_em ? ` · ${new Date(item.publicado_em).toLocaleString("pt-BR")}` : ""}</li>)}</ul></section> : null}
  </main>;
}
