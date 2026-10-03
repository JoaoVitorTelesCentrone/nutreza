# Plano de implementação — Nutreza

**Ponto de partida (01/10/2026):** este diretório continha briefing técnico, pesquisa, especificação de UI/UX e identidade visual, sem aplicação ou infraestrutura. As estimativas abaixo partem desse ponto zero.

**Atualização da fase 1:** a fundação local foi implementada e validada. Consulte [README.md](README.md) para execução e testes. Projetos remotos de staging/produção e credenciais externas aguardam definição da organização, custo e configuração dos provedores.

## 1. Objetivo e escopo

Entregar um SaaS brasileiro para nutricionistas que fecha o ciclo **agendar → atender → prescrever → acompanhar → cobrar**, com uma área web para o profissional, uma PWA para o paciente e a Teca como copiloto supervisionado. Toda saída clínica da IA é rascunho identificável, revisado e aprovado pelo nutricionista antes de chegar ao paciente.

O plano mantém a arquitetura indicada no briefing: **uma aplicação Next.js com TypeScript estrito, um projeto Supabase, UI com shadcn/ui e Tailwind, integrações encapsuladas e entregas verticais com testes**. Não inclui aplicativos nativos, convênios/TISS, wearables, marketplace ou expansão internacional nesta versão.

### Marcos de produto

| Marco | Produto utilizável | Critério de saída |
|---|---|---|
| M0 — Fundação | Autenticação, design system, ambientes e CI | Cadastro e acesso seguros; primeiro fluxo E2E e teste RLS no CI |
| M1 — Núcleo clínico | Pacientes, prontuário, agenda, plano manual, PDF e cobrança Pix | Nutricionista conclui o ciclo básico com paciente real |
| M2 — Diferencial Teca | Resumo, nota e rascunho de plano supervisionados | Guardas clínicas testadas; aprovação e auditoria completas |
| M3 — Paciente conectado | PWA, diário, consentimentos, teleconsulta e WhatsApp restrito | Paciente acessa o plano, registra refeições e recebe acompanhamento consentido |
| M4 — Produto comercial completo | Assinatura SaaS, relatórios, equipe, suporte e operação em escala | Cobrança recorrente, limites por plano, métricas e processos operacionais funcionando |

**Beta funcional:** M1 + rascunho de plano da Teca de M2 + acesso básico do paciente ao plano. **Primeira versão vendável:** beta funcional com cobrança da assinatura Nutreza, limites dos planos, termos e suporte mínimos da fase 9. O restante de M2–M4 amplia a promessa do produto até a versão completa. Essa divisão permite validar o núcleo antes de ativar o agente de WhatsApp, que depende de conteúdo aprovado, consentimento e tratamento de escalações.

## 2. Decisões de produto antes de codificar

1. **Definir o piloto:** 10–20 nutricionistas e seus fluxos reais. Validar anamnese, cálculo, plano, PDF, cobrança e tempo até o primeiro plano; priorizar correções observadas no uso.
2. **Fechar matriz de permissões:** proprietário/admin, profissional, recepção e paciente. Definir quem vê, edita, exporta e aprova cada dado; uma clínica solo continua sendo um tenant.
3. **Fixar contratos clínicos:** campos obrigatórios da anamnese, versionamento de evolução, fontes de alimentos, unidades, medidas caseiras, substituições e limites de cálculo. Nutricionistas responsáveis revisam regras e exemplos.
4. **Fechar política de segurança da IA:** alergênicos e contraindicações bloqueiam aprovação até correção. Desvios não críticos de metas podem admitir exceção justificada e auditada, se aprovados pelo responsável clínico. Isso resolve a divergência entre o cenário de bloqueio do briefing técnico e a opção de override genérico no documento de UI.
5. **Validar fluxos jurídicos e contratuais com especialistas:** bases legais, avisos de privacidade, retenção, portabilidade, exclusão, TCLE de teleconsulta, contratos com provedores de IA/WhatsApp e regras profissionais vigentes. Os textos do material de pesquisa são insumos, não parecer jurídico atualizado.
6. **Escolher fornecedores e preços de forma reversível:** PSP para cobranças do consultório e da assinatura Nutreza, provedor de vídeo, LLM, transcrição, e-mail e WhatsApp. Revisar custos e termos reais antes de comprometer interfaces. Não publicar preços, depoimentos, métricas ou promessas de capacidade que ainda não existam.
7. **Validar marca e domínio:** checar disponibilidade e anterioridade de “Nutreza” antes de campanha ou registro.

