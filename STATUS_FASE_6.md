# Status da fase 6 — Teca profissional

**Estado: implementação local concluída, pronta para revisão com dados fictícios (02/10/2026).** A fase adiciona o copiloto supervisionado do profissional. O modo simulado funciona sem chave externa; o adaptador OpenAI é ativado quando `OPENAI_API_KEY` e a configuração da clínica apontam para OpenAI.

## Entregas implementadas

- Migração `20261002190000_teca_profissional.sql` com configuração por clínica, fontes, trechos, execuções, artefatos, decisões e uso/custo. Todas as tabelas têm RLS, grants explícitos, índices e políticas por clínica/papel.
- Migração `20261002191045_teca_retry_constraint.sql` para permitir repetir uma geração com o mesmo contexto preservando cada tentativa e sua auditoria.
- Contrato de saída estruturada para resumo pré-consulta, nota estruturada e proposta de plano. O adaptador usa Structured Outputs da Responses API com `store: false`; quando não há chave, usa o modo simulado local.
- Contexto mínimo autorizado: alergias ativas, anamnese, evoluções, antropometria, consulta selecionada, alimentos disponíveis e fontes aprovadas. Dados financeiros e segredos não entram no contexto.
- Guardas determinísticas para alergias/restrições, nutrientes ausentes, itens inválidos, plano vazio e faixas de metas. A aprovação de plano também revalida alergias no trigger do banco.
- Aprovação humana: nota aceita cria nova evolução versionada; plano aceito cria rascunho no editor determinístico existente para nutrientes/snapshots; resumo é apenas interno. Descarte, edição e auditoria ficam registrados.
- Fila `/app/teca`, detalhe `/app/teca/[executionId]`, configuração `/app/teca/configuracao` e biblioteca `/app/teca/fontes`. A navegação principal inclui “Teca IA”.
- Limites de gerações por dia, orçamento mensal, tokens máximos, timeout e tratamento de falhas do provedor. O fluxo manual continua disponível quando a IA falha.

## Como usar localmente

1. Abra `/app/teca` com um usuário `admin` ou `profissional`.
2. No admin, configure a Teca. Para visualizar sem serviço externo, escolha `simulado`, ative a clínica e salve.
3. Cadastre uma fonte clínica em `/app/teca/fontes`, revise e aprove-a. Use apenas conteúdo autorizado.
4. Escolha um paciente e gere resumo, nota ou plano. Revise o artefato; planos com guarda crítica ficam bloqueados até edição e nova validação.
5. Aprove uma nota para criar uma evolução versionada ou um plano para criar um rascunho no editor de planos. Só o plano aprovado no editor existente aparece ao paciente.

Para usar OpenAI, configure `OPENAI_API_KEY` somente no ambiente de servidor, escolha `openai` na configuração e defina `TECA_MODEL` ou o modelo no formulário. Não use prontuários reais antes de validar contrato, retenção, base legal, transferência internacional e política de supervisão clínica.

## Verificações executadas

- `pnpm typecheck` — passou.
- `pnpm lint` — passou.
- `pnpm build` — passou; as rotas da Teca foram incluídas.
- Migrações `20261002190000` e `20261002191045` aplicadas no Supabase local.
- `npx supabase db advisors --local --type all --level warn` — nenhum alerta.
- Consulta direta ao catálogo local confirmou RLS habilitado nas tabelas `teca_*`.

## Limites antes de uso clínico

- O modo OpenAI não foi exercitado sem credencial. A qualidade da geração precisa de avaliação com nutricionistas e corpus adversarial antes de liberar dados reais.
- A recuperação implementada nesta fatia usa fontes aprovadas e filtros textuais do banco; embeddings/pgvector ficam como otimização posterior, sem bloquear o fluxo seguro de fontes citadas.
- Ainda faltam avaliação clínica formal, revisão jurídica/contábil, observabilidade externa, feature flag por ambiente e piloto com profissionais. A fase está pronta para staging local, não declarada como liberada para produção clínica.
