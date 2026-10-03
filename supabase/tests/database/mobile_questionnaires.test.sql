begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public', 'usuario', 'shared user profile exists');
select has_table('public', 'paciente_profissional', 'patient professional relationship exists');
select has_table('public', 'questionario', 'questionnaire exists');
select has_table('public', 'questionario_atribuicao', 'questionnaire assignment exists');
select has_table('public', 'questionario_resposta', 'questionnaire response exists');
select ok((select relrowsecurity from pg_class where oid = 'public.questionario'::regclass), 'questionnaire RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.questionario_resposta'::regclass), 'response RLS enabled');
select ok(not has_table_privilege('anon', 'public.questionario', 'SELECT'), 'anonymous cannot read questionnaires');
select ok(not has_table_privilege('authenticated', 'public.usuario', 'INSERT'), 'clients cannot forge account roles');

insert into auth.users(id, email, email_confirmed_at, aud, role) values
  ('81000000-0000-4000-8000-000000000001', 'admin-mobile@example.test', now(), 'authenticated', 'authenticated'),
  ('81000000-0000-4000-8000-000000000002', 'nutri-mobile@example.test', now(), 'authenticated', 'authenticated'),
  ('81000000-0000-4000-8000-000000000003', 'other-nutri-mobile@example.test', now(), 'authenticated', 'authenticated'),
  ('81000000-0000-4000-8000-000000000004', 'patient-mobile@example.test', now(), 'authenticated', 'authenticated'),
  ('81000000-0000-4000-8000-000000000005', 'other-patient-mobile@example.test', now(), 'authenticated', 'authenticated'),
  ('81000000-0000-4000-8000-000000000006', 'admin-other-clinic@example.test', now(), 'authenticated', 'authenticated');

insert into public.clinica(id, nome, created_by) values
  ('82000000-0000-4000-8000-000000000001', 'Mobile Clinic', '81000000-0000-4000-8000-000000000001'),
  ('82000000-0000-4000-8000-000000000002', 'Other Mobile Clinic', '81000000-0000-4000-8000-000000000006');