## 3. Arquitetura e modelo de dados

### Aplicação

- `src/app`: rotas de marketing, profissional e paciente; páginas e handlers finos.
- `src/features/<dominio>/{domain,application,infrastructure,ui}`: regras puras, casos de uso, adaptadores e componentes.
- `src/shared`: componentes, design tokens, mensagens PT-BR, tipos e utilitários.
- `supabase/migrations`, `functions`, `seed.sql` e testes de banco versionados no repositório.
- Integrações externas por portas de domínio: `BillingGateway`, `LLMProvider`, `MessagingGateway`, `VideoProvider` e `FileStorage`. Só criar abstrações quando houver uma fronteira externa real.

### Dados e permissões

- Entidades centrais: clínica, perfil/membro, paciente, vínculo de acesso do paciente, anamnese, alergia/restrição, antropometria, consulta/agendamento, plano/versionamento, item/substituição, alimento/fonte, diário, consentimento, cobrança/pacote, configuração/mensagem do agente e auditoria.
- Acrescentar entidades que o rascunho técnico não detalha: assinatura e eventos de cobrança do próprio SaaS, convites, tokens de ativação, tarefas de escalação, notificações, anexos, jobs/outbox e histórico de acesso a prontuário.
- Isolamento por `clinica_id`; vínculo explícito para paciente e profissional. RLS em todas as tabelas expostas, política específica por operação e papel, acesso negado por padrão. Storage privado com políticas coerentes para fotos, documentos, PDFs e logos.
- Prontuário, plano aprovado, consentimento e auditoria precisam de versionamento e trilha de autoria. Alterações clínicas devem preservar histórico; exclusão da conta e retenção de registros clínicos seguem política validada.
- Importação de TBCA/TACO com versão da fonte, licença/atribuição, normalização, medidas caseiras e testes de consistência. O cálculo nutricional usa código determinístico e registra qual versão dos dados produziu o resultado.
- Serviços privilegiados, segredos e chaves de provedores ficam no servidor/Edge Functions. Nenhuma chave privilegiada ou dado clínico vai para analytics do navegador.

### Teca

1. A aplicação monta contexto mínimo autorizado e registra consentimento/aplicabilidade do caso.
2. O modelo gera uma proposta estruturada; esquema valida formato e referências.
3. O motor determinístico recalcula nutrientes e aplica guardas de alergia, restrição e faixas configuradas.
4. O profissional vê fonte, justificativa, diferenças e alertas; edita, descarta ou aprova.
5. A aprovação grava versão, autor, origem, modelo/prompt e decisão no log. Só conteúdo aprovado pode ser entregue ao paciente ou usado pelo agente.
6. Falha do provedor desativa apenas a ação de IA; cadastro, consulta, plano manual, agenda e financeiro permanecem operantes.

## 4. Execução por fases

Estimativa inicial para **2–4 pessoas de engenharia dedicadas**, com apoio periódico de design, nutrição clínica e jurídico. Fases podem se sobrepor após as dependências; estimativas devem ser refeitas após o piloto. Cada fatia entrega migração → regra de domínio → interface → teste → telemetria → documentação.

