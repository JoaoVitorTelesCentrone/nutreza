-- Phase 4: food data is immutable per published source version. A corrected
-- dataset is imported as a new source version, preserving older calculations.
create table public.alimento_fonte (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (nome in ('TACO', 'TBCA')),
  versao text not null check (char_length(btrim(versao)) between 1 and 40),
  referencia_url text not null,
  licenca text not null,
  atribuicao text not null,
  autorizacao_ref text,
  arquivo_sha256 text not null check (arquivo_sha256 ~ '^[0-9a-f]{64}$'),
  normalizado_sha256 text not null check (normalizado_sha256 ~ '^[0-9a-f]{64}$'),
  importado_em timestamptz not null default now(),
  check (nome <> 'TBCA' or (autorizacao_ref is not null and char_length(btrim(autorizacao_ref)) >= 6)),
  unique (nome, versao)
);

create table public.alimento (
  id uuid primary key default gen_random_uuid(),
  fonte_id uuid references public.alimento_fonte(id),
  codigo text,
  clinica_id uuid references public.clinica(id),
  nome text not null check (char_length(btrim(nome)) between 2 and 240),
  grupo text,
  energia_kcal_100g numeric(12,4) check (energia_kcal_100g >= 0),
  proteina_g_100g numeric(12,4) check (proteina_g_100g >= 0),
  carboidrato_g_100g numeric(12,4) check (carboidrato_g_100g >= 0),
  lipidios_g_100g numeric(12,4) check (lipidios_g_100g >= 0),
  fibra_g_100g numeric(12,4) check (fibra_g_100g >= 0),
  sodio_mg_100g numeric(12,4) check (sodio_mg_100g >= 0),
  dados_ausentes text[] not null default '{}',
  alergenicos text[] not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (fonte_id, codigo),
  unique (id, clinica_id),
  check ((fonte_id is not null and codigo is not null and clinica_id is null and created_by is null)
      or (fonte_id is null and codigo is null and clinica_id is not null and created_by is not null))
);
create index alimento_nome_idx on public.alimento using gin (to_tsvector('portuguese', nome));
create index alimento_clinica_idx on public.alimento(clinica_id, nome);

create table public.alimento_medida (
  id uuid primary key default gen_random_uuid(),
  alimento_id uuid not null references public.alimento(id),
  nome text not null check (char_length(btrim(nome)) between 2 and 100),
  gramas numeric(12,3) not null check (gramas > 0 and gramas <= 10000),
  origem text not null check (origem in ('fonte', 'profissional')),
  clinica_id uuid references public.clinica(id),
  created_by uuid references auth.users(id),
  unique (alimento_id, nome, clinica_id),
  check ((origem = 'fonte' and clinica_id is null and created_by is null)
      or (origem = 'profissional' and clinica_id is not null and created_by is not null))
);

create table public.receita (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id),
  nome text not null check (char_length(btrim(nome)) between 3 and 160),
  rendimento_g numeric(12,3) not null check (rendimento_g > 0 and rendimento_g <= 100000),
  preparo text not null default '' check (char_length(preparo) <= 5000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (id, clinica_id)
);
create table public.receita_ingrediente (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid not null,
  clinica_id uuid not null,
  alimento_id uuid not null references public.alimento(id),
  gramas numeric(12,3) not null check (gramas > 0 and gramas <= 100000),
  ordem integer not null default 0 check (ordem >= 0),
  foreign key (receita_id, clinica_id) references public.receita(id, clinica_id)
);
create index receita_ingrediente_receita_idx on public.receita_ingrediente(receita_id, ordem);

create function private.is_clinician()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.perfil p where p.user_id = auth.uid()
      and p.papel in ('admin', 'profissional')
  );
$$;
revoke all on function private.is_clinician() from public, anon;
grant execute on function private.is_clinician() to authenticated;

