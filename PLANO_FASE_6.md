# Plano de execução — fase 6: Teca profissional

**Estado:** planejamento (02/10/2026). **Fonte de escopo:** fase 6 do `PLANO_IMPLEMENTACAO.md`. **Resultado esperado:** o profissional prepara a consulta, revisa uma nota estruturada e monta um plano alimentar com ajuda da Teca. Toda saída clínica nasce como rascunho, mostra suas fontes e só chega ao paciente após revisão e aprovação humana registrada.

## 1. Escopo e decisões de produto

| Dentro da fase 6 | Fronteira |
|---|---|
| Resumo pré-consulta, nota estruturada revisável e rascunho de plano | A Teca não diagnostica, prescreve nem conclui consulta sozinha. |
| Recuperação de fontes aprovadas da biblioteca clínica e fatos autorizados do prontuário | A TBCA só entra após a autorização e carga legítima pendentes da fase 4. O catálogo TACO e fontes próprias aprovadas já permitem iniciar. |
| Guardas clínicas determinísticas, fila de revisão, auditoria e limites de uso | Nenhum alerta crítico pode ser dispensado por um texto de justificativa. Desvio não crítico pode ter exceção justificada conforme política clínica aprovada. |
| Pontos de entrada na consulta, prontuário, editor de plano e painel da Teca | O copiloto global fica restrito a estes três fluxos e fontes citadas. Ações autônomas e perguntas livres sobre todo o banco exigem escopo próprio. |
| Plano aprovado no app/PDF já existentes | Diário por foto, agente de WhatsApp, envio de mensagens, teleconsulta e transcrição de áudio ficam nas fases 7–8 ou em decisão posterior. |

**Decisões a registrar na etapa 0:** responsável clínico e critérios de revisão; provedor/modelo e orçamento; contrato e base legal para enviar dados de saúde ao provedor; retenção de rascunhos; política de restrições, validade das fontes e tolerâncias nutricionais; quem pode ativar a Teca por clínica. A hipótese técnica é um adaptador OpenAI via Responses API com saída estruturada, sem fixar um modelo antes dos ensaios de qualidade/custo. O contrato `LLMProvider` permite trocar o adaptador.

## 2. Base existente e mudanças necessárias

- Reusar `paciente`, `alergia`, `anamnese`, `antropometria`, `evolucao`, `agendamento`, `plano_alimentar`, `plano_refeicao`, `plano_item`, `alimento`, `receita` e `audit_log`. A evolução e o plano já preservam versões; o cálculo de nutrientes e os snapshots de fonte dos itens já ocorrem no banco.
- Hoje `approvePlan` exige a confirmação manual `alergias_revisadas`, mas não executa as guardas clínicas da Teca. A fase 6 deve colocar a validação determinística na mesma transação de aprovação para **planos manuais e de IA**, impedindo aprovação por chamada direta ou com dado clínico alterado depois da geração.
- Criar migrações aditivas para `teca_config`, `teca_fonte`, `teca_trecho`, `teca_execucao`, `teca_artefato`, `teca_guarda`, `teca_decisao` e `teca_uso`. Vínculos imutáveis identificam clínica, paciente, consulta/plano, autor, versão do prompt/modelo, versões e hashes do contexto, fontes citadas, custo e estado. Conteúdo clínico fica em tabela restrita; `audit_log` recebe somente IDs, tipo de ação e autoria.
- Adicionar a `plano_alimentar` e `evolucao` origem (`humano`/`teca`), ID do artefato de origem e aprovação por profissional, sem alterar versões já publicadas. Uma decisão transacional cria a nova versão clínica e marca o artefato como aprovado uma única vez.
- RLS e grants explícitos em cada tabela: `admin` e `profissional` podem consultar rascunhos da própria clínica e pacientes autorizados; `recepcao` e paciente não leem artefatos da Teca. A área do paciente continua consultando apenas plano `aprovado`. O servidor reconfirma vínculo de clínica e papel em cada geração e decisão; chaves do provedor permanecem no servidor.

## 3. Sequência de entrega