| Fase | Horizonte indicativo | Entregas verificáveis | Dependências/aceite |
|---|---|---|---|
| **0. Descoberta e especificação** | 2–4 semanas | Jornadas e mapa de telas; backlog com critérios BDD; matriz de papéis; esquema inicial; inventário de dados sensíveis; contratos de integração; protótipos dos fluxos críticos; plano de piloto | Decisões da seção 2 registradas; 5 nutricionistas revisam fluxo clínico e protótipo |
| **1. Fundação técnica** | 2–4 semanas | Git, pnpm/Node LTS, Next.js, TypeScript estrito, shadcn/Tailwind, tokens da marca, Supabase local/staging/prod, Auth, layouts, CI, observabilidade básica, ambientes e segredo gerenciado | Login/cadastro/recuperação, sessão, MFA planejado, tenant isolado; lint, tipos, unitário, E2E e RLS no CI |
| **2. Pacientes e prontuário** | 4–6 semanas | Cadastro/importação simples, busca, anamnese, alergias, antropometria, evolução, anexos, histórico e auditoria; permissões por papel | Profissional registra primeira e segunda consulta sem perder versões; testes RLS entre duas clínicas e paciente |
| **3. Agenda e consulta** | 3–5 semanas | Disponibilidade, agendamento público, remarcação, status/falta, lembretes transacionais, área da consulta e retorno | Conflitos de horário impedidos no banco; fluxos de confirmação/cancelamento idempotentes; alternativa acessível ao arrastar |
| **4. Alimentos e plano manual** | 5–8 semanas | Importador TBCA/TACO, busca com fonte, medidas caseiras, receitas/substituições, motor de cálculos, metas, editor, versionamento, aprovação manual e PDF com marca | Nutricionista reproduz casos de referência; alergia visível; plano publicado somente após aprovação; PDF e PWA básica exibem mesma versão |
| **5. Financeiro do consultório** | 3–5 semanas | Cobrança, Pix por PSP, webhook idempotente, recibo, pacotes e saldo de consultas, conciliação e estorno | Pagamento confirmado pelo evento do PSP; reenvio de webhook não duplica cobrança/consulta; dados financeiros isolados por clínica |
| **6. Teca profissional** | 5–8 semanas | Resumo pré-consulta, nota estruturada revisável, rascunho de plano, RAG com fontes aprovadas, guardas, fila de aprovação, auditoria e limites de uso | Cenários adversariais bloqueiam alergênicos; nenhum rascunho sai para paciente; teste com nutricionistas mede edição, tempo e falhas |
| **7. PWA do paciente** | 4–7 semanas | Convite/ativação, consentimentos, plano/substituições, progresso, diário manual e por foto com confirmação, acessibilidade mobile e sincronização offline do diário | Paciente só acessa seus dados; registro manual funciona sem IA; itens sugeridos por foto exigem confirmação; conflito offline tratado |
| **8. Teleconsulta e WhatsApp** | 5–8 semanas | TCLE versionado, integração de vídeo, templates aprovados, opt-in/opt-out, check-ins, respostas apenas sobre conteúdo aprovado, inbox de escalações | Sem envio sem permissão válida; mensagens duplicadas evitadas; perguntas clínicas fora do escopo viram tarefa para nutricionista |
| **9. Comercialização e gestão** | 4–7 semanas | Landing/preços/cadastro, assinatura Nutreza e limites por plano, equipe/permissões, relatórios, biblioteca, configurações, suporte, exportação de dados e faturamento operacional | Upgrade/downgrade e falhas de cobrança testados; sem promessas ou provas sociais fictícias; relatórios reconciliam com dados fonte |
| **10. Beta, endurecimento e lançamento** | 4–8 semanas | Beta assistido, correções, revisão de segurança/LGPD, testes de carga, backup/restore, runbooks, treinamento, documentação e lançamento gradual | Critérios da seção 6; incidentes críticos resolvidos; restore executado; responsáveis por suporte e resposta a incidentes definidos |

**Ordem crítica:** permissões e prontuário → agenda/consulta → base alimentar/cálculo → plano publicado → Teca → PWA/WhatsApp. A cobrança Pix do consultório pode avançar paralelamente depois que pacientes e agenda estiverem modelados. A assinatura da Nutreza é um domínio separado e entra antes da venda pública.

## 5. Backlog por experiência

| Experiência | Entrega mínima | Ampliação até produto completo |
|---|---|---|
| Site público | Landing, preços, cadastro, login, recuperação, termos/privacidade | Conteúdo/FAQ, demonstração real, comparativo de planos, analytics consentido |
| Nutricionista | Onboarding, início, pacientes/prontuário, consulta, agenda, planos, financeiro | Copiloto global, agente, relatórios, biblioteca, equipe e configurações detalhadas |
| Paciente | Ativação, consentimentos, plano vigente, substituições aprovadas, dados pessoais | Diário por foto, progresso, chat limitado, teleconsulta, exportação e preferências |
| Plataforma | Auth, RLS, Storage, auditoria, e-mail e notificações | Assinaturas, cotas, jobs, observabilidade, backups, portabilidade e suporte |

Usar o blueprint de UI como inventário de telas e estados, mas implementar telas quando a respectiva fatia de negócio existir. Estados vazio, carregando, erro, permissão negada, offline e sucesso fazem parte do aceite da tela.

## 6. Qualidade, segurança e critérios de lançamento

### Para cada entrega

