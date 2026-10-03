# Status da fase 10 — endurecimento e lançamento

Implementação técnica local concluída em 02/10/2026.

## Entregas

- Health check em `/api/health`, CI com lint, tipos, unitários, build, pgTAP e E2E.
- Feature flags por clínica para Teca, foto, teleconsulta, WhatsApp e cobrança SaaS.
- Registro operacional de incidentes com severidade, responsável e estado, isolado por clínica.
- Jobs agendados para agenda, financeiro, lembretes/check-ins WhatsApp e outbox.
- Runbook único de deploy, rollback, backup/restore, incidentes e gates de lançamento.
- Matriz pgTAP das fases 8–10, lint do banco e advisors sem alertas; a suíte completa encerrou com 31 testes unitários, 142 asserções pgTAP e 12 E2E aprovados.

## Gates de lançamento que exigem pessoas e ambientes externos

O produto ainda não deve ser declarado em produção até concluir piloto real, revisão jurídica/LGPD, contratos com operadores, restore em staging, testes de carga no ambiente alvo, homologação móvel e definição nominal dos responsáveis por suporte e incidentes. Esses itens não podem ser validados apenas no repositório.