| Etapa | Prazo indicativo | Entrega verificável | Critério de avanço |
|---|---:|---|---|
| **0. Contratos clínicos e dados** | 3–5 dias | Casos BDD e matriz de permissões; taxonomia de alergênicos/sinônimos, ingredientes de receitas, contraindicações conhecidas e limites de energia/macros revisados por nutricionistas; fonte documental e licença inventariadas; política de dados com o provedor aprovada. | Há regras para casos normais, dados ausentes e alertas críticos, além de conta de teste e orçamento definido. |
| **1. Domínio, migrações e isolamento** | 4–6 dias | Modelo de execuções, artefatos, fontes, decisões e uso; estados e transições; RLS, índices, auditoria, limite de dados clínicos e vínculo com versões de evolução/plano. | Duas clínicas, quatro papéis e tentativa de acesso por paciente passam em testes SQL; aprovado não volta a rascunho. |
| **2. Contexto e adaptador de IA** | 4–6 dias | Leitor de contexto mínimo por tarefa, contrato `LLMProvider`, adaptador real e simulado, esquemas Zod/JSON, timeout, recusa, retry limitado, chave idempotente e rastreio de custo. | Nenhum campo de outra clínica entra no prompt; falha do provedor deixa o fluxo manual utilizável. |
| **3. Fontes aprovadas e recuperação** | 5–7 dias | Importação, revisão, versão, revogação e indexação de documentos; busca híbrida textual/vetorial com filtros de clínica, licença e aprovação; referências estáveis por trecho. | Resultado sem fonte ou com fonte revogada falha fechado; uma citação sempre resolve para o trecho exato usado. |
| **4. Três fluxos da Teca** | 8–12 dias | Resumo pré-consulta, nota estruturada e proposta de plano por IDs de alimentos/receitas existentes; edição, descarte, regeneração controlada e criação de versão clínica após decisão. | Cada saída mostra origem, incertezas e fontes; nenhuma escrita clínica acontece só pela resposta do modelo. |
| **5. Guardas e aprovação** | 5–7 dias | Verificador de alergias, ingredientes, contraindicações codificadas, dados ausentes, metas e composição; checagem de frescor do contexto e aprovação atômica. | Todos os casos críticos do corpus adversarial bloqueiam aprovação, inclusive chamada direta à ação/API. |
| **6. Interface e operação** | 4–6 dias | Fila `/app/teca`, cards no painel, resumo na consulta, nota revisável e editor de plano com chip “Sugerido pela Teca”, alertas específicos, fontes, estados vazios/erro e uso visível. | Jornada por teclado e em 360 px; o profissional sabe o que foi sugerido, editado, bloqueado e aprovado. |
| **7. Avaliação e liberação gradual** | 5–7 dias | Testes unitários/SQL/E2E, avaliação clínica, medição de latência/custo, ensaio de indisponibilidade e piloto por clínica com flag. | Matriz de aceite abaixo aprovada; responsáveis clínico, segurança e operação registram o go/no-go. |

**Prazo:** 5–8 semanas com 2–4 pessoas de engenharia, nutricionistas revisores e etapas sobrepostas, como no plano principal. Em sequência por uma pessoa, estimar 8–12 semanas; reestimar após as decisões da etapa 0. Nenhum prazo inclui demora contratual para uso de dados de saúde ou licença de fontes.

## 4. Contratos dos três fluxos

1. **Resumo pré-consulta:** selecionar somente dados necessários do paciente/consulta autorizados: alergias ativas, anamnese vigente, medidas recentes, evoluções anteriores e plano aprovado atual. Produzir fatos com referência para registro, versão e data; destacar lacunas e conflitos. Não criar fato ausente nem mostrar cobrança/financeiro. O resumo é um artefato interno revisável e não substitui o prontuário.
2. **Nota estruturada:** receber relato digitado pelo profissional e contexto autorizado; retornar `queixa`, `avaliacao`, `conduta`, pendências e referências. Salvar como rascunho separado. A ação “Aceitar no prontuário” exige revisão de cada seção, revalida a versão anterior e cria uma nova `evolucao`; conflito de versão pede revisão antes de salvar. Rejeição preserva metadados de auditoria, sem gravar a nota como evolução.
3. **Plano alimentar:** profissional informa objetivo, metas, dias, refeições, preferências e exclusões; a Teca só pode propor IDs de alimentos/receitas pré-selecionados e quantidades. O servidor valida IDs, porções e disponibilidade, materializa `plano_alimentar` em rascunho e deixa o banco recalcular nutrientes/snapshots. Texto do modelo nunca fornece o total nutricional definitivo. O editor existente recebe o rascunho com alertas e fontes; aprovação humana publica uma versão imutável.