insert into public.perfil(user_id, clinica_id, nome, papel) values
  ('81000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'Admin Mobile', 'admin'),
  ('81000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000001', 'Nutri Mobile', 'profissional'),
  ('81000000-0000-4000-8000-000000000003', '82000000-0000-4000-8000-000000000001', 'Other Nutri', 'profissional'),
  ('81000000-0000-4000-8000-000000000006', '82000000-0000-4000-8000-000000000002', 'Other Admin', 'admin');

select is((select tipo from public.usuario where id = '81000000-0000-4000-8000-000000000002'), 'nutri', 'staff profile creates shared nutri account');

insert into public.paciente(id, clinica_id, nome, cadastrado_por) values
  ('83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'Patient Mobile', '81000000-0000-4000-8000-000000000002'),
  ('83000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000001', 'Other Patient Mobile', '81000000-0000-4000-8000-000000000003');

select ok(
  exists(select 1 from public.paciente_profissional where paciente_id = '83000000-0000-4000-8000-000000000001' and profissional_id = '81000000-0000-4000-8000-000000000002' and principal),
  'patient creator becomes responsible professional'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
insert into public.paciente_acesso(paciente_id, clinica_id, user_id, vinculado_por) values
  ('83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000004', '81000000-0000-4000-8000-000000000001'),
  ('83000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000005', '81000000-0000-4000-8000-000000000001');

create temporary table questionnaire_test_ids(questionnaire_id uuid, version_id uuid, question_id uuid, assignment_id uuid, response_id uuid);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);
insert into questionnaire_test_ids(questionnaire_id)
select public.create_questionnaire_draft('Avaliação inicial', 'Conte como está sua rotina.');
update questionnaire_test_ids i set version_id = (
  select v.id from public.questionario_versao v where v.questionario_id = i.questionnaire_id
);
insert into public.questionario_questao(versao_id, clinica_id, ordem, enunciado, tipo, obrigatoria)
select version_id, '82000000-0000-4000-8000-000000000001', 1, 'Como está sua fome ao longo do dia?', 'texto_longo', true
from questionnaire_test_ids;

-- psql has no procedural INTO target here; persist the generated question id by its deterministic version/order.
update questionnaire_test_ids i set question_id = (
  select q.id from public.questionario_questao q where q.versao_id = i.version_id and q.ordem = 1
);
select lives_ok(
  format('select public.publish_questionnaire(%L::uuid)', (select questionnaire_id from questionnaire_test_ids)),
  'responsible professional publishes questionnaire'
);
select is((select status from public.questionario_versao where id = (select version_id from questionnaire_test_ids)), 'publicada', 'version is published');
select lives_ok(
  format('update public.questionario_questao set enunciado = %L where id = %L::uuid', 'Changed after publishing', (select question_id from questionnaire_test_ids)),
  'published question update is safely filtered by RLS'
);
select is((select enunciado from public.questionario_questao where id = (select question_id from questionnaire_test_ids)), 'Como está sua fome ao longo do dia?', 'published questions are immutable');

insert into public.questionario_atribuicao(clinica_id, paciente_id, versao_id, atribuida_por)
select '82000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', version_id, auth.uid()
from questionnaire_test_ids;
update questionnaire_test_ids i set assignment_id = (
  select a.id from public.questionario_atribuicao a where a.versao_id = i.version_id and a.paciente_id = '83000000-0000-4000-8000-000000000001'
);
select is((select count(*)::int from public.questionario_atribuicao), 1, 'responsible professional sees assigned questionnaire');

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);
select is((select count(*)::int from public.questionario_atribuicao where paciente_id = '83000000-0000-4000-8000-000000000001'), 0, 'unassigned professional cannot read another professional assignment');
select throws_ok(
  format('insert into public.questionario_atribuicao(clinica_id,paciente_id,versao_id,atribuida_por) values (%L,%L,%L,%L)',
    '82000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001',
    (select version_id from questionnaire_test_ids), '81000000-0000-4000-8000-000000000003'),
  '42501', null, 'unassigned professional cannot assign to another professional patient'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000005', true);
select is((select count(*)::int from public.questionario_atribuicao), 0, 'other patient cannot read assignment');
select is((select count(*)::int from public.questionario_questao), 0, 'other patient cannot read assigned questions');

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000004', true);
select is((select tipo from public.usuario where id = auth.uid()), 'paciente', 'patient link creates shared patient account');
select is((select count(*)::int from public.questionario_atribuicao), 1, 'assigned patient reads own assignment');
select is((select count(*)::int from public.questionario), 1, 'assigned patient reads questionnaire title');
select is((select count(*)::int from public.questionario_questao), 1, 'assigned patient reads published questions');

insert into public.questionario_resposta(atribuicao_id, versao_id, paciente_id, clinica_id, respondida_por)
select assignment_id, version_id, '83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', auth.uid()
from questionnaire_test_ids;
update questionnaire_test_ids i set response_id = (
  select r.id from public.questionario_resposta r where r.atribuicao_id = i.assignment_id
);
insert into public.questionario_resposta_item(resposta_id, questao_id, versao_id, paciente_id, clinica_id, valor_texto)
select response_id, question_id, version_id, '83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'Sinto mais fome no fim da tarde.'
from questionnaire_test_ids;
update public.questionario_resposta set status = 'enviada', enviada_em = now()
where id = (select response_id from questionnaire_test_ids);
select is((select status from public.questionario_atribuicao where id = (select assignment_id from questionnaire_test_ids)), 'respondido', 'submission completes assignment atomically');
select lives_ok(
  format('update public.questionario_resposta_item set valor_texto = %L where id = (select id from public.questionario_resposta_item limit 1)', 'Changed'),
  'submitted response item update is safely filtered by RLS'
);
select is((select valor_texto from public.questionario_resposta_item limit 1), 'Sinto mais fome no fim da tarde.', 'submitted response items are immutable to patient');

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);
select is((select count(*)::int from public.questionario_resposta), 1, 'responsible professional reads submitted response');
select is((select valor_texto from public.questionario_resposta_item limit 1), 'Sinto mais fome no fim da tarde.', 'responsible professional reads answer content');

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000006', true);
select is((select count(*)::int from public.questionario), 0, 'other clinic cannot read questionnaires');
select is((select count(*)::int from public.questionario_resposta), 0, 'other clinic cannot read responses');

select * from finish();
rollback;
