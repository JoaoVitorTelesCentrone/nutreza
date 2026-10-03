# Estado da fase 7 — área PWA do paciente

**Atualizado em 02/10/2026.** A implementação local está concluída. As migrações da fase 7 e seus hardenings foram aplicados ao Supabase local.

## Entregas implementadas

- Convite por e-mail verificado, token de uso único com expiração/revogação e vínculo atômico do paciente.
- Consentimentos versionados, eventos de aceite/revogação, perfil, exportação e solicitações de direitos do titular.
- PWA com navegação Hoje/Plano/Diário/Progresso/Perfil, plano aprovado e PDF autorizado, cache offline temporário do plano e diário com fila idempotente.
- Relatos alimentares editáveis, fotos privadas, sugestão opcional por IA com confirmação, limite de uso e desligamento por servidor/clínica.
- Revogar o consentimento essencial bloqueia novos registros e uploads também via RLS; as políticas de acesso foram consolidadas após execução dos advisors.
- Progresso autorrelatado separado das medidas de consulta, fotos privadas por padrão e painel profissional.
- Runbook de configuração, contingência, sincronização e piloto em [RUNBOOK_FASE_7.md](RUNBOOK_FASE_7.md).

## Verificações locais

- `pnpm typecheck`: passou.
- `pnpm lint`: passou.
- `pnpm test`: 25 testes passaram.
- `npx supabase test db --local`: 120 asserções pgTAP passaram, incluindo isolamento, convite de uso único e revogação de consentimento.
- `npx supabase db lint --local --level error`: sem erros.
- `npx supabase db advisors --local --type all --level warn`: nenhum problema.
- `pnpm build`: compilação e geração de rotas passaram.
- E2E da PWA (convite, consentimento, diário offline e sincronização) e do plano/PDF: passaram.
- Suíte E2E completa: 11 de 12 passaram. O cenário BDD antigo de agenda/falta falha porque não encontra horários para agendar; não é uma jornada da PWA.

## Gates que permanecem externos

O código local não equivale à autorização para produção clínica. A fase ainda requer revisão dos textos/base legal e retenção por responsáveis competentes, análise contratual do provedor de visão, configuração de domínio/e-mail/credenciais em staging, ensaios em iOS e Android reais, aprovação de acessibilidade/segurança e piloto assistido em dois consultórios. Marcar cada item no checklist de [RUNBOOK_FASE_7.md](RUNBOOK_FASE_7.md) antes de operar com dados reais.
