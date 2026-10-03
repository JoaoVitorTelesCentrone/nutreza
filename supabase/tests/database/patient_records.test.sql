begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

select has_table('public', 'paciente', 'patient table exists');
select has_table('public', 'anamnese', 'anamnesis table exists');
select has_table('public', 'evolucao', 'evolution table exists');
select has_table('public', 'audit_log', 'audit table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.paciente'::regclass), 'patient RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.evolucao'::regclass), 'clinical RLS enabled');
select ok(not has_table_privilege('anon', 'public.paciente', 'SELECT'), 'anonymous cannot read patients');
select ok(not has_table_privilege('authenticated', 'public.evolucao', 'UPDATE'), 'clinical versions cannot be edited');
select ok(not has_table_privilege('authenticated', 'public.audit_log', 'UPDATE'), 'audit is append only');
select is((select public from storage.buckets where id = 'prontuarios'), false, 'records bucket private');

insert into auth.users(id, email, aud, role) values
  ('10000000-0000-4000-8000-000000000001', 'admin-a@example.test', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000002', 'clinician-a@example.test', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000003', 'reception-a@example.test', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000004', 'admin-b@example.test', 'authenticated', 'authenticated'),
  ('10000000-0000-4000-8000-000000000005', 'patient-a@example.test', 'authenticated', 'authenticated');
insert into public.clinica(id, nome, created_by) values
  ('20000000-0000-4000-8000-000000000001', 'Clinic A', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', 'Clinic B', '10000000-0000-4000-8000-000000000004');
insert into public.perfil(user_id, clinica_id, nome, papel) values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Admin A', 'admin'),
  ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Clinician A', 'profissional'),
  ('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'Reception A', 'recepcao'),
  ('10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'Admin B', 'admin');
insert into public.paciente(id, clinica_id, nome, cadastrado_por)
values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Patient A', '10000000-0000-4000-8000-000000000001');
insert into storage.objects(bucket_id, name, owner_id)
values ('prontuarios', '20000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
insert into public.paciente_acesso(paciente_id, clinica_id, user_id, vinculado_por)
values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001');
insert into public.evolucao(paciente_id, clinica_id, serie_id, versao, consulta_em, queixa, registrado_por)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 1, '2026-10-01', 'First consultation', '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 1, '2026-10-15', 'Second consultation', '10000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.evolucao), 2, 'two consultations preserved');
select ok((select count(*) >= 3 from public.audit_log where paciente_id = '30000000-0000-4000-8000-000000000001'), 'clinical inserts audited');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is((select count(*)::int from public.evolucao), 2, 'clinician reads own clinic notes');
select is((select count(*)::int from storage.objects where bucket_id = 'prontuarios'), 1, 'clinician reads own clinic file');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is((select count(*)::int from public.paciente), 1, 'reception reads demographics');
select is((select count(*)::int from public.evolucao), 0, 'reception cannot read notes');
select is((select count(*)::int from storage.objects where bucket_id = 'prontuarios'), 0, 'reception cannot read files');
select throws_ok($$insert into public.evolucao(paciente_id, clinica_id, consulta_em, queixa, registrado_por) values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '2026-10-16', 'Forbidden', '10000000-0000-4000-8000-000000000003')$$, '42501', null, 'reception cannot write notes');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select is((select count(*)::int from public.paciente), 0, 'other clinic cannot read patient');
select is((select count(*)::int from public.evolucao), 0, 'other clinic cannot read notes');
select is((select count(*)::int from storage.objects where bucket_id = 'prontuarios'), 0, 'other clinic cannot read file');
select throws_ok($$insert into public.evolucao(paciente_id, clinica_id, consulta_em, queixa, registrado_por) values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '2026-10-16', 'Forbidden', '10000000-0000-4000-8000-000000000004')$$, '42501', null, 'other clinic cannot write notes');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select is((select count(*)::int from public.paciente), 1, 'linked patient reads own demographics');
select is((select count(*)::int from public.evolucao), 0, 'linked patient cannot read private notes');
select is((select count(*)::int from storage.objects where bucket_id = 'prontuarios'), 0, 'linked patient cannot read private files');

select * from finish();
rollback;
