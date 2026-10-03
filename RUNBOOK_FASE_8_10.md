# Runbook operacional — fases 8 a 10

## Preparação

1. Copie `.env.example` para o gerenciador de segredos do ambiente; nunca grave valores reais no Git.
2. Aplique migrations em staging, execute `pnpm db:test`, `supabase db lint --level error` e `supabase db advisors --type all --level warn`.
3. Execute `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm test:e2e`.
4. Confira `/api/health`. Ative feature flags uma clínica por vez.

## Backup e restore

- Antes de migration de produção, gere backup lógico e confirme a retenção do backup gerenciado.
- Restaure o backup em um projeto de staging isolado, aplique migrations e rode pgTAP. Registre duração, responsável e resultado.
- Nunca teste restore sobre produção. Dados reais restaurados em staging precisam das mesmas salvaguardas e acesso restrito.

## Incidentes

- `SEV1`: possível vazamento, envio ao número errado ou indisponibilidade geral. Desligue a feature flag/canal, preserve evidências, acione segurança e privacidade.
- `SEV2`: financeiro, vídeo ou mensagens degradados para várias clínicas. Suspenda o job afetado e use o fallback manual.
- `SEV3/4`: impacto restrito. Registre ticket, responsável e prazo.
- Não coloque telefone, corpo de mensagem, prontuário, tokens ou segredos em logs e ferramentas de observabilidade.

## Fallbacks

- LiveKit indisponível: não emita novos tokens; ofereça telefone ou remarcação.
- Meta/webhook indisponível: desative `whatsapp`, preserve a outbox e não reenvie itens com resultado incerto.
- Cobrança SaaS indisponível: preserve o plano atual e não faça downgrade automático.
- Teca indisponível: plano manual, agenda, prontuário e financeiro continuam disponíveis.

## Go/no-go

Só liberar produção quando responsáveis clínico, jurídico, privacidade, suporte e engenharia assinarem: termos/contratos, restore, carga, dispositivos, alertas, escala de suporte e piloto sem incidente crítico aberto.
