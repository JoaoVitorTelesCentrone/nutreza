begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public', 'patient_invite', 'patient invites table exists');
select has_table('public', 'patient_pwa_config', 'clinic patient PWA config exists');
select has_table('public', 'patient_consent_event', 'consent history is append only');
select has_table('public', 'patient_progress', 'self reported progress is separate');
select has_table('public', 'patient_diary_entry', 'patient diary exists');
select has_table('public', 'patient_progress_photo', 'progress photos exist');
select has_table('public', 'patient_data_request', 'data rights requests exist');
select ok((select relrowsecurity from pg_class where oid = 'public.patient_invite'::regclass), 'invite RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.patient_diary_entry'::regclass), 'diary RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.patient_progress'::regclass), 'progress RLS enabled');
select is((select public from storage.buckets where id = 'patient-health-images'), false, 'health image bucket is private');
select ok(not has_table_privilege('anon', 'public.patient_diary_entry', 'SELECT'), 'anonymous cannot read diary');

insert into auth.users(id, email, email_confirmed_at, aud, role) values
  ('71000000-0000-4000-8000-000000000001', 'clinician-pwa@example.test', now(), 'authenticated', 'authenticated'),
  ('71000000-0000-4000-8000-000000000002', 'patient-pwa@example.test', now(), 'authenticated', 'authenticated'),
  ('71000000-0000-4000-8000-000000000003', 'other-patient-pwa@example.test', now(), 'authenticated', 'authenticated'),
  ('71000000-0000-4000-8000-000000000004', 'reception-pwa@example.test', now(), 'authenticated', 'authenticated'),
  ('71000000-0000-4000-8000-000000000005', 'clinic-b-pwa@example.test', now(), 'authenticated', 'authenticated');
insert into public.clinica(id, nome, created_by) values
  ('72000000-0000-4000-8000-000000000001', 'PWA Clinic A', '71000000-0000-4000-8000-000000000001'),
  ('72000000-0000-4000-8000-000000000002', 'PWA Clinic B', '71000000-0000-4000-8000-000000000005');
insert into public.perfil(user_id, clinica_id, nome, papel) values
  ('71000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 'Clinician PWA', 'profissional'),
  ('71000000-0000-4000-8000-000000000004', '72000000-0000-4000-8000-000000000001', 'Reception PWA', 'recepcao');
insert into public.paciente(id, clinica_id, nome, email, cadastrado_por) values
  ('73000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 'Patient PWA', 'patient-pwa@example.test', '71000000-0000-4000-8000-000000000001'),
  ('73000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000001', 'Other Patient PWA', 'other-patient-pwa@example.test', '71000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
insert into public.patient_invite(clinica_id, paciente_id, email_normalizado, token_hash, created_by, expires_at)
values ('72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', 'patient-pwa@example.test', repeat('a', 64), '71000000-0000-4000-8000-000000000001', now() + interval '1 day');
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000002', true);
select is(public.accept_patient_invite(repeat('a', 64)), '73000000-0000-4000-8000-000000000001'::uuid, 'verified email accepts matching one time invite');
select is((select count(*)::int from public.paciente_acesso where paciente_id = '73000000-0000-4000-8000-000000000001' and user_id = auth.uid()), 1, 'invite creates one patient link');
select throws_ok($$select public.accept_patient_invite(repeat('a', 64))$$, '42501', null, 'accepted invite cannot be reused');
insert into public.patient_consent_event(clinica_id, paciente_id, user_id, finalidade, aceito, versao_termo)
values ('72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', auth.uid(), 'uso_area_paciente', true, '2026-10-02-v1');
insert into public.patient_progress(clinica_id, paciente_id, registrado_por, client_entry_id, medida_em, peso_kg)
values ('72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', auth.uid(), '74000000-0000-4000-8000-000000000001', current_date, 68.5);
insert into public.patient_diary_entry(clinica_id, paciente_id, registrado_por, client_entry_id, refeicao, consumido_em, itens)
values ('72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', auth.uid(), '74000000-0000-4000-8000-000000000002', 'almoco', now(), '[{"nome":"Arroz","quantidade":"3 colheres"}]');
select is((select count(*)::int from public.patient_diary_entry), 1, 'patient reads own diary');
select is((select count(*)::int from public.patient_progress), 1, 'patient reads own self reported progress');
insert into public.patient_consent_event(clinica_id, paciente_id, user_id, finalidade, aceito, versao_termo, created_at)
values ('72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', auth.uid(), 'uso_area_paciente', false, '2026-10-02-v1', clock_timestamp() + interval '1 second');
select throws_ok($$insert into public.patient_progress(clinica_id, paciente_id, registrado_por, client_entry_id, medida_em, peso_kg) values ('72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', auth.uid(), '74000000-0000-4000-8000-000000000003', current_date, 67)$$, '42501', null, 'revoked essential consent blocks new progress writes');
select throws_ok($$insert into public.patient_diary_entry(clinica_id, paciente_id, registrado_por, client_entry_id, refeicao, consumido_em, itens) values ('72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', auth.uid(), '74000000-0000-4000-8000-000000000004', 'jantar', now(), '[]')$$, '42501', null, 'revoked essential consent blocks new diary writes');
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000003', true);
select is((select count(*)::int from public.patient_diary_entry), 0, 'another patient cannot read diary');
select is((select count(*)::int from public.patient_progress), 0, 'another patient cannot read progress');
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000004', true);
select is((select count(*)::int from public.patient_diary_entry), 0, 'reception cannot read diary');
select is((select count(*)::int from public.patient_progress), 0, 'reception cannot read progress');
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
select is((select count(*)::int from public.patient_diary_entry), 1, 'clinic professional can review diary');
select is((select count(*)::int from public.patient_progress), 1, 'clinic professional can review patient progress');
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000005', true);
select is((select count(*)::int from public.patient_diary_entry), 0, 'different clinic cannot read diary');
select is((select count(*)::int from public.patient_progress), 0, 'different clinic cannot read progress');

select * from finish();
rollback;
