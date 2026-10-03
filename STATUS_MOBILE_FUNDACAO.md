# Fundação web + mobile

## Entregue

- Monorepo pnpm com `apps/web`, `apps/mobile` e pacotes compartilhados.
- Expo/React Native com TypeScript, Expo Router e sessão persistida com Secure Store.
- Login exclusivo para contas de paciente e jornada inicial até o plano alimentar aprovado.
- Telas de início, plano, questionários e perfil, mantendo a identidade visual da Nutreza.
- Identidade compartilhada `nutri`/`paciente`, vínculo profissional–paciente e RLS no Supabase.
- Questionários versionados, publicação imutável, atribuição e armazenamento seguro de respostas.
- Gestão de questionários no web: criação, perguntas, publicação, atribuição e leitura de respostas.
- Tipos do banco, contratos de domínio, validações e tokens de design compartilhados.
- Seed idempotente com contas demo web/mobile, paciente, plano e questionário.
- CI validando lint, tipos, testes, build Next, Expo Doctor, bundle Android, pgTAP, lint/advisors do banco e E2E.

## Validações locais

- 31 testes TypeScript/Vitest.
- 173 asserções pgTAP, incluindo isolamento entre clínicas, profissionais e pacientes.
- Build de produção do Next.js.
- Expo Doctor com 21 de 21 verificações aprovadas.
- Exports Android e web do Expo.
- Smoke test real da jornada mobile `login → início → plano` e da área web de questionários.

## Próximo ciclo

O próximo incremento deve implementar a resposta completa de questionários no app (rascunho, retomada, validação e envio), seguido de evolução/fotos, notificações, testes em aparelhos e configuração EAS para homologação nas lojas.
