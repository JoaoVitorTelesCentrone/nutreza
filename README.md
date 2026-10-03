# Nutreza

SaaS para consultórios de nutrição. As fases 1 a 6 do [plano](PLANO_IMPLEMENTACAO.md) estão implementadas localmente. A fase 4 inclui catálogo TACO, planos manuais, aprovação, PDF e visão básica do paciente; a carga TBCA depende da autorização comercial e do arquivo de origem. A fase 5 inclui cobranças Pix de pacientes via Asaas, pacotes, créditos, recibos, estornos e conciliação; para operar, configure as credenciais conforme [STATUS_FASE_5.md](STATUS_FASE_5.md). A fase 6 inclui a Teca profissional em modo simulado ou OpenAI, com guardas, fontes aprovadas, rascunhos e aprovação humana; consulte [STATUS_FASE_6.md](STATUS_FASE_6.md).

## Requisitos

- Node.js 22 ou superior, pnpm 10.29.2 e Docker Desktop com engine Linux.
- Use somente dados fictícios neste ambiente de desenvolvimento.

## Desenvolvimento local

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
$env:SUPABASE_DISABLE_TELEMETRY='1'
pnpm db:start
pnpm exec supabase status -o env
```

Copie `API_URL` para `NEXT_PUBLIC_SUPABASE_URL` e `PUBLISHABLE_KEY` ou `ANON_KEY` para `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em `.env.local`. Depois execute `pnpm dev` e abra `http://localhost:3000`. O Mailpit local usa a porta `56324` para confirmar contas e testar os fluxos de email.

## Pacientes e prontuário

- Em **Pacientes**, cadastre manualmente, busque pelo nome ou importe um CSV com até 100 linhas e cabeçalhos `nome;nascimento;sexo;email;telefone`. São aceitos `,` ou `;`; datas em `AAAA-MM-DD` ou `DD/MM/AAAA`.
- No paciente, registre alergias, anamnese, medidas, consultas e documentos PDF/JPG/PNG de até 10 MB. Alergias ativas aparecem no cabeçalho do prontuário.
- Anamnese e consultas são versionadas por inserção. Medidas são registros imutáveis. O histórico mostra alterações e acessos ao paciente.
- Admin e profissional acessam dados clínicos; recepção acessa somente dados cadastrais. O paciente vinculado lê apenas seus próprios dados cadastrais nesta fase. A ativação da área do paciente pertence à fase 7.
- Arquivos ficam em bucket privado. Downloads passam por verificação da clínica, papel e documento ativo.

## Agenda e consultas

- Ocultar um serviço retira apenas sua oferta do link público; a equipe ainda pode agendá-lo internamente. Serviços com consultas não canceladas preservam profissional, duração e intervalo. A falta só pode ser marcada após o início da consulta.
- Em **Agenda**, configure o link público, fuso horário, serviços, janelas semanais e bloqueios. A visão oferece dia, semana (7h–21h) e mês, com filtros de status. Cartões podem ser arrastados para outra hora; o detalhe oferece o formulário de remarcação por teclado e toque.
- A página `/agendar/<slug>` recebe solicitações públicas. O consultório confirma e vincula um paciente existente ou cria o cadastro a partir dos dados informados. O link da confirmação permite remarcação e cancelamento dentro do prazo. É possível baixar um evento `.ics`.
- O detalhe da consulta permite confirmar, iniciar, concluir, registrar falta, cancelar, remarcar, escrever evolução versionada e agendar retorno. O banco impede sobreposição de horários, inclusive com o intervalo entre atendimentos, e preserva o histórico.
- Quando a pessoa escolhe receber emails, a fila cria confirmação e lembretes de 24h e 1h. A rota `/api/jobs/agenda-reminders` processa a fila a cada 15 minutos com retentativas e idempotência no Resend. Para ativar o envio real, configure `SUPABASE_SECRET_KEY`, `CRON_SECRET`, `RESEND_API_KEY` e `REMINDER_FROM_EMAIL` no ambiente do servidor. `vercel.json` usa cron a cada 15 minutos, frequência que exige um plano de hospedagem compatível. O processamento pode ser chamado manualmente em ambiente local com `Authorization: Bearer <CRON_SECRET>`.
- O envio de WhatsApp, pagamento antecipado e teleconsulta com vídeo pertencem às fases posteriores do plano.