- Cenário BDD em PT-BR antes da implementação; testes unitários em regras e casos de uso; testes de componente para formulários/estados; E2E somente nas jornadas críticas.
- Migração revisada e testada; testes de RLS para acesso permitido e negado, inclusive clínica cruzada, paciente, recepção e Storage. Toda operação sensível gera evento de auditoria adequado.
- `lint`, `typecheck`, testes, build e testes de banco no CI; sem segredos no repositório. Verificar acessibilidade por teclado, contraste e uso em 360 px, além de estados de rede ruins.
- Testes de contrato para webhooks de pagamento e WhatsApp, com assinatura, repetição, ordem de eventos e falha temporária. Jobs repetíveis e fila de falhas com procedimento de reprocessamento.
- Dados fictícios em desenvolvimento e E2E; ambientes separados; observabilidade sem conteúdo clínico em logs; limites de custo e uso por clínica para IA/mensageria.

### Go/no-go da primeira versão vendável

1. Fluxo completo demonstrado com dados reais autorizados: cadastro → agendamento → consulta/prontuário → plano aprovado → paciente visualiza → cobrança Pix conciliada.
2. Testes de isolamento entre clínicas e de acesso do paciente aprovados para todas as tabelas, arquivos e endpoints expostos.
3. Plano da Teca não é publicável com alergênico conhecido; geração sem fonte ou com dados inválidos falha fechada; fluxo manual permanece disponível.
4. Termos, privacidade, consentimentos, contratos com operadores e procedimentos de direitos do titular revisados por responsáveis competentes.
5. Backup e restauração testados; monitoramento, alertas, suporte e resposta a incidentes têm responsáveis e instruções operacionais.
6. Piloto com pelo menos 20 profissionais por quatro semanas, ou decisão explícita documentada sobre um piloto menor; problemas críticos resolvidos antes de ampliar acesso.

### Métricas desde o piloto

- Ativação: tempo até primeiro paciente e primeiro plano aprovado; proporção que conclui o ciclo em 7 dias.
- Fluxo clínico: tempo por consulta/plano, erros corrigidos, aprovação/edição de rascunhos e captura de guardas.
- Operação: faltas, confirmação de consultas, cobrança paga/vencida, falhas de webhook e entregabilidade de mensagens.
- Paciente: ativação do convite, dias com registros, tempo de registro e dúvidas escaladas.
- Negócio: conversão, receita recorrente, custo de IA/WhatsApp/PSP por clínica, churn e suporte. Metas comerciais são hipóteses a validar no piloto, não promessas de lançamento.

## 7. Riscos que podem mudar o cronograma

| Risco | Resposta planejada |
|---|---|
| Qualidade/licença/versionamento das tabelas alimentares | Validar termos de uso e amostras antes do importador; manter fonte e versão em cada cálculo |
| Segurança clínica da IA | Casos adversariais, motor determinístico, bloqueios, revisão humana e liberação gradual por feature flag |
| Vazamento entre clínicas ou pacientes | Matriz de acesso, RLS e testes negativos por entidade, revisão independente antes do beta |
| Dependência de PSP, WhatsApp, vídeo ou LLM | Adaptadores, webhooks idempotentes, monitoramento e fluxo manual/fallback onde couber |
| Escopo excessivo de telas e recursos | Entregar fatias verticais e medir uso; adiar capacidades sem dependência no ciclo principal |
| Questões regulatórias e marca | Revisão especializada e validação atual antes de publicar mensagens comerciais ou operar com dados reais |

## 8. Próximos passos executáveis

1. Realizar oficina curta de produto com 3–5 nutricionistas para fechar o fluxo clínico, campos, regras de cálculo e aprovação.
2. Registrar decisões pendentes da seção 2, especialmente política de override, escopo da primeira versão, PSP e oferta dos planos.
3. Transformar as fases 0–2 em histórias com cenários BDD e estimativas por responsável.
4. Criar o repositório, ambientes e pipeline; implementar a primeira fatia vertical de cadastro de clínica/profissional/paciente com RLS e auditoria.

## Estado da fase 2 (02/10/2026)

A fase 2 foi implementada no ambiente local. Cadastro, busca e importação CSV de pacientes; alergias, anamnese, antropometria, consultas versionadas, documentos privados e histórico de auditoria estão disponíveis na área profissional. Admin e profissional têm acesso clínico; recepção vê somente cadastro; paciente vinculado lê apenas seus dados cadastrais. Testes unitários, BDD, E2E e pgTAP cobrem duas consultas preservadas, importação, anexo/download e RLS entre duas clínicas, recepção e paciente. A ativação da área do paciente e o convite de equipe permanecem nas fases 7 e 9, como previsto no plano.

