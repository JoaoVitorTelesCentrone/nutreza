# Plano de execução da fase 8 — teleconsulta e WhatsApp

**Base em 02/10/2026.** Este plano detalha a fase 8 de [PLANO_IMPLEMENTACAO.md](PLANO_IMPLEMENTACAO.md). É um plano de execução; a integração e os gates externos ainda não foram realizados.

## 1. Resultado e limites

Ao final, uma consulta marcada como online permite que profissional e paciente vinculados entrem em uma sala de vídeo privada dentro de uma janela controlada, após apresentação e registro do TCLE vigente. A clínica pode enviar mensagens de WhatsApp consentidas e aprovadas, receber respostas, realizar check-ins simples e tratar perguntas clínicas em uma caixa de pendências. Envio, resposta, opt-out e escalonamento têm histórico e operação de contingência.

Não transmitir prontuário, fotos, dados sensíveis detalhados, rascunhos da Teca ou PDF de plano pelo WhatsApp. Mensagem com conteúdo de plano deve conter, no máximo, uma indicação neutra e um link autenticado para a PWA; respostas automáticas só podem usar informações aprovadas para aquele paciente e uma biblioteca publicada pela clínica. A IA generativa não terá permissão de responder livremente ao paciente. Gravação, transcrição e análise de vídeo ficam fora desta fase até haver finalidade, contratos e controles próprios aprovados.

## 2. Situação encontrada no projeto

| Peça existente | Reuso e trabalho necessário |
|---|---|
| `agenda_servico.tipo` aceita `online`; `agendamento` tem paciente, profissional, início, fim e status | Acrescentar sessão de vídeo e checagem de elegibilidade. O tipo `retorno` não indica modalidade; definir modalidade explícita no serviço/agendamento antes de habilitar vídeo para retornos. |
| Área do paciente, vínculo `paciente_acesso`, consentimentos versionados por evento e termos | Criar finalidades separadas para TCLE, contato WhatsApp e check-ins. Remover a dependência da versão fixa `2026-10-02-v1` das telas e ações; buscar a última versão publicada de cada finalidade. |
| Plano aprovado, substituições e fontes da Teca | Construir uma projeção mínima, somente leitura, da versão publicada. Nada gerado ou em rascunho pode alimentar resposta ao paciente. |
| Lembretes por e-mail com fila e job | Aproveitar o padrão de outbox, tentativas, idempotência e observabilidade. Não acoplar WhatsApp ao sucesso do e-mail nem enviar dentro de transações da agenda. |
| CI com testes de banco e Playwright | Acrescentar contratos de webhook e jornadas críticas. Antes do aceite final, resolver o E2E antigo de agenda que terminou 11/12 na fase 7. |

## 3. Decisões de produto a registrar no início

1. **TCLE e atendimento:** texto e versão aprovados por responsáveis clínico/jurídico; quando renovar, exigir novo aceite antes do próximo ingresso. Definir tratamento de recusa, paciente sem conta, responsável legal e consulta de retorno. Para o piloto, restringir vídeo a paciente adulto com conta verificada e agendamento confirmado.
2. **Provedor de vídeo:** recomendar uma prova de conceito com LiveKit, que oferece token de acesso por sala e papel, SDK web e eventos de sala. Validar contrato, região de dados, retenção, disponibilidade, custo e experiência iOS/Android antes da contratação. Manter `VideoProvider` como fronteira do servidor, com implementação simulada para testes. A recomendação é técnica, não aprovação contratual.
3. **WhatsApp:** usar API oficial da plataforma, diretamente ou por BSP que ofereça os mesmos controles. No piloto, uma configuração/identidade de envio por clínica, com número e templates aprovados. Avaliar onboarding, titularidade do número, custos e suporte antes de selecionar o operador. Não usar automação de WhatsApp Web.
4. **Identidade do destinatário:** validar e normalizar telefone, confirmar a associação do número ao paciente e permitir atualização assistida. O telefone digitado em reserva pública, sozinho, não autoriza receber dados nem vincula conversa ao prontuário.
5. **Janelas e disponibilidade:** definir horário de atendimento humano e prazo real de retorno por clínica. A interface não promete resposta automática em prazo que a operação não consegue cumprir.
6. **Escopo de check-ins:** começar com lembrete de consulta e uma pergunta neutra de acompanhamento; clínico aprova texto e cadência. Sem cobrança de registro ou avaliação automática de adesão no piloto.

