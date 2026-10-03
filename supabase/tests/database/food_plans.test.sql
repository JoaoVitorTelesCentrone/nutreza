begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

select ok((select relrowsecurity from pg_class where oid = 'public.alimento'::regclass), 'food RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.plano_alimentar'::regclass), 'plan RLS enabled');
select ok(not has_table_privilege('anon', 'public.plano_alimentar', 'SELECT'), 'anonymous cannot read plans');
select ok(not has_table_privilege('authenticated', 'public.alimento_fonte', 'INSERT'), 'users cannot forge source versions');

insert into auth.users(id, email, aud, role) values
  ('71000000-0000-4000-8000-000000000001', 'plan-admin-a@example.test', 'authenticated', 'authenticated'),
  ('71000000-0000-4000-8000-000000000002', 'plan-reception@example.test', 'authenticated', 'authenticated'),
  ('71000000-0000-4000-8000-000000000003', 'plan-patient@example.test', 'authenticated', 'authenticated'),
  ('71000000-0000-4000-8000-000000000004', 'plan-admin-b@example.test', 'authenticated', 'authenticated');
insert into public.clinica(id, nome, created_by) values
  ('72000000-0000-4000-8000-000000000001', 'Plan Clinic A', '71000000-0000-4000-8000-000000000001'),
  ('72000000-0000-4000-8000-000000000002', 'Plan Clinic B', '71000000-0000-4000-8000-000000000004');
