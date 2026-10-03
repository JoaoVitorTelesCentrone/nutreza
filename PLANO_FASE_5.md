# Plano de execução — fase 5: financeiro do consultório

**Estado:** planejamento. **Base:** `PLANO_IMPLEMENTACAO.md`, fase 5. **Objetivo:** permitir que a clínica cobre consultas e pacotes por Pix, acompanhe recebimentos, emita recibos, use créditos de consultas e reconcilie estornos sem duplicidade ou mistura de dados entre clínicas.

## Limites e decisões iniciais

- A fase 5 trata **recebíveis da clínica perante seus pacientes**. Assinatura e faturamento da própria Nutreza pertencem à fase 9.
- A primeira forma de pagamento será Pix avulso via um PSP. Boleto, cartão, Pix Automático e cobrança recorrente só entram se uma decisão explícita ampliar esta fase. O blueprint de UI mostra essas opções como visão do produto, mas o aceite da fase 5 no plano principal exige Pix.
- **PSP candidato para a primeira integração:** Asaas, sujeito a validação comercial, contratual e de API antes da implementação. O domínio usará `BillingGateway`, mas apenas um adaptador real será entregue nesta fase.
- **Decisão pendente prioritária:** cada clínica receberá na própria conta do PSP, ou a Nutreza receberá e fará repasses? A primeira opção é a hipótese de planejamento. A segunda muda titularidade, cadastro, conciliação, estornos, suporte e revisão jurídica; fechar antes da fatia de integração.
- Definir quem pode criar, cancelar e estornar cobranças: proposta de `admin` para configuração/estorno e `admin`/`recepcao` para criação e consulta; `profissional` consulta o financeiro dos próprios atendimentos somente se a política da clínica permitir. Nenhum papel altera pagamento confirmado manualmente.
- Confirmar com operação/contabilidade o conteúdo do recibo, numeração, dados do emissor e tratamento fiscal. O recibo do app é comprovante do recebimento e não substitui documento fiscal exigível.

## Sequência de entrega

| F, prazo indicativo | Entrega demonstrável | Aceite para avançar |
|---|---|---|
| **0. Contratos e sandbox (2–3 dias)** | Escolher titularidade/PSP, obter conta sandbox, mapear cadastro de pagador, Pix, eventos, devoluções, limites e taxas; aprovar política de cancelamento, falta e pacote. BDD e matriz de papéis. | Há credenciais de teste, eventos reproduzíveis e decisões registradas. |
| **1. Domínio e banco (3–4 dias)** | Migrações para configuração de PSP por clínica, cliente externo, cobrança, tentativas, eventos recebidos, pagamento, devolução, pacote, compra, crédito/uso e recibo. RLS, auditoria, índices e constraints. | Duas clínicas e todos os papéis passam em testes SQL; invariantes resistem a chamadas concorrentes. |
| **2. Cobrança Pix (3–5 dias)** | Contrato `BillingGateway` e adaptador; cadastro de cliente, criação de cobrança com referência interna, QR Code/copia e cola, vencimento, cancelamento permitido, reconsulta e falhas/retentativas. | Cobrança aparece pendente; nenhuma criação ou retry produz duas cobranças efetivas para a mesma operação. |
| **3. Webhook e conciliação (4–5 dias)** | Endpoint autenticado, inbox durável, worker de processamento, transições monotônicas, reconciliação agendada com API do PSP, alertas e reprocessamento. | Pagamento só é reconhecido após evento/consulta confiável do PSP; eventos repetidos, fora de ordem e concorrentes não duplicam efeitos. |
| **4. Pacotes, recibos e estornos (4–5 dias)** | Venda de pacote, saldo e consumo vinculado a agendamento, regras de cancelamento/falta, recibo PDF após recebimento, devolução total/parcial e ajuste de saldo. | Compra só gera créditos após recebimento; uso/estorno concorrentes não deixam saldo negativo; recibo preserva o histórico original. |
| **5. Telas e operação (3–4 dias)** | `/app/financeiro` e aba financeira do paciente: cobrança, detalhe/QR, filtros, pacotes, saldo, recibos, estornos, diferenças de conciliação e estados vazios/erro; status no agendamento. | Equipe conclui jornada integral por teclado e em 360 px; erros de PSP mostram ação recuperável. |
| **6. Homologação (3–5 dias)** | Testes de contrato, SQL, unitários, E2E, sandbox PSP, build e ensaio operacional com eventos duplicados, indisponibilidade e devolução. | Checklist de aceite abaixo aprovado; segredos e webhooks de produção configurados e teste real autorizado executado antes de declarar operação em produção. |

