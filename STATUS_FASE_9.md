# Status da fase 9 — comercialização e gestão

Concluída no ambiente local em 02/10/2026.

## Entregas

- Landing com preços reais configurados no banco e cadastro com teste de 14 dias.
- Catálogo de planos, assinatura por clínica, período, status e limites de pacientes, equipe e uso mensal da Teca.
- Upgrade e downgrade simulados para homologação; downgrade é recusado quando o uso excede o destino e nunca remove dados.
- Gestão de equipe com papéis admin, profissional e recepção, convite por e-mail e limite de membros no banco.
- Relatórios mensais reconciliados com agenda, planos e financeiro.
- Biblioteca de conteúdo revisado, suporte por tickets e exportação administrativa dos dados da clínica.
- RLS por clínica, permissões por papel, eventos de cobrança idempotentes e grants explícitos para o Data API.

## Gate externo

A cobrança recorrente real permanece desativada até a escolha e homologação do provedor. O modo local usa `SAAS_BILLING_MODE=simulated`. Antes de venda pública devem ser inseridos preços/termos aprovados e credenciais do provedor escolhido.
