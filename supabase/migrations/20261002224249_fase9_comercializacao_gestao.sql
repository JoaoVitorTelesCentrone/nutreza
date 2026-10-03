create table public.saas_plano (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  nome text not null check (char_length(nome) between 2 and 80),
  preco_mensal_centavos integer not null check (preco_mensal_centavos >= 0),
  limite_pacientes integer not null check (limite_pacientes > 0),
  limite_membros integer not null check (limite_membros > 0),
  limite_teca_mes integer not null check (limite_teca_mes >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.saas_plano(slug,nome,preco_mensal_centavos,limite_pacientes,limite_membros,limite_teca_mes) values
  ('essencial','Essencial',9900,50,2,50),
  ('profissional','Profissional',19900,250,5,300),
  ('clinica','Clínica',39900,1000,20,1500);

create table public.saas_assinatura (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null unique references public.clinica(id) on delete cascade,
  plano_id uuid not null references public.saas_plano(id),
  status text not null default 'trial' check (status in ('trial','ativa','inadimplente','cancelada','pausada')),
  provedor text not null default 'simulado' check (provedor in ('simulado','stripe')),
  cliente_provedor_id text,
  assinatura_provedor_id text unique,
  periodo_inicio timestamptz not null default now(),
  periodo_fim timestamptz not null default (now() + interval '14 days'),
  cancelar_ao_fim boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index saas_assinatura_status_idx on public.saas_assinatura(status, periodo_fim);

create table public.saas_evento_cobranca (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  assinatura_id uuid references public.saas_assinatura(id) on delete set null,
  provedor text not null check (provedor in ('simulado','stripe')),
  evento_provedor_id text not null,
  tipo text not null check (char_length(tipo) between 2 and 100),
  estado text not null default 'processado' check (estado in ('recebido','processado','erro','ignorado')),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  erro_codigo text,
  created_at timestamptz not null default now(),
  unique(provedor, evento_provedor_id)
);

create table public.equipe_convite (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) between 5 and 254),
  papel text not null check (papel in ('profissional','recepcao')),
  nome text not null check (char_length(btrim(nome)) between 2 and 120),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  criado_por uuid not null references auth.users(id),
  expira_em timestamptz not null,
  aceito_em timestamptz,
  revogado_em timestamptz,
  created_at timestamptz not null default now(),
  check (expira_em > created_at)
);
create unique index equipe_convite_aberto_unique on public.equipe_convite(clinica_id,email)
  where aceito_em is null and revogado_em is null;

create table public.biblioteca_item (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 2 and 160),
  categoria text not null check (categoria in ('orientacao','receita','material','resposta_aprovada')),
  conteudo text not null check (char_length(btrim(conteudo)) between 10 and 20000),
  status text not null default 'rascunho' check (status in ('rascunho','publicado','arquivado')),
  versao integer not null default 1 check (versao > 0),
  criado_por uuid not null references auth.users(id),
  publicado_por uuid references auth.users(id),
  publicado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, clinica_id)
);

