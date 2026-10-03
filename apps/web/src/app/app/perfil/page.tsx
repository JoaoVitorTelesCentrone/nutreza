import Link from "next/link";
import { headers } from "next/headers";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  ExternalLink,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { createManagementAdmin } from "@/features/gestao/infrastructure/admin-client";
import { requireStaff } from "@/features/pacientes/application/context";
import { saveBusinessProfile } from "@/features/perfil/application/actions";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  profissional: "Profissional",
  recepcao: "Recepção",
};

const statusLabels: Record<string, string> = {
  trial: "Período de teste",
  ativa: "Ativa",
  inadimplente: "Pagamento pendente",
  cancelada: "Cancelada",
  pausada: "Pausada",
};

function date(value?: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR").format(new Date(value)) : "—";
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string; erro?: string }>;
}) {
  const { supabase, profile, userId } = await requireStaff();
  const query = await searchParams;
  const admin = createManagementAdmin();
  const headerStore = await headers();

  const [
    { data: auth },
    { data: fullProfile },
    { data: clinic },
    { data: subscription },
    { data: plans },
    { data: usage },
    { data: agenda },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("perfil").select("nome,papel,crn,created_at").eq("user_id", userId).eq("clinica_id", profile.clinica_id).single(),
    supabase.from("clinica").select("nome,created_at,created_by").eq("id", profile.clinica_id).single(),
    admin.from("saas_assinatura").select("plano_id,status,provedor,periodo_inicio,periodo_fim,cancelar_ao_fim").eq("clinica_id", profile.clinica_id).maybeSingle(),
    admin.from("saas_plano").select("id,nome,preco_mensal_centavos,limite_pacientes,limite_membros,limite_teca_mes").eq("ativo", true),
    admin.rpc("saas_usage_snapshot", { p_clinica_id: profile.clinica_id }),
    supabase.from("agenda_config").select("slug,ativa,timezone").eq("clinica_id", profile.clinica_id).maybeSingle(),
  ]);

  const currentPlan = plans?.find((plan) => plan.id === subscription?.plano_id);
  const displayName = fullProfile?.nome ?? profile.nome;
  const email = auth.user?.email ?? "E-mail indisponível";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? `${process.env.NODE_ENV === "production" ? "https" : "http"}://${headerStore.get("host") ?? "localhost:3000"}`;
  const bookingUrl = agenda?.slug ? `${siteUrl}/agendar/${agenda.slug}` : null;
  const isAdmin = profile.papel === "admin";
  const indicators = [
    { label: "Pacientes ativos", value: usage?.pacientes ?? 0, limit: currentPlan?.limite_pacientes, icon: Users },
    { label: "Pessoas na equipe", value: usage?.membros ?? 0, limit: currentPlan?.limite_membros, icon: ShieldCheck },
    { label: "Consultas no mês", value: usage?.consultas_mes ?? 0, icon: CalendarDays },
    { label: "Usos da Teca", value: usage?.teca_mes ?? 0, limit: currentPlan?.limite_teca_mes, icon: Sparkles },
  ];

  return (
    <main className="page-wrap max-w-6xl py-8 sm:py-12">
      <section className="overflow-hidden rounded-[28px] bg-primary-dark text-white">
        <div className="grid gap-8 px-6 py-8 sm:px-9 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-white/12 text-2xl font-bold ring-1 ring-white/20">
              {initials(displayName)}
            </div>
            <div>
              <p className="text-sm text-white/70">Perfil e negócio</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{displayName}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
                <span className="inline-flex items-center gap-2"><BriefcaseBusiness className="size-4" />{clinic?.nome ?? "Consultório"}</span>
                <span className="inline-flex items-center gap-2"><BadgeCheck className="size-4" />{roleLabels[profile.papel] ?? profile.papel}</span>
              </div>
            </div>
          </div>
          <div className="lg:text-right">
            <p className="text-sm text-white/65">Receita recebida neste mês</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{money(usage?.receita_mes_centavos ?? 0)}</p>
          </div>
        </div>
      </section>

      {query.salvo && <p className="notice mt-5">Dados atualizados.</p>}
      {query.erro && <p className="notice-error mt-5">Não foi possível salvar. Confira os campos e tente novamente.</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <form action={saveBusinessProfile} className="card">
          <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <h2 className="section-title">Dados de cadastro</h2>
              <p className="mt-1 text-sm text-muted">Informações usadas na sua identificação profissional.</p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">{roleLabels[profile.papel] ?? profile.papel}</span>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="form-label sm:col-span-2">Nome profissional
              <input className="field mt-2" name="nome" defaultValue={displayName} minLength={2} maxLength={120} required />
            </label>
            <label className="form-label">CRN
              <input className="field mt-2" name="crn" defaultValue={fullProfile?.crn ?? ""} maxLength={40} placeholder="Ex.: CRN-3 12345" />
            </label>
            <label className="form-label">E-mail de acesso
              <span className="relative mt-2 block"><Mail className="absolute left-3 top-3.5 size-4 text-muted" /><input className="field text-muted" style={{ paddingLeft: "2.5rem" }} value={email} disabled /></span>
            </label>
            <label className="form-label sm:col-span-2">Nome do consultório
              <input className="field mt-2" name="clinica_nome" defaultValue={clinic?.nome ?? ""} minLength={2} maxLength={120} required={isAdmin} disabled={!isAdmin} />
              {!isAdmin && <span className="mt-2 block text-xs font-normal text-muted">Somente administradores podem alterar este nome.</span>}
            </label>
          </div>

          <dl className="mt-6 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Cadastro profissional</dt><dd className="mt-1 font-semibold">{date(fullProfile?.created_at)}</dd></div>
            <div><dt className="text-muted">Consultório criado em</dt><dd className="mt-1 font-semibold">{date(clinic?.created_at)}</dd></div>
          </dl>

          <button className="action-primary mt-7" type="submit">Salvar alterações</button>
        </form>

        <aside className="card border-primary/25 bg-[#f4f8f3]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">Assinatura</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">Plano {currentPlan?.nome ?? "indisponível"}</h2>
            </div>
            <CreditCard className="size-6 text-primary" />
          </div>
          <p className="mt-3 text-sm text-muted">{statusLabels[subscription?.status ?? ""] ?? "Status indisponível"} · {subscription?.provedor === "simulado" ? "ambiente de teste" : subscription?.provedor}</p>
          <p className="mt-6 text-3xl font-bold tracking-tight">{currentPlan ? money(currentPlan.preco_mensal_centavos) : "—"}<span className="ml-1 text-sm font-medium text-muted">/mês</span></p>
          <div className="mt-6 border-t border-primary/15 pt-5 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted">Período atual</span><strong>{date(subscription?.periodo_inicio)} a {date(subscription?.periodo_fim)}</strong></div>
            {subscription?.cancelar_ao_fim && <p className="mt-3 text-danger">Cancelamento agendado para o fim do período.</p>}
          </div>
          <Link className="action-secondary mt-6 w-full" href="/app/gestao">Gerenciar conta e plano</Link>
        </aside>
      </div>

      <section className="soft-panel mt-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-6 py-5 sm:px-8">
          <div><h2 className="section-title">Operação neste mês</h2><p className="mt-1 text-sm text-muted">Um retrato rápido do consultório e dos limites contratados.</p></div>
          <Link href="/app/relatorios" className="quiet-link text-sm">Ver relatórios</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4">
          {indicators.map(({ label, value, limit, icon: Icon }, index) => (
            <div className={`p-6 sm:p-7 ${index > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 sm:border-t lg:border-l lg:border-t-0" : ""}`} key={label}>
              <Icon className="size-5 text-primary" />
              <p className="mt-5 text-3xl font-bold tracking-tight">{value}{limit ? <span className="text-base font-medium text-muted">/{limit}</span> : null}</p>
              <p className="mt-1 text-sm text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="card">
          <h2 className="section-title">Agenda pública</h2>
          {bookingUrl ? (
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-semibold">{agenda?.ativa ? "Aceitando novos agendamentos" : "Link temporariamente pausado"}</p><p className="mt-1 break-all text-sm text-muted">{bookingUrl}</p><p className="mt-1 text-xs text-muted">Fuso horário: {agenda?.timezone ?? "não informado"}</p></div>
              <Link href={`/agendar/${agenda?.slug}`} target="_blank" className="action-secondary shrink-0">Abrir link <ExternalLink className="ml-2 size-4" /></Link>
            </div>
          ) : <p className="empty">O link público ainda não foi configurado.</p>}
        </div>
        <nav aria-label="Atalhos da conta" className="card">
          <h2 className="section-title">Administrar negócio</h2>
          <div className="mt-4 divide-y divide-line">
            <Link href="/app/equipe" className="flex items-center justify-between py-3 font-semibold hover:text-primary"><span>Equipe e permissões</span><span aria-hidden="true">›</span></Link>
            <Link href="/app/agenda/disponibilidade" className="flex items-center justify-between py-3 font-semibold hover:text-primary"><span>Agenda e serviços</span><span aria-hidden="true">›</span></Link>
            <Link href="/app/financeiro/configuracao" className="flex items-center justify-between py-3 font-semibold hover:text-primary"><span>Configuração financeira</span><span aria-hidden="true">›</span></Link>
          </div>
        </nav>
      </section>
    </main>
  );
}
