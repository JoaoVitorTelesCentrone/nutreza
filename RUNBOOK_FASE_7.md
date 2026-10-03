# Runbook operacional — área do paciente

Este procedimento cobre a operação local e prepara a equipe para staging/piloto. Não libera uso clínico por si só. Antes de usar dados reais, obter aprovação dos textos e bases de tratamento, contratos dos operadores e política de retenção/exclusão.

## Configuração antes do piloto

- Aplique as migrações no ambiente alvo depois de revisar o destino: `npx supabase migration up --linked`. O comando não deve ser apontado para produção sem janela e backup aprovados.
- Configure `NEXT_PUBLIC_SITE_URL` com a origem HTTPS real, URLs de callback do Supabase Auth e e-mail transacional verificado. Sem Resend configurado, o painel mostra um link de ativação copiável ao profissional.
- Mantenha `PATIENT_PHOTO_AI_ENABLED=false` até concluir análise contratual e clínica. Para habilitar, configure `OPENAI_API_KEY` e `PATIENT_PHOTO_MODEL`, valide limites/custos e habilite a opção também na clínica. Consentimento do paciente é uma terceira condição obrigatória. O fluxo manual continua disponível quando a IA está desligada.
- Valide instalação e câmera em Safari/iOS e Chrome/Android por HTTPS. O modo offline usa IndexedDB do navegador; a cópia local não recebe limpeza remota enquanto o aparelho está desconectado.
- Use somente contas e dados fictícios até o aceite documentado de privacidade, segurança e piloto.

## Operação diária

### Convite e ativação

1. Confirme que o cadastro do paciente contém o e-mail correto e pertence à clínica ativa.
2. Crie o convite na ficha. Ele expira em 48 horas, é vinculado ao e-mail e só pode ser aceito uma vez.
3. Se o envio falhar, confira o endereço remetente, a chave do Resend e os logs do provedor. Revogue o convite pendente antes de emitir outro.
4. Se expirou ou foi enviado ao endereço errado, revogue e crie novo convite. O profissional não deve compartilhar o token em canais públicos.
5. Conta já vinculada a outro usuário requer revisão administrativa; não altere vínculo diretamente no banco sem confirmar identidade e trilha de auditoria.

### Diário, fotos e IA

- Se a sugestão de alimentos falhar, exceder o limite diário ou estiver desativada, registre a refeição manualmente. A análise não salva nem aprova itens sem confirmação do paciente.
- Para desligar análise em uma clínica, use “Desativar para esta clínica”. Para bloqueio geral, defina `PATIENT_PHOTO_AI_ENABLED=false` e reinicie/reimplante o serviço.
- Fotos ficam em bucket privado. Gere URLs assinadas somente para atendimento autorizado; elas expiram em cinco minutos na interface atual.
- O limite inicial de análise é 20 solicitações por conta por dia. Mudanças de orçamento devem rever a função de quota e a estimativa do provedor.

### Sincronização offline

- A fila é particionada por conta e paciente, com identificador idempotente. Ao recuperar rede, ela tenta sincronizar e mantém registros locais que falharem.
- Se aparecer conflito (HTTP 409), não apague os dados do navegador. Atualize a página, compare a versão no servidor e peça ao paciente que corrija/reenvie o relato preservado.
- Em aparelho compartilhado ou perdido, revogue a sessão/credenciais da conta e peça limpeza do armazenamento do navegador. A desconexão impede apagar remotamente a cópia offline até o aparelho voltar à rede.
- O plano offline expira após 24 horas; a versão mais nova exige reconexão.
- Ao sair da conta no aparelho, o botão da área do paciente limpa a fila e o plano em cache daquela conta.

### Solicitações de dados

- A exportação é iniciada pelo paciente e entrega um JSON com os dados disponíveis e URLs temporárias para fotos. Trate o arquivo como dado sensível e não o envie por canais não aprovados.
- Correção, desvinculação e exclusão de conta criam solicitações para triagem clínica/administrativa; a aplicação não apaga automaticamente registros clínicos. Registre a decisão, responsável e comunicação no processo aprovado pela organização.

## Resposta a incidente

1. Interrompa novas operações afetadas (para IA, desative a flag geral e a opção da clínica).
2. Preserve logs técnicos sem copiar nomes, fotos, conteúdo de diário, tokens ou URLs assinadas para tickets.
3. Revogue sessões/convites quando houver exposição de conta; avalie os objetos privados envolvidos e a clínica afetada.
4. Acione o responsável de segurança/privacidade definido pela organização para classificação, comunicação e retenção de evidências.
5. Reative o recurso somente após correção, revisão e registro da decisão.

## Checklist de piloto assistido

- [ ] Dois consultórios de teste isolados e pelo menos um profissional responsável por cada um.
- [ ] Somente pacientes adultos fictícios/autorizados, contas individuais e plano aprovado por profissional.
- [ ] Jornada observada: convite, confirmação, escolhas, plano/PDF, diário manual, sugestão de foto (se aprovada), progresso e leitura profissional.
- [ ] Ensaio offline: fechar/reabrir, queda de rede, sincronização repetida, conflito, troca de conta e limpeza em logout.
- [ ] Navegação por teclado, foco visível, leitor de tela, contraste e viewport de 360 px.
- [ ] Registrar métricas do piloto sem conteúdo alimentar, dados pessoais, imagem ou identificador de paciente; anotar ativações, tempo de conclusão, falhas de sincronização e correções de sugestões.
- [ ] Responsáveis de suporte, privacidade e segurança aceitam o runbook e os critérios para interromper o piloto.
- [ ] Registrar achados, severidade, correção e aprovação de saída antes de ampliar participantes.