create table public.suporte_ticket (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  aberto_por uuid not null references auth.users(id),
  assunto text not null check (char_length(btrim(assunto)) between 4 and 160),
  descricao text not null check (char_length(btrim(descricao)) between 10 and 5000),
  prioridade text not null default 'normal' check (prioridade in ('baixa','normal','alta','critica')),
  status text not null default 'aberto' check (status in ('aberto','em_atendimento','aguardando_cliente','resolvido','fechado')),
  resolvido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clinica_exportacao (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  solicitado_por uuid not null references auth.users(id),
  status text not null default 'solicitada' check (status in ('solicitada','processando','pronta','falhou','expirada')),
  arquivo_path text,
  erro_codigo text,
  expira_em timestamptz,
  created_at timestamptz not null default now(),
  concluida_em timestamptz
);

alter table public.saas_plano enable row level security;
alter table public.saas_assinatura enable row level security;
alter table public.saas_evento_cobranca enable row level security;
alter table public.equipe_convite enable row level security;
alter table public.biblioteca_item enable row level security;
alter table public.suporte_ticket enable row level security;
alter table public.clinica_exportacao enable row level security;

revoke all on public.saas_plano, public.saas_assinatura, public.saas_evento_cobranca,
  public.equipe_convite, public.biblioteca_item, public.suporte_ticket, public.clinica_exportacao from anon, authenticated;
grant select on public.saas_plano to anon, authenticated;
grant select on public.saas_assinatura, public.equipe_convite, public.biblioteca_item,
  public.suporte_ticket, public.clinica_exportacao to authenticated;
grant insert, update on public.equipe_convite, public.biblioteca_item, public.suporte_ticket, public.clinica_exportacao to authenticated;
grant all on public.saas_plano, public.saas_assinatura, public.saas_evento_cobranca,
  public.equipe_convite, public.biblioteca_item, public.suporte_ticket, public.clinica_exportacao to service_role;

create policy "active plans are public" on public.saas_plano for select to anon, authenticated using (ativo);
create policy "clinic members read subscription" on public.saas_assinatura for select to authenticated
  using (private.has_role(clinica_id, array['admin','profissional','recepcao']));
create policy "admins read team invites" on public.equipe_convite for select to authenticated
  using (private.has_role(clinica_id, array['admin']));
create policy "admins create team invites" on public.equipe_convite for insert to authenticated
  with check (criado_por = (select auth.uid()) and private.has_role(clinica_id, array['admin']));
create policy "admins update team invites" on public.equipe_convite for update to authenticated
  using (private.has_role(clinica_id, array['admin'])) with check (private.has_role(clinica_id, array['admin']));
create policy "clinical team reads library" on public.biblioteca_item for select to authenticated
  using (private.has_role(clinica_id, array['admin','profissional']));
create policy "clinical team creates library" on public.biblioteca_item for insert to authenticated
  with check (criado_por = (select auth.uid()) and private.has_role(clinica_id, array['admin','profissional']));
create policy "clinical team updates library" on public.biblioteca_item for update to authenticated
  using (private.has_role(clinica_id, array['admin','profissional'])) with check (private.has_role(clinica_id, array['admin','profissional']));
create policy "members read support tickets" on public.suporte_ticket for select to authenticated
  using (private.has_role(clinica_id, array['admin','profissional','recepcao']));
create policy "members create support tickets" on public.suporte_ticket for insert to authenticated
  with check (aberto_por = (select auth.uid()) and private.has_role(clinica_id, array['admin','profissional','recepcao']));
create policy "admins update support tickets" on public.suporte_ticket for update to authenticated
  using (private.has_role(clinica_id, array['admin'])) with check (private.has_role(clinica_id, array['admin']));
create policy "admins read exports" on public.clinica_exportacao for select to authenticated
  using (private.has_role(clinica_id, array['admin']));
create policy "admins request exports" on public.clinica_exportacao for insert to authenticated
  with check (solicitado_por = (select auth.uid()) and private.has_role(clinica_id, array['admin']));

create or replace function private.provision_saas_trial()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_plan uuid;
begin
  select id into v_plan from public.saas_plano where slug = 'profissional' and ativo limit 1;
  insert into public.saas_assinatura(clinica_id,plano_id,status,provedor) values(new.id,v_plan,'trial','simulado')
    on conflict (clinica_id) do nothing;
  return new;
end; $$;
revoke all on function private.provision_saas_trial() from public, anon, authenticated;
create trigger clinica_provision_saas_trial after insert on public.clinica for each row execute function private.provision_saas_trial();
insert into public.saas_assinatura(clinica_id,plano_id,status,provedor)
select c.id,p.id,'trial','simulado' from public.clinica c cross join public.saas_plano p
where p.slug='profissional' on conflict(clinica_id) do nothing;

create or replace function private.enforce_saas_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_limit integer; v_count integer;
begin
  if tg_table_name = 'paciente' then
    select p.limite_pacientes into v_limit from public.saas_assinatura a join public.saas_plano p on p.id=a.plano_id
      where a.clinica_id=new.clinica_id and a.status in ('trial','ativa');
    select count(*) into v_count from public.paciente x where x.clinica_id=new.clinica_id and x.status='ativo';
  else
    select p.limite_membros into v_limit from public.saas_assinatura a join public.saas_plano p on p.id=a.plano_id
      where a.clinica_id=new.clinica_id and a.status in ('trial','ativa');
    select count(*) into v_count from public.perfil x where x.clinica_id=new.clinica_id;
  end if;
  if v_limit is null then raise exception 'Assinatura indisponível' using errcode='P0001'; end if;
  if v_count >= v_limit then raise exception 'Limite do plano atingido' using errcode='P0001'; end if;
  return new;
end; $$;
revoke all on function private.enforce_saas_limit() from public, anon, authenticated;
create trigger paciente_saas_limit before insert on public.paciente for each row execute function private.enforce_saas_limit();
create trigger perfil_saas_limit before insert on public.perfil for each row when (new.papel <> 'admin') execute function private.enforce_saas_limit();

create or replace function public.saas_usage_snapshot(p_clinica_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if not private.has_role(p_clinica_id,array['admin','profissional','recepcao']) then
    raise exception 'Acesso não autorizado' using errcode='42501';
  end if;
  select jsonb_build_object(
    'pacientes', (select count(*) from public.paciente p where p.clinica_id=p_clinica_id and p.status='ativo'),
    'membros', (select count(*) from public.perfil p where p.clinica_id=p_clinica_id),
    'teca_mes', (select count(*) from public.teca_execucao t where t.clinica_id=p_clinica_id and t.created_at >= date_trunc('month',now())),
    'consultas_mes', (select count(*) from public.agendamento a where a.clinica_id=p_clinica_id and a.inicio >= date_trunc('month',now())),
    'receita_mes_centavos', (select coalesce(sum(c.valor_centavos-c.devolvido_centavos),0) from public.financeiro_cobranca c where c.clinica_id=p_clinica_id and c.status in ('recebida','devolvida_parcial') and c.recebida_em >= date_trunc('month',now()))
  ) into v_result;
  return v_result;
end; $$;
revoke all on function public.saas_usage_snapshot(uuid) from public, anon;
grant execute on function public.saas_usage_snapshot(uuid) to authenticated;
