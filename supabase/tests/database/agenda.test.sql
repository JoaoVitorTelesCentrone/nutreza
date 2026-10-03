begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

select ok((select relrowsecurity from pg_class where oid = 'public.agendamento'::regclass), 'booking RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.agenda_notificacao'::regclass), 'notification RLS enabled');
select ok(not has_table_privilege('anon', 'public.agendamento', 'SELECT'), 'anonymous cannot read bookings table');
select ok(not has_table_privilege('authenticated', 'public.agenda_notificacao', 'SELECT'), 'staff cannot read outbox');
select ok(not has_table_privilege('authenticated', 'public.agendamento', 'DELETE'), 'bookings cannot be deleted');

insert into auth.users(id, email, aud, role) values
  ('61000000-0000-4000-8000-000000000001', 'agenda-a@example.test', 'authenticated', 'authenticated'),
  ('61000000-0000-4000-8000-000000000002', 'agenda-b@example.test', 'authenticated', 'authenticated');
insert into public.clinica(id, nome, created_by) values
  ('62000000-0000-4000-8000-000000000001', 'Agenda Clinic A', '61000000-0000-4000-8000-000000000001'),
  ('62000000-0000-4000-8000-000000000002', 'Agenda Clinic B', '61000000-0000-4000-8000-000000000002');
insert into public.perfil(user_id, clinica_id, nome, papel) values
  ('61000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000001', 'Agenda Admin A', 'admin'),
  ('61000000-0000-4000-8000-000000000002', '62000000-0000-4000-8000-000000000002', 'Agenda Admin B', 'admin');

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
insert into public.agenda_config(clinica_id, slug, antecedencia_horas, horizonte_dias)
values ('62000000-0000-4000-8000-000000000001', 'agenda-teste-a', 0, 60);
insert into public.agenda_servico(id, clinica_id, profissional_id, nome, tipo, duracao_minutos, intervalo_minutos)
values ('63000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001', 'Consulta nutricional', 'presencial', 50, 10);
insert into public.agenda_disponibilidade(clinica_id, profissional_id, dia_semana, inicio_hora, fim_hora)
values ('62000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001',
  extract(isodow from current_date + 8)::integer, '09:00', '18:00');
select ok((select count(*) > 0 from public.agenda_horarios('agenda-teste-a',
  '63000000-0000-4000-8000-000000000001', current_date + 8)), 'slots listed from weekly availability');
select throws_ok($$insert into public.agenda_disponibilidade(clinica_id, profissional_id, dia_semana, inicio_hora, fim_hora)
  values ('62000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001',
  extract(isodow from current_date + 8)::integer, '10:00', '12:00')$$,
  '23P01', null, 'overlapping weekly windows rejected');

set local role anon;
select ok(not has_function_privilege('anon', 'public.agenda_horarios_internos(uuid, date)', 'EXECUTE'),
  'anonymous cannot call internal slot listing');
select is((public.agenda_info('agenda-teste-a')->>'clinica'), 'Agenda Clinic A', 'public sees clinic identity');
select set_config('test.booking_token', (public.agendar_publico(
  'agenda-teste-a', '63000000-0000-4000-8000-000000000001',
  ((current_date + 8) + time '10:00') at time zone 'America/Sao_Paulo',
  'Paciente Público', 'publico@example.test', '11999998888', true)->>'token'), true);
select is((public.agendamento_publico(current_setting('test.booking_token'))->>'status'), 'solicitado', 'public booking created');
select is((public.alterar_agendamento_publico(current_setting('test.booking_token'), 'cancelar')->>'status'), 'cancelado', 'public cancellation works');
select is((public.alterar_agendamento_publico(current_setting('test.booking_token'), 'cancelar')->>'status'), 'cancelado', 'public cancellation is idempotent');
select set_config('test.booking_token2', (public.agendar_publico(
  'agenda-teste-a', '63000000-0000-4000-8000-000000000001',
  ((current_date + 8) + time '11:00') at time zone 'America/Sao_Paulo',
  'Paciente Confirmado', 'confirmado@example.test', '11999997777', true)->>'token'), true);
