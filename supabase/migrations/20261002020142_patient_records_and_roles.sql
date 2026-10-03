-- Membership helpers live outside exposed API schemas. They read only the
-- authenticated user's own membership and never trust user_metadata.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create function private.has_role(target_clinic uuid, allowed_roles text[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.perfil p
    where p.user_id = auth.uid()
      and p.clinica_id = target_clinic
      and p.papel = any(allowed_roles)
  );
$$;
revoke all on function private.has_role(uuid, text[]) from public, anon;
grant execute on function private.has_role(uuid, text[]) to authenticated;

create policy "staff reads clinic" on public.clinica
  for select to authenticated
  using (private.has_role(id, array['admin', 'profissional', 'recepcao']));

create policy "admin reads clinic profiles" on public.perfil
  for select to authenticated
  using (private.has_role(clinica_id, array['admin']));

create policy "admin adds team member" on public.perfil
  for insert to authenticated
  with check (
    private.has_role(clinica_id, array['admin'])
    and user_id <> (select auth.uid())
  );

grant update(nome, crn, papel) on public.perfil to authenticated;
create policy "admin updates team member" on public.perfil
  for update to authenticated
  using (private.has_role(clinica_id, array['admin']))
  with check (
    private.has_role(clinica_id, array['admin'])
    and (
      papel = 'admin'
      or not exists (
        select 1 from public.clinica c
        where c.id = clinica_id and c.created_by = user_id
      )
    )
  );

create table public.paciente (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id),
  nome text not null check (char_length(btrim(nome)) between 2 and 160),
  nascimento date,
  sexo text check (sexo in ('feminino', 'masculino', 'outro', 'nao_informado')),
  email text,
  telefone text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'arquivado')),
  cadastrado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, clinica_id)
);
create index paciente_clinica_nome_idx on public.paciente(clinica_id, nome);

-- The patient login is linked separately so reception cannot grant itself
-- patient access by editing a demographic row.
create table public.paciente_acesso (
  paciente_id uuid not null,
  clinica_id uuid not null,
  user_id uuid not null references auth.users(id),
  vinculado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (paciente_id, user_id),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id)
);
create index paciente_acesso_user_idx on public.paciente_acesso(user_id);

create function private.is_patient(target_patient uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.paciente_acesso a
    where a.paciente_id = target_patient and a.user_id = auth.uid()
  );
$$;
revoke all on function private.is_patient(uuid) from public, anon;
grant execute on function private.is_patient(uuid) to authenticated;

create table public.alergia (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  paciente_id uuid not null,
  substancia text not null check (char_length(btrim(substancia)) between 2 and 120),
  gravidade text not null default 'nao_informada'
    check (gravidade in ('nao_informada', 'leve', 'moderada', 'grave')),
  observacao text,
  ativo boolean not null default true,
  registrado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id)
);
create unique index alergia_ativa_unica_idx
  on public.alergia(paciente_id, lower(btrim(substancia))) where ativo;

create table public.anamnese (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  paciente_id uuid not null,
  versao integer not null check (versao > 0),
  dados jsonb not null check (jsonb_typeof(dados) = 'object'),
  registrado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (paciente_id, versao),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id)
);

create table public.antropometria (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  paciente_id uuid not null,
  medida_em date not null,
  peso_kg numeric(6,2) check (peso_kg > 0 and peso_kg <= 500),
  altura_cm numeric(5,1) check (altura_cm > 0 and altura_cm <= 250),
  cintura_cm numeric(5,1) check (cintura_cm > 0 and cintura_cm <= 300),
  gordura_pct numeric(5,2) check (gordura_pct >= 0 and gordura_pct <= 100),
  massa_magra_kg numeric(6,2) check (massa_magra_kg > 0 and massa_magra_kg <= 500),
  observacao text,
  registrado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (num_nonnulls(peso_kg, altura_cm, cintura_cm, gordura_pct, massa_magra_kg) > 0),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id)
);
create index antropometria_paciente_data_idx on public.antropometria(paciente_id, medida_em desc);