## 4. Arquitetura e dados

### Teleconsulta

- Migração aditiva para `teleconsulta_sessao` (`clinica_id`, `agendamento_id` único, `paciente_id`, `profissional_id`, referência opaca da sala, estado, início/fim e auditoria) e `teleconsulta_evento` técnico. Chaves compostas mantêm todos os vínculos na mesma clínica. Não armazenar token de vídeo nem mídia no banco.
- Modelar modalidade de forma inequívoca: `presencial`/`online` no agendamento, derivada do serviço no momento da reserva, com regra de migração para serviços atuais e bloqueio de mudanças incompatíveis após confirmação. O serviço `retorno` exige escolha explícita de modalidade.
- Emitir token curto exclusivamente no servidor para usuário autenticado e autorizado. Profissional precisa ser o designado (ou substituto formal); paciente precisa do vínculo com o agendamento. Janela de entrada configurável em torno de `inicio`/`fim`; cancelamento, falta e remoção de vínculo bloqueiam emissão de novo token. Encerrar sala quando aplicável e testar revogação de participante conectado conforme capacidade real do provedor.
- Registrar TCLE aceito com `termo_versao_id`, ator, agendamento, instante e versão íntegra recuperável. Tratar ciência/aceite do TCLE separadamente dos consentimentos opcionais da PWA. Profissional vê o estado; só paciente (ou representante validado em fluxo futuro) aceita.
- Rotas sugeridas: `/paciente/consulta/[id]`, `/app/agenda/[id]/teleconsulta`, `/api/teleconsulta/[id]/token` e webhook do provedor. Pré-entrada mostra data, profissional, TCLE, teste de câmera/microfone e alternativa para falha. Não colocar token no URL ou em logs.

### Mensageria

- Tabelas `mensageria_config` (clínica, provedor, número remetente, limites e horários), `mensageria_template` (tipo, versão, texto aprovado, identificador/status no provedor), `mensageria_conversa` (clínica, paciente, telefone confirmado, janela), `mensageria_mensagem` (direção, estado, ID do provedor, categoria, timestamps, referência ao conteúdo aprovado), `mensageria_evento` (webhook deduplicado), `mensageria_outbox` (chave de idempotência, agendamento, tentativas, trava e erro), `mensageria_escalacao` (responsável, prioridade, estado e prazo) e `mensageria_checkin` (campanha/ocorrência/resposta). Guardar apenas o conteúdo necessário para atendimento e auditoria, com política de retenção definida.
- Criar versões publicadas dos termos `contato_whatsapp`, `checkin_whatsapp` e, se houver conteúdo educativo, uma finalidade própria. Eventos de opt-in/opt-out por paciente, clínica, número, canal, finalidade, texto/versão, origem e horário. Revogação, bloqueio recebido do canal e `PARAR` impedem novas mensagens antes de consultar o provedor. Reativação exige novo aceite verificável.
- Usar porta `MessagingGateway` com adaptador oficial e simulado. Webhook valida assinatura sobre corpo bruto, limita tamanho, deduplica por ID de evento/mensagem, persiste primeiro e responde rapidamente; worker processa em separado. Mensagens de status podem chegar fora de ordem: aplicar transições monotônicas e registrar evento original. Nunca usar texto ou telefone recebido para descobrir paciente por semelhança de nome.
- Outbox transacional registra intenção após checar consentimento, configuração, template aprovado e paciente vinculado; worker revalida essas condições imediatamente antes do envio. Uma chave única por clínica + finalidade + ocorrência impede duplicatas. Retry com backoff, limite e fila de falhas; reprocessamento manual só após nova validação. Cotas por clínica/dia e kill switch global/clínica protegem custo e operação.
- Respostas automáticas: somente perguntas reconhecidas de intenção limitada (horário/local da consulta, como abrir a PWA, substituições expressamente aprovadas do plano vigente). Gerar respostas a partir de dados estruturados autorizados ou texto de biblioteca publicado, com referência de versão. Ambiguidade, alergia, sintoma, mudança de dieta, medicação, urgência ou qualquer pergunta fora dessas intenções cria escalonamento e envia apenas confirmação neutra. Ao mudar ou revogar plano, invalidar a projeção de respostas. Teca não publica diretamente no canal.
- Caixa `/app/agente` ou `/app/mensagens`: filtro por pendente/atribuída/resolvida, paciente, último evento, consentimento, origem e prazo; equipe clínica assume e responde manualmente dentro da política do canal. Recepção vê somente metadados operacionais permitidos. Histórico de leitura/resposta em auditoria. Paciente vê preferências e, se houver chat na PWA, o mesmo escopo e fila de escalonamento.

