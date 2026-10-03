create table public.teca_config (
  clinica_id uuid primary key references public.clinica(id) on delete cascade,
  habilitada boolean not null default false,
  provedor text not null default 'openai' check (provedor in ('openai', 'simulado')),
  modelo text not null default 'gpt-6-astra' check (char_length(btrim(modelo)) between 1 and 120),
  limite_geracoes_dia integer not null default 30 check (limite_geracoes_dia between 1 and 10000),
  limite_tokens integer not null default 12000 check (limite_tokens between 1000 and 100000),
  orcamento_centavos_mes integer not null default 5000 check (orcamento_centavos_mes >= 0),
  criado_por uuid references auth.users(id),
  atualizado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teca_fonte (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references public.clinica(id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 2 and 240),
  origem text not null check (char_length(btrim(origem)) between 2 and 500),
  versao text not null default '1',
  conteudo text not null check (char_length(btrim(conteudo)) between 20 and 200000),
  hash_conteudo text not null check (char_length(hash_conteudo) between 32 and 128),
  licenca text,
  status text not null default 'rascunho' check (status in ('rascunho', 'aprovada', 'revogada')),
  aprovado_por uuid references auth.users(id),
  aprovado_em timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinica_id, hash_conteudo)
);
create index teca_fonte_scope_idx on public.teca_fonte(clinica_id, status, updated_at desc);
create index teca_fonte_search_idx on public.teca_fonte using gin(to_tsvector('portuguese', titulo || ' ' || conteudo));

create table public.teca_trecho (
  id uuid primary key default gen_random_uuid(),
  fonte_id uuid not null references public.teca_fonte(id) on delete cascade,
  clinica_id uuid references public.clinica(id) on delete cascade,
  ordem integer not null check (ordem >= 0),
  texto text not null check (char_length(btrim(texto)) between 20 and 12000),
  created_at timestamptz not null default now(),
  unique (fonte_id, ordem)
);
create index teca_trecho_scope_idx on public.teca_trecho(clinica_id, fonte_id);

create table public.teca_execucao (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  paciente_id uuid not null,
  agendamento_id uuid,
  plano_id uuid,
  tarefa text not null check (tarefa in ('resumo', 'nota', 'plano')),
  estado text not null default 'processando' check (estado in ('processando', 'rascunho', 'aprovado', 'descartado', 'bloqueado', 'erro')),
  provedor text not null,
  modelo text not null,
  prompt_versao text not null,
  contexto_hash text not null,
  contexto_versao jsonb not null default '{}'::jsonb,
  resultado jsonb not null default '{}'::jsonb,
  erro_resumo text,
  tokens_entrada integer,
  tokens_saida integer,
  custo_centavos integer not null default 0 check (custo_centavos >= 0),
  criado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (clinica_id, contexto_hash, tarefa, criado_por) deferrable initially immediate,
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id),
  foreign key (agendamento_id, clinica_id) references public.agendamento(id, clinica_id),
  foreign key (plano_id, clinica_id, paciente_id) references public.plano_alimentar(id, clinica_id, paciente_id)
);
create index teca_execucao_scope_idx on public.teca_execucao(clinica_id, estado, created_at desc);
create index teca_execucao_patient_idx on public.teca_execucao(paciente_id, tarefa, created_at desc);
create index teca_execucao_context_idx on public.teca_execucao(clinica_id, contexto_hash, tarefa, created_at desc);

create table public.teca_artefato (
  id uuid primary key default gen_random_uuid(),
  execucao_id uuid not null references public.teca_execucao(id) on delete cascade,
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  paciente_id uuid not null,
  tipo text not null check (tipo in ('resumo', 'nota', 'plano')),
  conteudo jsonb not null check (jsonb_typeof(conteudo) = 'object'),
  fontes jsonb not null default '[]'::jsonb,
  guardas jsonb not null default '[]'::jsonb,
  estado text not null default 'rascunho' check (estado in ('rascunho', 'bloqueado', 'aprovado', 'descartado')),
  editado_em timestamptz,
  aprovado_por uuid references auth.users(id),
  aprovado_em timestamptz,
  created_at timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id)
);
create index teca_artefato_scope_idx on public.teca_artefato(clinica_id, estado, created_at desc);

create table public.teca_decisao (
  id uuid primary key default gen_random_uuid(),
  artefato_id uuid not null references public.teca_artefato(id) on delete cascade,
  execucao_id uuid not null references public.teca_execucao(id) on delete cascade,
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  paciente_id uuid not null,
  acao text not null check (acao in ('aprovar', 'descartar', 'editar', 'sobrescrever_guarda')),
  justificativa text,
  guardas jsonb not null default '[]'::jsonb,
  valor_antes jsonb,
  valor_depois jsonb,
  decidido_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id)
);
create index teca_decisao_scope_idx on public.teca_decisao(clinica_id, created_at desc);

