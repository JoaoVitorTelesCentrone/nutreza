# Status da fase 5 — financeiro do consultório

**Estado: implementada e validada localmente (02/10/2026).** O escopo é cobrar pacientes da clínica; faturamento da assinatura Nutreza continua na fase 9. O primeiro PSP integrado é Asaas, usando uma conta/configuração por clínica.

## Entregas

- Cobrança Pix para consulta e pacote, QR Code e copia e cola, detalhe da cobrança, retry recuperável, cancelamento de cobrança pendente e link com paciente/agendamento.
- Configuração Asaas sandbox/produção por clínica. A chave de API é cifrada com AES-256-GCM no servidor; token de webhook é armazenado como hash. A chave mestra fica em `PSP_ENCRYPTION_KEY`, nunca no navegador.
- Webhook `/api/webhooks/asaas` com token por clínica, limite de corpo, payload reduzido, validação de referência/valor/clínica e processamento idempotente no banco.
- Job `/api/jobs/finance-reconcile`, protegido por `CRON_SECRET`, para consultar cobranças e devoluções pendentes. Está agendado a cada 15 minutos em `vercel.json`.
- Pacotes de consultas, compras liberadas após confirmação do pagamento e razão de créditos. O crédito é reservado ao associar a consulta, consumido ao concluir ou registrar falta, e liberado ao cancelar; concorrência é serializada no banco.
- Recibos PDF numerados por clínica e download autorizado/auditado. O recibo informa que não substitui documento fiscal quando exigido.
- Devoluções totais/parciais com motivo, estado de processamento, confirmação via webhook/conciliação e bloqueio de devolução integral de pacote já usado.
- Telas `/app/financeiro`, configuração, detalhe/QR/recibo; aba Financeiro no paciente e estado/atribuição de pacote no agendamento. Admin gerencia configuração/pacotes/estornos; admin e recepção criam cobranças.
- Migrações `20261002173702_financeiro_consultorio.sql` e `20261002183941_financeiro_pacote_policy_cleanup.sql`, com RLS, grants explícitos, auditoria, RPC transacional e políticas corrigidas. Ambas estão aplicadas no Supabase local.

## Verificações locais

- `pnpm typecheck` — passou.
- `pnpm lint` — passou.
- `pnpm build` — passou; rotas financeiras, webhook e job foram incluídos no build.
- `npx supabase migration list --local` — as duas migrações estão aplicadas localmente.
- `npx supabase db advisors --local --type all --level warn` — nenhum alerta.
- Nenhuma cobrança real ou sandbox foi criada: o repositório não contém credenciais PSP para essa homologação.

## Configuração para homologar

1. Gere `PSP_ENCRYPTION_KEY` com `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"` e cadastre-a como segredo do ambiente servidor. Configure também `SUPABASE_SECRET_KEY` e `CRON_SECRET`.
2. Em `/app/financeiro/configuracao`, salve chave Asaas e token de webhook da mesma conta/ambiente. Primeiro use sandbox.
3. Configure no Asaas a URL pública HTTPS `/api/webhooks/asaas` e envie o header `asaas-access-token` com o token configurado. Selecione eventos de pagamento recebido, confirmado, vencido e devolvido.
4. Homologue criação, recebimento, eventos repetidos/fora de ordem, indisponibilidade do PSP, reconciliação e devolução; valide o conteúdo do recibo com contabilidade. Só então troque para credenciais de produção.
5. Aplique as duas migrações no projeto Supabase alvo e configure o cron hospedado. A CLI local confirmou o histórico local; nenhum projeto remoto foi alterado.

## Limites restantes

- Falta executar homologação com conta Asaas sandbox e, depois de aprovada, transação real autorizada de baixo valor. Não declarar o financeiro operacional em produção antes disso.
- Confirmar com a clínica titularidade da conta PSP, regras de cancelamento/falta e política contábil/fiscal do recibo.
- A listagem mostra as 100 cobranças mais recentes, com filtro por status e busca por paciente/descrição. Não há filtro por período ou paginação nesta entrega.
- Os testes unitários, E2E e pgTAP específicos do financeiro não foram adicionados/executados nesta entrega; os checks reportados acima cobrem compilação, lint, tipos, migrações e advisors.