## 5. Sequência de execução

| Etapa | Entrega verificável | Aceite para avançar |
|---|---|---|
| **0. Contratos, jornadas e baseline** | Decisões da seção 3, telas/estados, matriz de acesso, casos BDD, textos em revisão, mocks de vídeo/WhatsApp e correção do E2E de agenda. | Fluxos de recusa, queda de vídeo, opt-out, pergunta clínica e indisponibilidade do provedor descritos; suíte atual verde. |
| **1. Dados e consentimentos** | Migrações aditivas, termos publicados, consentimento por finalidade, modelo de teleconsulta/mensageria, RLS, grants e auditoria. | Paciente A/B, clínicas A/B e recepção isolados; nova versão exige reaceite quando aplicável; revogação bloqueia escrita/envio. |
| **2. Vídeo ponta a ponta** | Sala e token temporário, páginas profissional/paciente, pré-entrada, teste de dispositivo, TCLE, eventos e estado pós-chamada. | Dois usuários corretos entram; terceiro/cancelado/fora da janela não entra; recusa do TCLE bloqueia; falha tem fallback de remarcação/contato. |
| **3. Transporte WhatsApp** | Número/configuração por clínica, templates aprovados, webhook assinado, outbox, worker, reprocessamento e painel de entrega. | Webhook inválido rejeitado; replay/out of order e retry não duplicam mensagem; sem opt-in ou após opt-out, nenhuma chamada ao provedor. |
| **4. Check-ins e respostas limitadas** | Cadência, horário local, preview/aprovação de templates, interpretação de respostas curtas, conteúdo aprovado por versão e escalonamento. | Pergunta clínica vira pendência; resposta automática aponta para conteúdo vigente; cancelamento/novo plano impede envio antigo. |
| **5. Inbox e PWA** | Inbox de escalações, atribuição/resolução, preferências no perfil, histórico mínimo de mensagens e chat PWA somente se houver paridade de guardas. | Profissional consegue resolver sem acessar outra clínica; paciente revoga e vê efeito; UX mobile/teclado/erros acessível. |
| **6. Endurecimento e piloto** | Testes de contrato, SQL, E2E, carga de jobs, dispositivos reais, monitoramento, custo, runbooks, homologação e piloto assistido. | Matriz da seção 6 aprovada, falhas críticas resolvidas e responsáveis operacionais definidos. |

**Estimativa:** 5–8 semanas com 2–4 pessoas de engenharia e apoio clínico, jurídico e operacional, depois de contas de sandbox e textos disponíveis. Com uma pessoa, reestimar após prova de conceito; não prometer prazo de aprovação de número, templates ou contratos externos.

## 6. Matriz de aceite da fase