insert into public.perfil(user_id, clinica_id, nome, papel) values
  ('71000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 'Plan Admin A', 'admin'),
  ('71000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000001', 'Plan Reception', 'recepcao'),
  ('71000000-0000-4000-8000-000000000004', '72000000-0000-4000-8000-000000000002', 'Plan Admin B', 'admin');
insert into public.paciente(id, clinica_id, nome, cadastrado_por) values
  ('73000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 'Plan Patient', '71000000-0000-4000-8000-000000000001');
insert into public.paciente_acesso(paciente_id, clinica_id, user_id, vinculado_por) values
  ('73000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000003', '71000000-0000-4000-8000-000000000001');
insert into public.alimento_fonte(id, nome, versao, referencia_url, licenca, atribuicao,
  arquivo_sha256, normalizado_sha256) values
  ('74000000-0000-4000-8000-000000000001', 'TACO', 'test-4', 'https://nepa.unicamp.br/',
  'Reprodução com atribuição', 'NEPA/UNICAMP TACO 4', repeat('a', 64), repeat('b', 64));
insert into public.alimento(id, fonte_id, codigo, nome, grupo, energia_kcal_100g,
  proteina_g_100g, carboidrato_g_100g, lipidios_g_100g, fibra_g_100g, sodio_mg_100g) values
  ('75000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000001', '1',
  'Arroz integral cozido', 'Cereais', 123.5349, 2.5883, 25.8098, 1.0003, 2.7493, 1.2447),
  ('75000000-0000-4000-8000-000000000002', '74000000-0000-4000-8000-000000000001', '2',
  'Alimento incompleto', 'Teste', 80, null, 10, 1, null, null);

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
select is((select count(*)::int from public.alimento where fonte_id = '74000000-0000-4000-8000-000000000001'),
  2, 'clinician sees source foods');
insert into public.plano_alimentar(id, clinica_id, paciente_id, titulo, created_by) values
  ('76000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001',
  '73000000-0000-4000-8000-000000000001', 'Plano de referência', '71000000-0000-4000-8000-000000000001');
insert into public.plano_refeicao(id, plano_id, clinica_id, paciente_id, nome, ordem) values
  ('77000000-0000-4000-8000-000000000001', '76000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', 'Almoço', 1);
insert into public.plano_item(id, plano_id, refeicao_id, clinica_id, paciente_id, ordem, alimento_id, gramas)
values ('78000000-0000-4000-8000-000000000001', '76000000-0000-4000-8000-000000000001',
  '77000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001',
  '73000000-0000-4000-8000-000000000001', 1, '75000000-0000-4000-8000-000000000001', 150);
select is((select nutrientes_snapshot->>'energia_kcal' from public.plano_item
  where id = '78000000-0000-4000-8000-000000000001'), '185.3024',
  '150 g of TACO rice has deterministic energy');
select is((select fonte_snapshot->0->>'versao' from public.plano_item
  where id = '78000000-0000-4000-8000-000000000001'), 'test-4', 'item stores source version');
select is((select fonte_snapshot->0->>'atribuicao' from public.plano_item
  where id = '78000000-0000-4000-8000-000000000001'), 'NEPA/UNICAMP TACO 4',
  'item stores exact source attribution');
select is((select composicao_snapshot->'alimento_100g'->>'energia_kcal' from public.plano_item
  where id = '78000000-0000-4000-8000-000000000001'), '123.5349',
  'item stores the source food composition used in calculation');
select throws_ok($$insert into public.plano_item(plano_id, refeicao_id, clinica_id, paciente_id,
  ordem, alimento_id, gramas) values ('76000000-0000-4000-8000-000000000001',
  '77000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001',
  '73000000-0000-4000-8000-000000000001', 2, '75000000-0000-4000-8000-000000000002', 100)$$,
  '22023', null, 'food with missing protein is rejected');
select throws_ok($$update public.plano_alimentar set status = 'aprovado',
  aprovado_por = '71000000-0000-4000-8000-000000000001'
  where id = '76000000-0000-4000-8000-000000000001'$$,
  '22023', null, 'approval requires explicit allergy review');
insert into public.plano_item(id, plano_id, refeicao_id, clinica_id, paciente_id,
  substitui_item_id, ordem, alimento_id, gramas) values
  ('78000000-0000-4000-8000-000000000002', '76000000-0000-4000-8000-000000000001',
  '77000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001',
  '73000000-0000-4000-8000-000000000001', '78000000-0000-4000-8000-000000000001',
  1, '75000000-0000-4000-8000-000000000001', 100);
update public.plano_alimentar set alergias_revisadas = true, status = 'aprovado',
  aprovado_por = '71000000-0000-4000-8000-000000000001'
  where id = '76000000-0000-4000-8000-000000000001';
select is((select status from public.plano_alimentar where id = '76000000-0000-4000-8000-000000000001'),
  'aprovado', 'reviewed plan is approved');
select ok((select count(*) >= 3 from public.audit_log where entidade like 'plano_%'), 'plan changes audited');
select lives_ok($$select public.clone_plan_revision('76000000-0000-4000-8000-000000000001')$$,
  'approved plan can be cloned as a revision');
select is((select count(*)::int from public.plano_alimentar where versao = 2 and status = 'rascunho'),
  1, 'revision is draft version two');
select is((select count(*)::int from public.plano_item i join public.plano_alimentar p on p.id = i.plano_id
  where p.versao = 2), 2, 'revision copies primary and alternative');
select ok((select exists(select 1 from public.plano_item i join public.plano_item original
  on original.id = i.substitui_item_id where i.plano_id <> '76000000-0000-4000-8000-000000000001'
  and original.plano_id = i.plano_id)), 'revision alternative references copied primary');
select throws_ok($$select public.clone_plan_revision('76000000-0000-4000-8000-000000000001')$$,
  '22023', null, 'another revision cannot be cloned while newer draft exists');

select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000003', true);
select is((select count(*)::int from public.plano_alimentar), 1, 'linked patient sees approved plan');
select is((select count(*)::int from public.plano_item), 2, 'linked patient sees approved items only');
select is((select count(*)::int from public.alimento), 0, 'patient cannot browse food catalog');
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000002', true);
select is((select count(*)::int from public.plano_alimentar), 0, 'reception cannot read plans');
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000004', true);
select is((select count(*)::int from public.plano_alimentar), 0, 'other clinic cannot read plans');

set local role postgres;
select throws_ok($$update public.plano_alimentar set titulo = 'Alterado'
  where id = '76000000-0000-4000-8000-000000000001'$$,
  '22023', null, 'approved plan remains immutable even to privileged writer');
select throws_ok($$update public.alimento set energia_kcal_100g = 999
  where id = '75000000-0000-4000-8000-000000000001'$$,
  '22023', null, 'published source food requires a new source version for corrections');
select * from finish();
rollback;