## Alimentos e planos alimentares

- Em **Alimentos**, pesquise o catálogo TACO com fonte e versão, cadastre alimentos do consultório, medidas caseiras e receitas. Os 597 registros da TACO foram importados no banco local; 15 têm dados essenciais ausentes e não podem entrar no plano até revisão clínica da fonte.
- No prontuário, abra **Planos alimentares**. Crie um rascunho, defina metas, refeições, porções, medidas e substituições. Os nutrientes são calculados no banco com valores decimais, e cada item guarda composição, fonte e versão usadas. Alimentos com macronutrientes incompletos são recusados.
- Alergias aparecem no editor. O profissional confirma sua revisão antes de aprovar. Versões aprovadas são imutáveis; **Criar revisão** copia refeições e substituições para um novo rascunho. O paciente vinculado vê somente a versão aprovada mais recente em `/paciente/plano`, com PDF da mesma versão.
- O importador aceita arquivos JSONL normalizados de TACO ou TBCA: `node scripts/import-foods.mjs --meta fonte.json --data alimentos.jsonl`. Cada linha precisa de `codigo`, `nome`, `grupo`, `energia_kcal_100g`, `proteina_g_100g`, `carboidrato_g_100g`, `lipidios_g_100g`, `fibra_g_100g`, `sodio_mg_100g` e `dados_ausentes`; nutrientes são decimais em string ou `null`. Para TBCA, forneça também `--authorized-ref <referência>` e os metadados da licença. A carga TBCA não foi executada sem autorização comercial e arquivo legítimo.
- A ativação e o convite do paciente, diário, consentimentos e modo offline permanecem na fase 7. A visão básica da fase 4 usa um vínculo de acesso existente.

## Testes

O Playwright inicia um servidor próprio em `http://127.0.0.1:3005` para evitar conflito com aplicações na porta 3000. A URL está autorizada no Supabase local para os emails de teste.

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
$env:SUPABASE_DISABLE_TELEMETRY='1'; pnpm db:test
pnpm build
```

Os testes E2E exigem Supabase local e cobrem cadastro, importação CSV, prontuário, agenda, plano alimentar, aprovação, PDF, revisão e acesso do paciente. Os testes SQL verificam conflitos de horário, idempotência, cálculo nutricional, versões, fila de lembretes e RLS entre duas clínicas, recepção, profissional e paciente vinculado. `supabase db advisors --local` deve retornar sem alertas.

A fase 3 foi concluída localmente; veja [STATUS_FASE_3.md](STATUS_FASE_3.md). O cron foi testado com provedor simulado; o envio real pelo Resend exige credenciais e validação após configurar a hospedagem.

A implementação local da fase 4 e a dependência externa para carregar a TBCA estão registradas em [STATUS_FASE_4.md](STATUS_FASE_4.md).

A implementação local da fase 5, seus limites de homologação e a configuração do Asaas estão registrados em [STATUS_FASE_5.md](STATUS_FASE_5.md).

A implementação local da fase 6, o modo simulado e as pendências para uso clínico estão registrados em [STATUS_FASE_6.md](STATUS_FASE_6.md).

## Ambientes e segurança

As migrações em `supabase/migrations` definem RLS, permissões explícitas, gatilhos de auditoria e bucket privado. O servidor valida a sessão com `getClaims()`. Não coloque chaves secretas em variáveis `NEXT_PUBLIC_`, código do navegador ou Git.

Staging e produção exigem projetos Supabase separados, credenciais e SMTP próprios, domínio e URLs de redirecionamento. Esses ambientes externos ainda dependem da escolha da organização e dos provedores. Termos, privacidade, retenção de dados e fluxo de MFA precisam de revisão antes de uso com pacientes reais.

## Estrutura

- `src/app`: rotas e layouts Next.js.
- `src/features/auth`, `src/features/pacientes` e `src/features/agenda`: validação, regras e ações.
- `src/shared`: componentes e clientes Supabase.
- `supabase/migrations`: esquema, RLS e auditoria.
- `supabase/tests/database`: testes de isolamento e permissões.
- `tests/features`, `tests/steps`, `tests/e2e`: BDD e jornadas no navegador.
- `.github/workflows/ci.yml`: verificações de qualidade e banco.
