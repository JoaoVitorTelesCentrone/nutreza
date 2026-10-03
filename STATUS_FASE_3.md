# Fase 3 — concluída localmente em 2 de outubro de 2026

A entrega de agenda e consulta prevista no `PLANO_IMPLEMENTACAO.md` está implementada e validada no ambiente local. Não houve deploy.

## Entrega

- Disponibilidade semanal, bloqueios, serviços, fusos, visões diária/semanal/mensal e remarcação por arraste ou formulário acessível.
- Agendamento interno e público, confirmação e cancelamento idempotentes, remarcação, status de atendimento e falta, retorno, evolução versionada e evento `.ics`.
- Conflitos de horário impedidos no banco, isolamento por clínica, políticas por papel e trilha de auditoria para agendamentos e configurações.
- Serviço oculto do link público continua disponível para agendamento interno. Duração, intervalo e profissional não podem mudar se o serviço tiver consultas não canceladas. Falta só pode ser registrada após o início da consulta.
- Fila de notificações com consentimento para email, lembretes de 24 h e 1 h, cron autenticado, retentativas e chave de idempotência para o Resend.
- Confirmação de email e retorno da autenticação preservam a sessão no host configurado; modelos de email usam a URL de retorno autorizada.

## Validação final

| Verificação | Resultado |
|---|---|
| `pnpm lint` | passou |
| `pnpm typecheck` | passou |
| `pnpm test` | 22 testes passaram, incluindo processamento simulado do cron |
| `pnpm test:e2e` | 10 cenários passaram, incluindo reserva pública, remarcação, consulta e falta futura indisponível |
| `supabase test db` | 68 testes SQL passaram no banco local; 66 passaram no banco vazio isolado antes dos dois testes adicionais de permissão |
| `supabase db advisors --local` | nenhum problema no banco local e no banco vazio isolado |
| `pnpm build` | passou |

A cadeia completa de migrações foi aplicada em uma instância Supabase separada e vazia. A instância temporária foi removida após os testes. O banco local principal não foi reinicializado.

## Limite externo

O envio real pelo Resend e a execução do cron na hospedagem exigem as credenciais e o ambiente externo descritos no `.env.example`. Foram verificados localmente a autenticação da rota, o fluxo do worker com provedor simulado, a fila e os lembretes no banco. A entrega em uma caixa de email real deverá ser validada ao configurar o provedor, sem bloquear a conclusão da implementação local da fase 3.

O repositório continua inteiramente não rastreado no Git; ainda não há commit.