create table public.teca_uso (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  usuario_id uuid not null references auth.users(id),
  execucao_id uuid references public.teca_execucao(id) on delete set null,
  tarefa text not null,
  tokens_entrada integer not null default 0,
  tokens_saida integer not null default 0,
  custo_centavos integer not null default 0,
  created_at timestamptz not null default now()
);
create index teca_uso_month_idx on public.teca_uso(clinica_id, created_at desc);

create or replace function private.teca_staff(target_clinic uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role(target_clinic, array['admin', 'profissional']);
$$;
revoke all on function private.teca_staff(uuid) from public, anon;
grant execute on function private.teca_staff(uuid) to authenticated;

create or replace function private.teca_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.teca_set_updated_at() from public, anon, authenticated;

create or replace function private.teca_guard_plan_approval()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  allergy text;
  item record;
begin
  if new.status = 'aprovado' and (old.status is distinct from 'aprovado') then
    if not new.alergias_revisadas or new.aprovado_por is distinct from auth.uid() then
      raise exception 'Aprovação exige revisão de alergias e autor identificado' using errcode = '42501';
    end if;
    for allergy in select lower(btrim(a.substancia)) from public.alergia a where a.paciente_id = new.paciente_id and a.clinica_id = new.clinica_id and a.ativo loop
      for item in select lower(i.nome_snapshot) as nome from public.plano_item i where i.plano_id = new.id and i.substitui_item_id is null loop
        if item.nome like '%' || allergy || '%' then
          raise exception 'Plano contém alergênico registrado: %', allergy using errcode = '23514';
        end if;
      end loop;
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function private.teca_guard_plan_approval() from public, anon, authenticated;
create trigger teca_guard_plan before update on public.plano_alimentar
  for each row execute function private.teca_guard_plan_approval();

alter table public.teca_config enable row level security;
alter table public.teca_fonte enable row level security;
alter table public.teca_trecho enable row level security;
alter table public.teca_execucao enable row level security;
alter table public.teca_artefato enable row level security;
alter table public.teca_decisao enable row level security;
alter table public.teca_uso enable row level security;
revoke all on public.teca_config, public.teca_fonte, public.teca_trecho, public.teca_execucao, public.teca_artefato, public.teca_decisao, public.teca_uso from anon, authenticated;
grant select, insert, update on public.teca_config to authenticated;
grant select, insert, update on public.teca_fonte, public.teca_trecho to authenticated;
grant select, insert, update on public.teca_execucao, public.teca_artefato, public.teca_decisao to authenticated;
grant select on public.teca_uso to authenticated;

create policy "teca config staff" on public.teca_config for all to authenticated
  using (private.teca_staff(clinica_id)) with check (private.teca_staff(clinica_id));
create policy "teca sources staff" on public.teca_fonte for all to authenticated
  using (private.teca_staff(coalesce(clinica_id, (select p.clinica_id from public.perfil p where p.user_id = (select auth.uid())))))
  with check (private.teca_staff(coalesce(clinica_id, (select p.clinica_id from public.perfil p where p.user_id = (select auth.uid())))));
create policy "teca chunks staff" on public.teca_trecho for all to authenticated
  using (private.teca_staff(coalesce(clinica_id, (select f.clinica_id from public.teca_fonte f where f.id = fonte_id))))
  with check (private.teca_staff(coalesce(clinica_id, (select f.clinica_id from public.teca_fonte f where f.id = fonte_id))));
create policy "teca executions staff" on public.teca_execucao for all to authenticated
  using (private.teca_staff(clinica_id)) with check (private.teca_staff(clinica_id));
create policy "teca artifacts staff" on public.teca_artefato for all to authenticated
  using (private.teca_staff(clinica_id)) with check (private.teca_staff(clinica_id));
create policy "teca decisions staff" on public.teca_decisao for all to authenticated
  using (private.teca_staff(clinica_id)) with check (private.teca_staff(clinica_id));
create policy "teca usage staff" on public.teca_uso for select to authenticated
  using (private.teca_staff(clinica_id));

create trigger teca_config_updated before update on public.teca_config
  for each row execute function private.teca_set_updated_at();
create trigger teca_fonte_updated before update on public.teca_fonte
  for each row execute function private.teca_set_updated_at();
