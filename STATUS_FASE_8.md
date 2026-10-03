# Status da fase 8 — teleconsulta e WhatsApp

Concluída no ambiente local em 02/10/2026.

## Entregas

- Teleconsulta ligada a agendamento online confirmado, com sala privada, token curto emitido no servidor, janela de acesso e TCLE versionado.
- Entrada do profissional pela agenda e do paciente pela PWA; o paciente precisa aceitar a versão vigente do TCLE.
- Integração LiveKit encapsulada e modo simulado local sem alegar chamada real.
- WhatsApp por clínica com credencial cifrada, templates aprovados, telefone confirmado por desafio iniciado pelo paciente e consentimento separado para contato e check-in.
- Webhook Meta assinado e idempotente, estados monotônicos, opt-out por `PARAR`, reativação controlada, outbox com retry seguro e bloqueio de reenvio ambíguo.
- Lembrete de consulta em 24 horas, check-in 24 horas após consulta realizada, cotas, janela de envio, kill switch por clínica e revalidação de termo/consentimento/telefone no momento do envio.
- Caixa clínica de escalações. Perguntas clínicas, urgentes ou ambíguas não recebem orientação automática.

## Gates externos

Uso real exige credenciais LiveKit e Meta, HTTPS/webhooks, número e templates aprovados, TCLE/termos revisados, `WHATSAPP_TERMS_APPROVED=true`, homologação em dispositivos e piloto assistido.

## Evidências

As migrations `20261002211631` a `20261002230741` cobrem dados, RLS, idempotência e endurecimento. Os testes pgTAP da fase ficam em `supabase/tests/database/phase8_10.test.sql`.