## Estado da fase 3 (02/10/2026)

A fase 3 foi concluída no ambiente local: disponibilidade, agendamento interno e público, remarcação, status e falta após o início da consulta, lembretes transacionais, evolução vinculada e retorno. O banco bloqueia conflitos e protege duração e intervalo de serviços com consultas existentes. A opção de ocultar serviço afeta apenas o link público. As migrações aplicaram em banco vazio isolado; lint, tipos, 22 testes unitários, 10 E2E, 68 testes SQL locais, 66 em banco vazio, advisors e build passaram. O envio real pelo Resend depende de credenciais e validação na hospedagem. Consulte `STATUS_FASE_3.md`.

## Estado da fase 5 (02/10/2026)

A fase 5 foi implementada no ambiente local: financeiro do consultório com cobrança Pix via Asaas, configuração por clínica com credenciais cifradas, webhook autenticado, conciliação agendada, reprocessamento de eventos, pacotes e créditos vinculados a agendamentos, recibos PDF e estornos. Lint, typecheck, build de produção, migrações locais e advisors passaram. A operação real ainda depende de credenciais sandbox/produção, configuração de `PSP_ENCRYPTION_KEY`, URL HTTPS/webhook e homologação operacional/contábil. Consulte `STATUS_FASE_5.md`; a assinatura SaaS da Nutreza permanece na fase 9.

## Planejamento da fase 6 (02/10/2026)

A fase 6 foi implementada localmente com a Teca profissional, artefatos de resumo/nota/plano, guardas, aprovação humana, auditoria, fontes aprovadas, limites de uso e modo simulado/OpenAI. Typecheck, lint, build, migrações e advisors passaram. A qualidade clínica e a operação com dados reais ainda dependem de avaliação, credenciais e homologação. Consulte [STATUS_FASE_6.md](STATUS_FASE_6.md) e o plano detalhado em [PLANO_FASE_6.md](PLANO_FASE_6.md).

## Estado da fase 7 (02/10/2026)

A área PWA do paciente foi implementada e validada localmente: ativação por convite, consentimentos versionados e revogáveis, plano aprovado/PDF, diário com fluxo manual e sugestões opcionais por foto, progresso, sincronização offline e controles de acesso. Typecheck, lint, build, 25 testes unitários, 120 asserções pgTAP, lint/advisors do Supabase local passaram; os E2E da PWA e plano/PDF passaram. A suíte E2E completa ainda tem uma falha no cenário anterior de disponibilidade da agenda. Privacidade/base legal, contratos e chaves do provedor de visão, dispositivos reais e piloto assistido seguem como gates antes do uso clínico. Consulte [STATUS_FASE_7.md](STATUS_FASE_7.md), [RUNBOOK_FASE_7.md](RUNBOOK_FASE_7.md) e [PLANO_FASE_7.md](PLANO_FASE_7.md).

## Estado das fases 8, 9 e 10 (02/10/2026)

A implementação técnica local das fases 8, 9 e 10 foi concluída. Teleconsulta e WhatsApp estão descritos em [STATUS_FASE_8.md](STATUS_FASE_8.md); comercialização e gestão em [STATUS_FASE_9.md](STATUS_FASE_9.md); endurecimento e lançamento em [STATUS_FASE_10.md](STATUS_FASE_10.md). O procedimento operacional está em [RUNBOOK_FASE_8_10.md](RUNBOOK_FASE_8_10.md). Credenciais, contratos, revisão jurídica/clínica, restore em staging, piloto humano e publicação continuam como gates externos.

## Fontes internas

- `Nutreza Build Prompt — Next.js Supabase TDD-BDD (1).md`: stack, arquitetura, modelo inicial, TDD/BDD e ordem técnica.
- `Kimi_Agent_Nutrition SaaS UI_UX Blueprint/relatorio-saas-nutricionistas/UI-UX Master Prompt — Every Page of the Nutritionist SaaS.md`: telas, estados e critérios de UX.
- `Kimi_Agent_Nutrition SaaS UI_UX Blueprint/relatorio-saas-nutricionistas/SaaS para Nutricionistas com Agente de IA — Pesquisa Aprofundada.md`: prioridades, riscos e marcos de produto.
- `Kimi_Agent_Nutrition SaaS UI_UX Blueprint/brand-nutreza/Manual de Marca — Nutreza.md`: identidade, tom e aplicação de marca.