| Área | Cenários obrigatórios |
|---|---|
| TCLE/vídeo | Primeiro acesso, versão nova, recusa, sessão expirada, fora da janela, remarcação, cancelamento, paciente/profissional errados, câmera negada, queda/reconexão, dois aparelhos, término da consulta. |
| Isolamento | Outra clínica, outro paciente, recepção, URL direta, token reutilizado/expirado, webhook forjado, cliente sem vínculo e consulta pública ainda não vinculada. |
| Consentimento WhatsApp | Sem opt-in, opt-in por finalidade, número alterado, `PARAR`, revogação na PWA, reaceite, revogação entre enfileirar e enviar, kill switch e conta desativada. |
| Mensagens | Template recusado, janela do provedor fechada, limite de envio, 429/5xx/timeout, assinatura inválida, replay, eventos fora de ordem, callback de entrega repetido, destinatário inexistente, reprocessamento sem duplicata. |
| Conteúdo | Apenas plano aprovado e biblioteca publicada; plano revogado/atualizado; alergia, sintoma, medicação e solicitação de prescrição sempre escalados; nenhuma promessa automática de prazo sem configuração operacional. |
| Operação | Inbox com atribuição e SLA, alertas de fila parada/erro/custo, métricas sem conteúdo clínico, política de retenção, descarte, exportação aplicável, runbook de incidente e fallback por e-mail/telefone. |
| Qualidade | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, SQL/pgTAP, advisors, E2E e contratos; revisão manual a 360 px, teclado, leitor de tela, Safari/iOS e Chrome/Android. |

## 7. Configuração, observabilidade e gates externos

- Em `.env.example`, documentar somente nomes das variáveis de vídeo e WhatsApp, sem credenciais reais. Separar sandbox/staging/produção, URL HTTPS, segredo de webhook, chave do servidor, IDs de número/template, flags e limites. Rotação e armazenamento de segredo ficam no servidor.
- Métricas: emissão negada de token, tentativa de ingresso, falha de mídia, abandono antes do ingresso, fila pendente, taxa de entrega, opt-out, escalonamentos sem responsável, tempo de resolução e custo por clínica. Logs usam IDs técnicos; corpo de mensagem, telefone, dados clínicos e tokens não entram em analytics.
- Runbooks: provedor de vídeo fora, câmera negada, mensagem enviada ao número errado, opt-out não aplicado, webhook indisponível, fila presa, template suspenso, custo anômalo e pedido de acesso/exclusão de dados. Prever desligamento imediato de mensagem automática sem desligar agenda e PWA.
- Antes de uso real, obter TCLE/textos e fluxo de dados aprovados, contratos de operadores, número e templates habilitados, decisão de retenção, homologação em aparelhos e piloto assistido com pelo menos duas clínicas de teste. Implementação local concluída deve ser relatada separadamente da liberação clínica.

## 8. Referências técnicas para validar na implementação

- [LiveKit: tokens e permissões](https://docs.livekit.io/home/server/generating-tokens) e [eventos/webhooks](https://docs.livekit.io/intro/basics/rooms-participants-tracks/webhooks-events/).
- [Coleção oficial Meta da API de mensagens](https://www.postman.com/meta/whatsapp-business-platform/folder/13382743-ba8d099d-007e-4b52-b9f2-3cf3c60e4fbc), [templates](https://www.postman.com/meta/whatsapp-business-platform/request/lwtlz1k/send-message-template-interactive) e [política do WhatsApp Business](https://whatsappbusiness.com/policy/).
- [Supabase Queues](https://supabase.com/docs/guides/queues), [Cron](https://supabase.com/docs/guides/cron) e [changelog](https://supabase.com/changelog?types=breaking-change). Na implementação, verificar as versões atuais, grants e RLS. A mudança anunciada de exposição de tabelas pela Data API exige conferir grants explicitamente.
- `AGENTS.md` exige ler os guias locais em `node_modules/next/dist/docs/` antes de editar Next.js. Rotas de webhook e token são endpoints públicos por padrão e precisam de autenticação/autorização próprias: [Next.js Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend).
