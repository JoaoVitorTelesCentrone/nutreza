# language: pt
Funcionalidade: Agenda e faltas
  Como profissional do consultório
  Quero agendar, atender e registrar faltas
  Para manter o histórico e oferecer um retorno ao paciente

  Cenário: Uma consulta futura não pode ser marcada como falta
    Dado que existe uma consulta interna confirmada para um paciente
    Quando consulto as ações da consulta futura
    Então a opção de marcar falta ainda não aparece
