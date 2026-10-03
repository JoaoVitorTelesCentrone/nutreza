# language: pt
Funcionalidade: Prontuário do paciente
  Como profissional do consultório
  Quero registrar informações e consultas em versões
  Para acompanhar a evolução sem perder os registros anteriores

  Cenário: Consultas sucessivas preservam a primeira avaliação
    Dado que um paciente possui uma primeira consulta registrada
    Quando registro uma segunda consulta para o mesmo paciente
    Então as duas consultas permanecem no histórico clínico