create table public.evolucao (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  paciente_id uuid not null,
  serie_id uuid not null default gen_random_uuid(),
  versao integer not null default 1 check (versao > 0),
  consulta_em date not null,
  queixa text not null default '',
  avaliacao text not null default '',
  conduta text not null default '',
  registrado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (paciente_id, serie_id, versao),
  check (char_length(btrim(queixa || avaliacao || conduta)) > 0),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id)
);
create index evolucao_paciente_data_idx on public.evolucao(paciente_id, consulta_em desc);

create table public.documento (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  paciente_id uuid not null,
  storage_path text not null unique,
  nome_original text not null check (char_length(nome_original) between 1 and 180),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  tamanho_bytes bigint not null check (tamanho_bytes > 0 and tamanho_bytes <= 10485760),
  status text not null default 'pendente' check (status in ('pendente', 'pronto', 'arquivado')),
  enviado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (
    split_part(storage_path, '/', 1) = clinica_id::text
    and split_part(storage_path, '/', 2) = paciente_id::text
    and split_part(storage_path, '/', 3) = id::text
    and split_part(storage_path, '/', 4) = ''
  ),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id),
  paciente_id uuid,
  ator_id uuid default auth.uid(),
  acao text not null,
  entidade text not null,
  entidade_id uuid not null,
  campos_alterados text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_paciente_data_idx on public.audit_log(paciente_id, created_at desc);

create function private.touch_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public, anon, authenticated;
create trigger paciente_updated_at before update on public.paciente
  for each row execute function private.touch_updated_at();
create trigger alergia_updated_at before update on public.alergia
  for each row execute function private.touch_updated_at();

create function private.audit_clinical_change()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  changed_fields text[];
  target_id uuid;
  target_patient uuid;
begin
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(k), '{}') into changed_fields
      from jsonb_object_keys(to_jsonb(new)) as k
      where to_jsonb(new)->k is distinct from to_jsonb(old)->k;
  else
    select coalesce(array_agg(k), '{}') into changed_fields
      from jsonb_object_keys(to_jsonb(new)) as k;
  end if;
  target_id := (to_jsonb(new)->>'id')::uuid;
  if tg_table_name = 'paciente' then
    target_patient := target_id;
  elsif tg_table_name = 'perfil' then
    target_id := new.user_id;
    target_patient := null;
  else
    target_patient := (to_jsonb(new)->>'paciente_id')::uuid;
  end if;
  insert into public.audit_log
    (clinica_id, paciente_id, ator_id, acao, entidade, entidade_id, campos_alterados)
  values
    ((to_jsonb(new)->>'clinica_id')::uuid, target_patient, auth.uid(),
     lower(tg_op), tg_table_name, target_id, changed_fields);
  return new;
end;
$$;
revoke all on function private.audit_clinical_change() from public, anon, authenticated;

create trigger perfil_audit after insert or update on public.perfil
  for each row execute function private.audit_clinical_change();
create trigger paciente_audit after insert or update on public.paciente
  for each row execute function private.audit_clinical_change();
create trigger alergia_audit after insert or update on public.alergia
  for each row execute function private.audit_clinical_change();
create trigger anamnese_audit after insert on public.anamnese
  for each row execute function private.audit_clinical_change();
create trigger antropometria_audit after insert on public.antropometria
  for each row execute function private.audit_clinical_change();
create trigger evolucao_audit after insert on public.evolucao
  for each row execute function private.audit_clinical_change();
create trigger documento_audit after insert or update on public.documento
  for each row execute function private.audit_clinical_change();

alter table public.paciente enable row level security;
alter table public.paciente_acesso enable row level security;
alter table public.alergia enable row level security;
alter table public.anamnese enable row level security;
alter table public.antropometria enable row level security;
alter table public.evolucao enable row level security;
alter table public.documento enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.paciente, public.paciente_acesso, public.alergia,
  public.anamnese, public.antropometria, public.evolucao, public.documento,
  public.audit_log from anon, authenticated;
grant select, insert on public.paciente, public.paciente_acesso,
  public.alergia, public.anamnese, public.antropometria,
  public.evolucao, public.documento to authenticated;