**Estimativa:** 4–6 semanas com sandbox pronto e uma pessoa principal, com apoio de produto/contabilidade. Fica dentro de 3–5 semanas do plano geral apenas com etapas em paralelo e mais de uma pessoa de engenharia. Integração de conta central com repasses, exigência fiscal específica ou ausência de conta PSP podem ampliar o prazo; reestimar após a etapa 0.

## Modelo e regras de negócio

1. **Valores:** reais representados em centavos inteiros positivos; moeda BRL. Guardar valor original, descontos, taxas, valor devolvido e valor líquido separadamente. Nunca usar `float` para saldo.
2. **Cobrança:** vínculo obrigatório a clínica e paciente, com vínculo opcional a agendamento ou compra de pacote. Uma referência interna imutável segue para o PSP. Estados locais explícitos: `rascunho`, `pendente`, `recebida`, `vencida`, `cancelada`, `devolvida_parcial`, `devolvida_total`; registrar eventos e momentos de cada transição. A criação no PSP mantém o estado pendente.
3. **PSP:** guardar IDs externos com unicidade por conta/ambiente e clínica. Não usar ID externo recebido em webhook para escolher a clínica sem conferir o vínculo previamente salvo. Revalidar valor, moeda, referência e conta antes de aplicar um evento.
4. **Idempotência:** chave de intenção por operação de criação/estorno; unicidade de ID do evento do PSP; processamento transacional com bloqueio da cobrança. Evento repetido retorna sucesso sem repetir recibo, crédito ou uso. Estados antigos nunca regridem o estado confirmado; um evento conflitante vai para análise.
5. **Recebimento:** no adaptador Asaas, considerar `PAYMENT_RECEIVED` para liberar recibo e créditos. `PAYMENT_CONFIRMED` fica registrado sem liberar saldo, pois pode ser temporário em alguns cenários Pix. Confirmar o mapeamento de eventos na homologação do PSP escolhido.
6. **Pacotes:** modelo `pacote_modelo` (oferta), `pacote_compra` (venda) e razão imutável de créditos (`concedido`, `reservado`, `consumido`, `estornado`, `ajustado`). Definir validade, transferência, cancelamento e falta antes de codificar. A proposta é reservar crédito no agendamento e consumir ao concluir a consulta; cancelamento libera reserva, e falta segue política da clínica registrada na compra. Uma consulta pode consumir no máximo um crédito e não pode gerar cobrança individual duplicada para o mesmo serviço.
7. **Estorno:** solicitar por usuário autorizado, registrar motivo e referência, aguardar confirmação do PSP para alterar o recebido líquido. Devolução parcial reduz saldo financeiro, preserva histórico e exige política explícita sobre créditos já usados; nunca apagar uma cobrança/recibo. Se não houver saldo suficiente na conta PSP, exibir falha e manter solicitação pendente para resolução.
8. **Recibo:** PDF numerado por clínica, com identificador da cobrança, data de recebimento, paciente, emitente, valor e meio; emitir uma versão estável por recebimento e registrar eventual estorno em documento/registro complementar. Validar texto e campos com contabilidade. Downloads protegidos por autorização e auditoria.
9. **Conciliação:** job periódico compara cobranças pendentes recentes e recebidas/devolvidas com o PSP. Registrar divergência, tentativa, resultado e responsável pela resolução. Pagamento sem cobrança conhecida não cria vínculo automático com paciente. Alertar sobre fila de webhook parada, eventos sem correspondência e cobranças vencidas ainda abertas no PSP.

## Arquitetura e segurança