select set_config('test.booking_id2', (public.agendamento_publico(current_setting('test.booking_token2'))->>'id'), true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
select is(public.confirmar_agendamento(current_setting('test.booking_id2')::uuid),
  current_setting('test.booking_id2')::uuid, 'staff confirms public request');
select is(public.confirmar_agendamento(current_setting('test.booking_id2')::uuid),
  current_setting('test.booking_id2')::uuid, 'confirmation is idempotent');
select is((select count(*)::int from public.agendamento where status = 'cancelado'), 1, 'staff sees cancelled booking');
insert into public.paciente(id, clinica_id, nome, cadastrado_por)
values ('64000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000001',
  'Paciente Interno', '61000000-0000-4000-8000-000000000001');
insert into public.agendamento(id, clinica_id, servico_id, profissional_id, paciente_id,
  nome_contato, inicio, fim, intervalo_minutos, status, origem, created_by)
values ('65000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000001',
  '63000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000001', 'Paciente Interno',
  ((current_date + 8) + time '10:00') at time zone 'America/Sao_Paulo',
  ((current_date + 8) + time '10:50') at time zone 'America/Sao_Paulo', 10,
  'confirmado', 'interno', '61000000-0000-4000-8000-000000000001');
select throws_ok($$insert into public.agendamento(clinica_id, servico_id, profissional_id, paciente_id,
    nome_contato, inicio, fim, intervalo_minutos, status, origem, created_by)
  values ('62000000-0000-4000-8000-000000000001', '63000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001', '64000000-0000-4000-8000-000000000001',
    'Paciente Interno', ((current_date + 8) + time '10:45') at time zone 'America/Sao_Paulo',
    ((current_date + 8) + time '11:35') at time zone 'America/Sao_Paulo', 10, 'confirmado', 'interno',
    '61000000-0000-4000-8000-000000000001')$$,
  '23P01', null, 'overlapping bookings rejected by exclusion constraint');
select throws_ok('select count(*) from public.agenda_notificacao', '42501', null, 'outbox remains hidden from staff');
select ok((select count(*) >= 2 from public.audit_log where entidade = 'agendamento'), 'booking changes audited');
update public.agenda_config set ativa = false where clinica_id = '62000000-0000-4000-8000-000000000001';
update public.agenda_servico set ativo = false where id = '63000000-0000-4000-8000-000000000001';
select ok((select count(*) > 0 from public.agenda_horarios_internos(
  '63000000-0000-4000-8000-000000000001', current_date + 8)),
  'internal slots remain available while public booking is paused');
select is(public.agenda_info('agenda-teste-a'), null::jsonb,
  'paused public booking hides clinic information');
select throws_ok($$update public.agenda_servico set duracao_minutos = 60
  where id = '63000000-0000-4000-8000-000000000001'$$,
  '22023', null, 'service duration cannot change with bookings');
select throws_ok($$update public.agenda_servico set intervalo_minutos = 15
  where id = '63000000-0000-4000-8000-000000000001'$$,
  '22023', null, 'service interval cannot change with bookings');
select throws_ok($$update public.agendamento set status = 'falta'
  where id = '65000000-0000-4000-8000-000000000001'$$,
  '22023', null, 'future booking cannot be marked as no-show');
insert into public.agenda_disponibilidade(clinica_id, profissional_id, dia_semana, inicio_hora, fim_hora)
values ('62000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001',
  extract(isodow from current_date - 7)::integer, '09:00', '18:00');
insert into public.agendamento(id, clinica_id, servico_id, profissional_id, paciente_id,
  nome_contato, inicio, fim, intervalo_minutos, status, origem, created_by)
values ('65000000-0000-4000-8000-000000000002', '62000000-0000-4000-8000-000000000001',
  '63000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000001', 'Paciente Interno',
  ((current_date - 7) + time '10:00') at time zone 'America/Sao_Paulo',
  ((current_date - 7) + time '10:50') at time zone 'America/Sao_Paulo', 10,
  'confirmado', 'interno', '61000000-0000-4000-8000-000000000001');
update public.agendamento set status = 'falta'
  where id = '65000000-0000-4000-8000-000000000002';
select is((select status from public.agendamento where id = '65000000-0000-4000-8000-000000000002'),
  'falta', 'past consultation can be marked as no-show');
select ok((select count(*) > 0 from public.audit_log where entidade = 'agendamento'
  and entidade_id = '65000000-0000-4000-8000-000000000002' and acao = 'update'),
  'past no-show keeps an audit event');
select ok((select count(*) >= 2 from public.audit_log
  where entidade in ('agenda_config', 'agenda_servico')),
  'agenda setting changes are audited');
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000002', true);
select is((select count(*)::int from public.agenda_horarios_internos(
  '63000000-0000-4000-8000-000000000001', current_date + 8)), 0,
  'another clinic cannot enumerate internal slots');
select is((select count(*)::int from public.agendamento), 0, 'other clinic cannot read bookings');
select is((select count(*)::int from public.agenda_config), 0, 'other clinic cannot read config');
select throws_ok($$insert into public.agendamento(clinica_id, servico_id, profissional_id, paciente_id,
    nome_contato, inicio, fim, intervalo_minutos, status, origem, created_by)
  values ('62000000-0000-4000-8000-000000000001', '63000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001', '64000000-0000-4000-8000-000000000001',
    'Paciente Interno', ((current_date + 9) + time '10:00') at time zone 'America/Sao_Paulo',
    ((current_date + 9) + time '10:50') at time zone 'America/Sao_Paulo', 10, 'confirmado', 'interno',
    '61000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'other clinic cannot create booking');

set local role postgres;
select is((select count(*)::int from public.agenda_notificacao
  where agendamento_id = current_setting('test.booking_id2')::uuid and tipo = 'confirmacao'), 1,
  'confirmation email queued once');
select is((select count(*)::int from public.agenda_notificacao
  where agendamento_id = current_setting('test.booking_id2')::uuid and tipo = 'lembrete_24h'), 1,
  '24-hour reminder queued');
select is((select count(*)::int from public.agenda_notificacao
  where agendamento_id = current_setting('test.booking_id2')::uuid and tipo = 'lembrete_1h'), 1,
  'one-hour reminder queued');

select * from finish();
rollback;
