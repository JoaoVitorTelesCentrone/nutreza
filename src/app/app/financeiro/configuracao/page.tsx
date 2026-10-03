import Link from "next/link";
import { requireStaff } from "@/features/pacientes/application/context";
import { createFinanceAdmin } from "@/features/financeiro/infrastructure/admin-client";
import { saveBillingConfig } from "@/features/financeiro/application/actions";

export default async function BillingSettings({ searchParams }: { searchParams: Promise<{ erro?: string; salvo?: string }> }) {
  const { profile } = await requireStaff();
  if (profile.papel !== "admin") return <main className="page-wrap py-10"><h1 className="text-3xl font-bold">Configuração restrita</h1><p className="mt-3 text-muted">Somente o administrador do consultório configura o provedor de pagamentos.</p></main>;
  const admin = createFinanceAdmin();
  const { data: config } = await admin.from("financeiro_config").select("ambiente,ativa,updated_at").eq("clinica_id", profile.clinica_id).maybeSingle();
  const query = await searchParams;
  const errors: Record<string, string> = {
    campos: "Confira o ambiente, a chave de API e um token de webhook com 32 a 255 caracteres.",
    segredo: "Configure PSP_ENCRYPTION_KEY no servidor com 32 bytes em Base64.",
    salvar: "Não foi possível salvar a configuração.",
  };
  return <main className="page-wrap py-8 sm:py-10">
    <Link href="/app/financeiro" className="quiet-link">← Financeiro</Link>
    <h1 className="mt-4 text-3xl font-bold">Conectar Asaas</h1>
    <p className="mt-2 max-w-2xl text-muted">A chave é criptografada no servidor e nunca é exibida novamente. Configure a mesma URL e o token de autenticação na área de webhooks da conta Asaas.</p>
    {query.salvo && <p role="status" className="notice mt-5">Configuração salva. Cadastre agora o webhook no painel Asaas.</p>}
    {query.erro && <p role="alert" className="notice-error mt-5">{errors[query.erro] ?? "Não foi possível concluir a operação."}</p>}
    <section className="card mt-6">
      <h2 className="section-title">Credenciais do consultório</h2>
      <p className="mt-2 text-sm text-muted">Estado: {config?.ativa ? `conectado em ${config.ambiente === "sandbox" ? "sandbox" : "produção"}` : "não configurado"}</p>
      <form action={saveBillingConfig} className="mt-5 grid gap-4 sm:max-w-xl">
        <div><label className="form-label" htmlFor="ambiente">Ambiente</label><select className="field" id="ambiente" name="ambiente" defaultValue={config?.ambiente ?? "sandbox"}><option value="sandbox">Sandbox</option><option value="producao">Produção</option></select></div>
        <div><label className="form-label" htmlFor="api_key">Chave de API do Asaas</label><input className="field" id="api_key" name="api_key" type="password" autoComplete="new-password" minLength={12} maxLength={300} required/></div>
        <div><label className="form-label" htmlFor="webhook_token">Token de autenticação do webhook</label><input className="field" id="webhook_token" name="webhook_token" type="password" autoComplete="new-password" minLength={32} maxLength={255} required/><p className="mt-1 text-xs text-muted">Gere um token aleatório com pelo menos 32 caracteres e configure-o também no Asaas.</p></div>
        <button className="action-primary justify-self-start" type="submit">Salvar credenciais</button>
      </form>
    </section>
    <section className="card mt-5">
      <h2 className="section-title">Webhook no Asaas</h2>
      <p className="mt-2 text-sm text-muted">URL de notificação:</p>
      <code className="mt-2 block overflow-x-auto rounded-xl bg-cream p-3 text-sm">{process.env.NEXT_PUBLIC_SITE_URL ?? "https://seu-dominio.com"}/api/webhooks/asaas</code>
      <p className="mt-3 text-sm text-muted">Eventos: `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED`, `PAYMENT_REFUND_IN_PROGRESS` e `PAYMENT_REFUND_DENIED`. Envie o token no campo de autenticação para que ele chegue no cabeçalho `asaas-access-token`.</p>
    </section>
  </main>;
}