**Esquemas de saída:** campos obrigatórios, limites de tamanho, enumerações, referências de fonte por ID e tratamento explícito de recusa/saída incompleta. Uma saída conforme JSON Schema ainda passa por validação de domínio e confirmação no banco. No adaptador OpenAI, usar Structured Outputs da Responses API; configurar `store: false` para evitar persistência de estado da resposta, observando que controles de retenção e logs do provedor precisam de avaliação contratual própria. [OpenAI Docs: Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [OpenAI Docs: Data controls](https://developers.openai.com/api/docs/guides/your-data).

## 5. Recuperação, guardas e decisão

- **Duas trilhas de contexto:** fatos do prontuário vêm de consultas SQL autorizadas e versionadas; documentos de conhecimento vêm apenas de biblioteca aprovada. Indexar conteúdo clínico geral e da clínica no Postgres com busca textual e `pgvector`; não criar embeddings de prontuários individuais nesta fase. Filtrar por clínica, status, versão e licença **antes** de montar o contexto. Revogação retira trechos da busca e impede novas gerações com eles. [Supabase: pgvector](https://supabase.com/docs/guides/database/extensions/pgvector).
- **Citação verificável:** o modelo pode citar apenas IDs entregues pelo recuperador. O servidor confere cada ID e guarda edição/trecho exatos. Referência sem trecho, versão ou permissão válida é rejeitada; não inventar bibliografia. Conteúdo recuperado é dado não confiável: instruções inseridas em documentos não alteram papel, permissões ou ferramentas.
- **Guardas críticas:** alergênico direto, sinônimo ou ingrediente de receita; restrição/contraindicação codificada aplicável; alimento/receita desconhecido; composição essencial ausente; porção inválida; contexto clínico obrigatório ausente ou alterado; referência incompatível; duplicidade de itens e combinações proibidas pela política clínica. Estado `bloqueado`; só correção e nova avaliação removem o bloqueio. Alegação de “sem alergênicos” exige metadados conferidos, não ausência de etiqueta.
- **Guardas não críticas:** desvio de meta energética/macros e alertas nutricionais dentro de faixas clínicas definidas. Exceção somente por `admin`/`profissional` habilitado, com justificativa tipada, valor antes/depois e auditoria. Tolerâncias e quem pode aceitar cada exceção precisam de versão; nenhuma regra clínica fica apenas no prompt.
- **Aprovação atômica:** bloquear o plano/artefato, reler alergias, restrições, itens, metas e versões de fonte, recalcular nutrientes, reexecutar guardas e validar identidade do aprovador dentro da transação. Se o paciente ou a fonte mudou, devolver para revisão. Gerar exatamente uma decisão e uma versão aprovada. Downloads e PWA leem somente a versão aprovada.

## 6. Segurança, privacidade e custo

- Começar com provedor simulado e dados fictícios. Dados reais só após revisão de contrato, finalidade/base legal, informação ao titular, retenção, subprocessadores, transferência e controle de acesso. Enviar contexto mínimo, sem documentos inteiros, email, telefone ou financeiro quando irrelevantes. O API key e modelo ficam em variáveis de servidor, com projetos de teste/produção separados.
- Por padrão a documentação atual da OpenAI informa que dados da API não treinam modelos sem opt-in, mas logs de monitoramento podem reter conteúdo por até 30 dias; Zero Data Retention requer aprovação específica. O plano **não presume** que a conta da Nutreza tenha esse controle. Revisar a política efetiva antes de usar prontuários reais. [OpenAI Docs: Data controls](https://developers.openai.com/api/docs/guides/your-data).
- Limites por clínica e por usuário: número de gerações/dia, tokens máximos por tarefa, simultaneidade, orçamento mensal, cancelamento e cooldown. Registrar uso/custo estimado com IDs e métricas, sem prompt ou resposta em logs de infraestrutura. Falha por limite, recusa, timeout ou 429 mostra ação de retry sem duplicar artefato; fluxo manual continua disponível. [OpenAI Docs: Rate limits](https://developers.openai.com/api/docs/guides/rate-limits).
- Feature flag por clínica, desativação imediata e implantação em etapas. Monitorar taxa de erro, recusas, custo, latência, bloqueios críticos e fila de aprovação; alertar sobre falha persistente e orçamento. Alterações de prompt/modelo exigem versão, avaliação e rollback.
- Seguir a skill Supabase na execução: conferir changelog e docs atuais, criar migrações pela CLI, revisar grants/RLS e funções privilegiadas, verificar `migration list`, consultas de teste e `db advisors`. A Data API exige tanto grants quanto RLS nos objetos expostos. [Supabase: Securing your API](https://supabase.com/docs/guides/api/securing-your-api).
- Antes de editar rotas/componentes Next.js, ler os guias relevantes em `node_modules/next/dist/docs/`, conforme `AGENTS.md`.

## 7. Matriz de aceite obrigatória

| Área | Cenários de verificação |
|---|---|
| Isolamento | Duas clínicas, paciente, recepção e profissional sem vínculo não leem nem geram artefatos/fonte de outro escopo. Serviço privilegiado nunca escolhe clínica a partir do payload do modelo. |
| Rascunho e publicação | Resumo/nota/plano nascem rotulados; paciente não lê nada da Teca antes de aprovação; recusa e descarte não publicam; dupla aprovação gera uma única versão. |
| Guardas | Amendoim oculto em pasta, receita e sinônimo; alergia adicionada após a geração; alimento sem classificação; macronutrientes/energia extremos; referências falsas ou revogadas: todos impedem aprovação quando críticos. |
| Fatos e fontes | O resumo apresenta registro e data de cada fato; conflito entre versões é visível; citação só aponta para trecho permitido e existente; prompt injection em fonte não muda comportamento. |
| Cálculo e revisão | Plano da Teca usa IDs válidos, nutrientes recalculados pelo motor da fase 4 e mesmo resultado em editor/PDF/PWA. A nota aceita cria nova versão de `evolucao`; alterações humanas ficam distinguíveis da sugestão. |
| Resiliência e custo | Timeout, 429, recusa, resposta inválida, orçamento esgotado e retry não duplicam artefato, não perdem dados manuais e não criam publicação; custo/uso e erro ficam rastreáveis sem PHI em logs. |
| Qualidade e UX | `pnpm lint`, `pnpm typecheck`, testes unitários/BDD/E2E/SQL, `pnpm build`, migrações em banco vazio e `supabase db advisors` passam. Fluxos críticos funcionam por teclado, em 360 px e com estados de carregamento/erro. |

**Avaliação clínica antes do piloto:** preparar no mínimo 50 casos fictícios ou autorizados, incluindo pelo menos 20 adversariais, revisados por 3–5 nutricionistas. Registrar para cada tarefa acerto factual com fonte, omissões, alertas, edições, tempo até concluir e motivo de descarte. Exigir 100% de bloqueio nos casos críticos do corpus, zero publicação sem profissional e zero vazamento entre clínicas; definir antes da coleta o patamar de utilidade e tempo frente ao fluxo manual. Toda falha crítica exige correção e repetição da avaliação. A documentação oficial recomenda avaliações próprias, exemplos adversariais e supervisão humana para sistemas generativos. [OpenAI Docs: Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices), [OpenAI Docs: Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices).

## 8. Ordem de início e entrega final

1. Fechar a etapa 0 e registrar decisões, corpus de casos e orçamento.
2. Implementar migrações, contratos e provedor simulado; demonstrar os três artefatos sem API externa.
3. Integrar o provedor escolhido e a biblioteca aprovada com dados fictícios; concluir guardas e aprovação transacional.
4. Liberar em staging para nutricionistas revisores; medir casos normais/adversariais e corrigir falhas.
5. Ativar em uma clínica piloto com dados autorizados, limites baixos, observabilidade e responsável pela revisão diária; ampliar somente após o go/no-go clínico e de segurança.

**Definição de fase 6 concluída:** os três fluxos funcionam de ponta a ponta, RAG cita apenas fontes aprovadas, guardas e aprovação resistem a chamadas diretas/concorrentes, isolamento e testes passam, o piloto clínico é aprovado e a operação tem custo, monitoramento e desativação definidos. Credenciais ou revisão contratual pendentes permitem concluir código local, mas não permitem declarar uso clínico real liberado.
