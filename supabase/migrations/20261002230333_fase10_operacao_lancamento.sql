create table public.platform_feature_flag (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  chave text not null check (chave in ('teca','patient_photo_ai','teleconsulta','whatsapp','saas_billing')),
  habilitada boolean not null default false,
  configuracao jsonb not null default '{}'::jsonb check (jsonb_typeof(configuracao)='object'),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique(clinica_id,chave)
);
create table public.operational_incident (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references public.clinica(id) on delete cascade,
  severidade text not null check (severidade in ('sev1','sev2','sev3','sev4')),
  categoria text not null check (categoria in ('seguranca','privacidade','indisponibilidade','mensageria','video','financeiro','dados','outro')),
  titulo text not null check (char_length(btrim(titulo)) between 4 and 180),
  status text not null default 'aberto' check (status in ('aberto','contido','monitorando','resolvido','pos_incidente')),
  resumo text not null check (char_length(btrim(resumo)) between 10 and 5000),
  reportado_por uuid not null references auth.users(id),
  responsavel uuid references auth.users(id),
  resolvido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index operational_incident_open_idx on public.operational_incident(status,severidade,created_at) where status not in ('resolvido','pos_incidente');

alter table public.platform_feature_flag enable row level security;
alter table public.operational_incident enable row level security;
revoke all on public.platform_feature_flag,public.operational_incident from anon,authenticated;
grant select,insert,update on public.platform_feature_flag,public.operational_incident to authenticated;
grant all on public.platform_feature_flag,public.operational_incident to service_role;

create policy "members read feature flags" on public.platform_feature_flag for select to authenticated
  using (private.has_role(clinica_id,array['admin','profissional','recepcao']));
create policy "admins create feature flags" on public.platform_feature_flag for insert to authenticated
  with check (updated_by=(select auth.uid()) and private.has_role(clinica_id,array['admin']));
create policy "admins update feature flags" on public.platform_feature_flag for update to authenticated
  using (private.has_role(clinica_id,array['admin'])) with check (updated_by=(select auth.uid()) and private.has_role(clinica_id,array['admin']));
create policy "members read incidents" on public.operational_incident for select to authenticated
  using (clinica_id is not null and private.has_role(clinica_id,array['admin','profissional','recepcao']));
create policy "members report incidents" on public.operational_incident for insert to authenticated
  with check (clinica_id is not null and reportado_por=(select auth.uid()) and private.has_role(clinica_id,array['admin','profissional','recepcao']));
create policy "admins update incidents" on public.operational_incident for update to authenticated
  using (clinica_id is not null and private.has_role(clinica_id,array['admin']))
  with check (clinica_id is not null and private.has_role(clinica_id,array['admin']));

insert into public.platform_feature_flag(clinica_id,chave,habilitada)
select c.id,f.chave,false from public.clinica c cross join (values ('teca'),('patient_photo_ai'),('teleconsulta'),('whatsapp'),('saas_billing')) f(chave)
on conflict(clinica_id,chave) do nothing;

create or replace function private.provision_feature_flags()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.platform_feature_flag(clinica_id,chave,habilitada)
  select new.id,x.chave,false from (values ('teca'),('patient_photo_ai'),('teleconsulta'),('whatsapp'),('saas_billing')) x(chave);
  return new;
end; $$;
revoke all on function private.provision_feature_flags() from public,anon,authenticated;
create trigger clinica_provision_feature_flags after insert on public.clinica for each row execute function private.provision_feature_flags();