- `src/features/financeiro/{domain,application,infrastructure,ui}`; rotas de tela em `src/app/app/financeiro`, webhook em `src/app/api/webhooks/{psp}` e job autenticado em `src/app/api/jobs/finance-reconcile`. Reusar `requireStaff`, padrões de auditoria, UI e testes existentes. Antes de escrever código Next.js, ler os guias relevantes de `node_modules/next/dist/docs/`, conforme `AGENTS.md`.
- O adaptador recebe configuração **do ambiente e da clínica**. Chaves do PSP e token do webhook ficam apenas no servidor/gestor de segredos, com rotação documentada; jamais em `NEXT_PUBLIC_`, payload de página, logs ou tabela exposta pela Data API. A forma de armazenar credenciais por clínica depende da decisão de titularidade.
- Webhook: validar `asaas-access-token` ou mecanismo equivalente do PSP, limitar corpo, validar esquema, persistir evento antes de responder e processar fora da requisição. Comparar o token da conta correspondente sem confiar em identificadores do corpo. Usar HTTPS e separar sandbox de produção.
- Todas as tabelas expostas terão RLS, grants explícitos, `clinica_id` e políticas por papel. Serviço privilegiado do worker fica isolado e confirma vínculo de clínica em cada mutação. Testar acesso cruzado, paciente e recepção, inclusive RPCs e documentos. Não expor payload bruto com dados pessoais em logs.
- Para migrações, seguir a skill Supabase: consultar documentação/changelog atuais, gerar arquivo pela CLI, verificar `migration list`, testes de banco e advisors. Não alterar migrações já aplicadas.

## Cenários de aceite obrigatórios

- Criar cobrança Pix de consulta e de pacote; mostrar QR/copia e cola; expiração e tentativa de nova cobrança não duplicam obrigação.
- Um webhook válido de recebimento muda cobrança uma única vez, emite um recibo e concede o número exato de créditos; evento duplicado ou fora de ordem não muda esses totais.
- Evento com token inválido, conta errada, valor divergente ou referência desconhecida não concede acesso nem crédito; gera registro para investigação.
- Falha/timeout do PSP na criação preserva intenção local e permite recuperar a operação sem duplicar cobrança externa.
- Reservar/consumir/liberar crédito em agendamento, remarcação, cancelamento e falta conforme política; duas requisições simultâneas não gastam o último crédito duas vezes.
- Estorno total/parcial, inclusive falha por saldo insuficiente e repetição do webhook; valor devolvido acumulado nunca excede o recebido. Recibos e razão de créditos permanecem auditáveis.
- Conciliação recupera webhook perdido e aponta diferenças sem marcar pagamento por inferência local. Operador consegue reprocessar evento falho com trilha de auditoria.
- RLS bloqueia leitura e escrita entre duas clínicas, por paciente não vinculado e por papel sem permissão; nenhum segredo aparece em HTML, resposta de API ou logs.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `supabase test db`, `supabase db advisors --local` e `pnpm build` passam. Aplicar toda a cadeia de migrações em banco vazio isolado.
- Antes de chamar a fase de **operante em produção**, executar cobrança e devolução reais de baixo valor com autorização, conferir extrato PSP, webhook, recibo, saldo, conciliação e alertas; registrar responsável por credenciais, suporte e incidentes.

## Dependências externas e fontes

- Conta sandbox e depois produção do PSP, credenciais, endpoint HTTPS, configuração de webhook e titularidade dos recebimentos.
- Revisão contábil/jurídica de recibo, documento fiscal, política de cancelamento, devolução e tratamento de dados do pagador. Registrar decisões no início da fase; a integração pode ser construída em sandbox enquanto a homologação externa é preparada.
- [Asaas: criar cobrança](https://docs.asaas.com/reference/criar-nova-cobranca), [eventos de pagamento](https://docs.asaas.com/docs/payment-events), [webhooks e idempotência](https://docs.asaas.com/docs/webhooks-e-eventos), [autenticação de webhook](https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook), [estorno](https://docs.asaas.com/reference/estornar-cobranca).
- [Banco Central: Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf); [Supabase: RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
