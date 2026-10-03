begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select has_table('public', 'clinica', 'clínicas existem');
select has_table('public', 'perfil', 'perfis existem');
select ok((select relrowsecurity from pg_class where oid = 'public.clinica'::regclass), 'RLS habilitado em clinica');
select ok((select relrowsecurity from pg_class where oid = 'public.perfil'::regclass), 'RLS habilitado em perfil');
select ok(not has_table_privilege('anon', 'public.clinica', 'SELECT'), 'visitante não tem acesso à clínica');
select ok(not has_table_privilege('authenticated', 'public.clinica', 'UPDATE'), 'cliente não altera clínica nesta fase');
select ok(not has_table_privilege('authenticated', 'public.perfil', 'DELETE'), 'cliente não apaga perfil');

insert into auth.users(id, email, aud, role)
values
  ('11111111-1111-4111-8111-111111111111', 'a-fase1@example.test', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'b-fase1@example.test', 'authenticated', 'authenticated');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
insert into public.clinica(id, nome, created_by)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Clínica A', '11111111-1111-4111-8111-111111111111');
insert into public.perfil(user_id, clinica_id, nome, papel)
values ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Profissional A', 'admin');
select is((select count(*)::int from public.clinica), 1, 'proprietário lê própria clínica');

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select is((select count(*)::int from public.clinica), 0, 'outra conta não lê clínica alheia');
select is((select count(*)::int from public.perfil), 0, 'outra conta não lê perfil alheio');

select * from finish();
rollback;