create function private.validate_food_measure()
returns trigger language plpgsql security definer set search_path = '' as $$
declare food public.alimento%rowtype;
begin
  select * into food from public.alimento where id = new.alimento_id;
  if food.id is null then raise exception 'Alimento não encontrado' using errcode = '22023'; end if;
  if new.origem = 'fonte' and food.fonte_id is null then
    raise exception 'Medida da fonte exige alimento importado' using errcode = '22023';
  end if;
  if new.origem = 'profissional' and
     (new.created_by is distinct from auth.uid() or
      not private.has_role(new.clinica_id, array['admin', 'profissional']) or
      (food.clinica_id is not null and food.clinica_id <> new.clinica_id)) then
    raise exception 'Medida não autorizada' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_food_measure() from public, anon, authenticated;
create trigger alimento_medida_validacao before insert or update on public.alimento_medida
  for each row execute function private.validate_food_measure();

create function private.validate_recipe_ingredient()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.alimento f where f.id = new.alimento_id
    and (f.clinica_id is null or f.clinica_id = new.clinica_id)) then
    raise exception 'Alimento não pertence ao consultório' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_recipe_ingredient() from public, anon, authenticated;
create trigger receita_ingrediente_validacao before insert or update on public.receita_ingrediente
  for each row execute function private.validate_recipe_ingredient();

alter table public.alimento_fonte enable row level security;
alter table public.alimento enable row level security;
alter table public.alimento_medida enable row level security;
alter table public.receita enable row level security;
alter table public.receita_ingrediente enable row level security;
revoke all on public.alimento_fonte, public.alimento, public.alimento_medida,
  public.receita, public.receita_ingrediente from anon, authenticated;
grant select, insert on public.alimento_fonte to service_role;
grant select, insert, update on public.alimento, public.alimento_medida to service_role;
grant select on public.alimento_fonte to authenticated;
grant select, insert, update on public.alimento to authenticated;
grant select, insert, update, delete on public.alimento_medida, public.receita,
  public.receita_ingrediente to authenticated;

create policy "clinician reads source" on public.alimento_fonte for select to authenticated
  using (private.is_clinician());
create policy "clinician reads food" on public.alimento for select to authenticated
  using (private.is_clinician() and
    (clinica_id is null or private.has_role(clinica_id, array['admin', 'profissional'])));
create policy "clinician creates custom food" on public.alimento for insert to authenticated
  with check (fonte_id is null and clinica_id is not null and created_by = (select auth.uid())
    and private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician edits custom food" on public.alimento for update to authenticated
  using (fonte_id is null and private.has_role(clinica_id, array['admin', 'profissional']))
  with check (fonte_id is null and private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician reads measures" on public.alimento_medida for select to authenticated
  using (private.is_clinician() and
    (clinica_id is null or private.has_role(clinica_id, array['admin', 'profissional'])));
create policy "clinician manages measures" on public.alimento_medida for insert to authenticated
  with check (origem = 'profissional' and created_by = (select auth.uid())
    and private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician updates measures" on public.alimento_medida for update to authenticated
  using (origem = 'profissional' and private.has_role(clinica_id, array['admin', 'profissional']))
  with check (origem = 'profissional' and private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician removes measures" on public.alimento_medida for delete to authenticated
  using (origem = 'profissional' and private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician reads recipes" on public.receita for select to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician creates recipes" on public.receita for insert to authenticated
  with check (created_by = (select auth.uid()) and private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician updates recipes" on public.receita for update to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional']))
  with check (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician deletes recipes" on public.receita for delete to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician reads recipe ingredients" on public.receita_ingrediente for select to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician adds recipe ingredients" on public.receita_ingrediente for insert to authenticated
  with check (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician updates recipe ingredients" on public.receita_ingrediente for update to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional']))
  with check (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician deletes recipe ingredients" on public.receita_ingrediente for delete to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional']));

create trigger alimento_custom_audit after insert or update on public.alimento
  for each row when (new.clinica_id is not null) execute function private.audit_clinical_change();
create trigger receita_audit after insert or update on public.receita
  for each row execute function private.audit_clinical_change();