grant select on public.audit_log to authenticated;
grant insert(clinica_id, paciente_id, acao, entidade, entidade_id)
  on public.audit_log to authenticated;
grant update(nome, nascimento, sexo, email, telefone, status)
  on public.paciente to authenticated;
grant update(ativo) on public.alergia to authenticated;
grant update(status) on public.documento to authenticated;

create policy "staff or patient reads patient" on public.paciente
  for select to authenticated
  using (
    private.has_role(clinica_id, array['admin', 'profissional', 'recepcao'])
    or private.is_patient(id)
  );
create policy "staff creates patient" on public.paciente
  for insert to authenticated
  with check (
    private.has_role(clinica_id, array['admin', 'profissional', 'recepcao'])
    and cadastrado_por = (select auth.uid())
  );
create policy "staff edits patient demographics" on public.paciente
  for update to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional', 'recepcao']))
  with check (private.has_role(clinica_id, array['admin', 'profissional', 'recepcao']));

create policy "staff or patient reads access link" on public.paciente_acesso
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_role(clinica_id, array['admin', 'profissional'])
  );
create policy "clinician links patient login" on public.paciente_acesso
  for insert to authenticated
  with check (
    private.has_role(clinica_id, array['admin', 'profissional'])
    and vinculado_por = (select auth.uid())
  );

create policy "clinician reads allergy" on public.alergia
  for select to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician adds allergy" on public.alergia
  for insert to authenticated
  with check (
    private.has_role(clinica_id, array['admin', 'profissional'])
    and registrado_por = (select auth.uid())
  );
create policy "clinician archives allergy" on public.alergia
  for update to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional']))
  with check (private.has_role(clinica_id, array['admin', 'profissional']));

create policy "clinician reads anamnesis" on public.anamnese
  for select to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician versions anamnesis" on public.anamnese
  for insert to authenticated
  with check (
    private.has_role(clinica_id, array['admin', 'profissional'])
    and registrado_por = (select auth.uid())
  );

create policy "clinician reads measurements" on public.antropometria
  for select to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician adds measurements" on public.antropometria
  for insert to authenticated
  with check (
    private.has_role(clinica_id, array['admin', 'profissional'])
    and registrado_por = (select auth.uid())
  );

create policy "clinician reads notes" on public.evolucao
  for select to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician versions notes" on public.evolucao
  for insert to authenticated
  with check (
    private.has_role(clinica_id, array['admin', 'profissional'])
    and registrado_por = (select auth.uid())
  );

create policy "clinician reads documents" on public.documento
  for select to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician records document" on public.documento
  for insert to authenticated
  with check (
    private.has_role(clinica_id, array['admin', 'profissional'])
    and enviado_por = (select auth.uid())
  );
create policy "clinician marks document" on public.documento
  for update to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional']))
  with check (private.has_role(clinica_id, array['admin', 'profissional']));

create policy "clinician reads audit" on public.audit_log
  for select to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician records patient access" on public.audit_log
  for insert to authenticated
  with check (
    acao = 'leitura'
    and entidade = 'paciente'
    and entidade_id = paciente_id
    and ator_id = (select auth.uid())
    and private.has_role(clinica_id, array['admin', 'profissional'])
    and exists (
      select 1 from public.paciente p
      where p.id = paciente_id and p.clinica_id = audit_log.clinica_id
    )
  );

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'prontuarios', 'prontuarios', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
) on conflict (id) do nothing;

create policy "clinician reads record files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'prontuarios'
    and exists (
      select 1 from public.paciente p
      where p.id::text = split_part(name, '/', 2)
        and p.clinica_id::text = split_part(name, '/', 1)
        and private.has_role(p.clinica_id, array['admin', 'profissional'])
    )
  );
create policy "clinician uploads record files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'prontuarios'
    and split_part(name, '/', 4) = ''
    and exists (
      select 1 from public.paciente p
      where p.id::text = split_part(name, '/', 2)
        and p.clinica_id::text = split_part(name, '/', 1)
        and private.has_role(p.clinica_id, array['admin', 'profissional'])
    )
  );
