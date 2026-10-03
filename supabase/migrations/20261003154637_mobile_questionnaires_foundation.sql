-- Shared identity for web and mobile. Clinic permissions remain in public.perfil.
create table public.usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('nutri', 'paciente')),
  nome text not null check (char_length(btrim(nome)) between 2 and 160),
  telefone text,
  avatar_path text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.usuario(id, tipo, nome)
select p.user_id, 'nutri', p.nome from public.perfil p
on conflict (id) do nothing;

insert into public.usuario(id, tipo, nome)
select distinct on (a.user_id) a.user_id, 'paciente', p.nome
from public.paciente_acesso a
join public.paciente p on p.id = a.paciente_id
order by a.user_id, a.created_at
on conflict (id) do nothing;

create function private.sync_staff_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.usuario(id, tipo, nome)
  values (new.user_id, 'nutri', new.nome)
  on conflict (id) do update set nome = excluded.nome, updated_at = now()
  where public.usuario.tipo = 'nutri';
  return new;
end;
$$;
revoke all on function private.sync_staff_user() from public, anon, authenticated;

create trigger perfil_sync_usuario after insert or update of nome on public.perfil
  for each row execute function private.sync_staff_user();

create function private.sync_patient_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.usuario(id, tipo, nome)
  select new.user_id, 'paciente', p.nome from public.paciente p where p.id = new.paciente_id
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.sync_patient_user() from public, anon, authenticated;

create trigger paciente_acesso_sync_usuario after insert on public.paciente_acesso
  for each row execute function private.sync_patient_user();

create trigger usuario_updated_at before update on public.usuario
  for each row execute function private.touch_updated_at();

alter table public.usuario enable row level security;
revoke all on public.usuario from anon, authenticated;
grant select on public.usuario to authenticated;
grant update(nome, telefone, avatar_path) on public.usuario to authenticated;

create policy "user reads own shared profile" on public.usuario
  for select to authenticated
  using (id = (select auth.uid()));

create policy "user updates own shared profile" on public.usuario
  for update to authenticated
  using (id = (select auth.uid()) and ativo)
  with check (id = (select auth.uid()) and ativo);

-- An explicit relationship narrows clinical access to the responsible professional.
create table public.paciente_profissional (
  paciente_id uuid not null,
  clinica_id uuid not null,
  profissional_id uuid not null references auth.users(id) on delete cascade,
  principal boolean not null default false,
  ativo boolean not null default true,
  vinculado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (paciente_id, profissional_id),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id) on delete cascade
);
create index paciente_profissional_profissional_idx
  on public.paciente_profissional(profissional_id, ativo, paciente_id);
create unique index paciente_profissional_principal_idx
  on public.paciente_profissional(paciente_id) where principal and ativo;

insert into public.paciente_profissional(paciente_id, clinica_id, profissional_id, principal, vinculado_por)
select p.id, p.clinica_id, m.user_id, m.user_id = c.created_by, p.cadastrado_por
from public.paciente p
join public.clinica c on c.id = p.clinica_id
join public.perfil m on m.clinica_id = p.clinica_id and m.papel in ('admin', 'profissional')
on conflict (paciente_id, profissional_id) do nothing;

create function private.can_manage_patient(target_patient uuid, target_clinic uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.perfil p
      where p.user_id = auth.uid() and p.clinica_id = target_clinic and p.papel = 'admin'
    )
    or exists (
      select 1 from public.paciente_profissional pp
      where pp.paciente_id = target_patient and pp.clinica_id = target_clinic
        and pp.profissional_id = auth.uid() and pp.ativo
    )
  );
$$;
revoke all on function private.can_manage_patient(uuid, uuid) from public, anon;
grant execute on function private.can_manage_patient(uuid, uuid) to authenticated;

create function private.link_patient_creator()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.perfil p where p.user_id = new.cadastrado_por
      and p.clinica_id = new.clinica_id and p.papel in ('admin', 'profissional')
  ) then
    insert into public.paciente_profissional(
      paciente_id, clinica_id, profissional_id, principal, vinculado_por
    ) values (
      new.id, new.clinica_id, new.cadastrado_por, true, new.cadastrado_por
    ) on conflict (paciente_id, profissional_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.link_patient_creator() from public, anon, authenticated;

create trigger paciente_link_creator after insert on public.paciente
  for each row execute function private.link_patient_creator();

alter table public.paciente_profissional enable row level security;
revoke all on public.paciente_profissional from anon, authenticated;
grant select, insert on public.paciente_profissional to authenticated;
grant update(ativo, principal) on public.paciente_profissional to authenticated;

create policy "clinical team reads patient assignments" on public.paciente_profissional
  for select to authenticated
  using (
    private.has_role(clinica_id, array['admin'])
    or profissional_id = (select auth.uid())
  );
create policy "admin assigns patient professionals" on public.paciente_profissional
  for insert to authenticated
  with check (
    private.has_role(clinica_id, array['admin'])
    and vinculado_por = (select auth.uid())
    and exists (
      select 1 from public.perfil p where p.user_id = profissional_id
        and p.clinica_id = paciente_profissional.clinica_id
        and p.papel in ('admin', 'profissional')
    )
  );
create policy "admin updates patient professionals" on public.paciente_profissional
  for update to authenticated
  using (private.has_role(clinica_id, array['admin']))
  with check (private.has_role(clinica_id, array['admin']));

-- Questionnaires are versioned so an assignment never changes under a patient.
create table public.questionario (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 3 and 120),
  descricao text not null default '' check (char_length(descricao) <= 1000),
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado', 'arquivado')),
  criado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, clinica_id)
);
create index questionario_clinica_status_idx on public.questionario(clinica_id, status, updated_at desc);

create table public.questionario_versao (
  id uuid primary key default gen_random_uuid(),
  questionario_id uuid not null,
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  numero integer not null check (numero > 0),
  status text not null default 'rascunho' check (status in ('rascunho', 'publicada')),
  publicada_por uuid references auth.users(id),
  publicada_em timestamptz,
  created_at timestamptz not null default now(),
  unique (questionario_id, numero),
  unique (id, clinica_id),
  foreign key (questionario_id, clinica_id) references public.questionario(id, clinica_id) on delete cascade
);
create index questionario_versao_questionario_idx on public.questionario_versao(questionario_id, numero desc);

create table public.questionario_questao (
  id uuid primary key default gen_random_uuid(),
  versao_id uuid not null,
  clinica_id uuid not null,
  ordem integer not null check (ordem > 0),
  enunciado text not null check (char_length(btrim(enunciado)) between 2 and 1000),
  tipo text not null check (tipo in (
    'texto_curto', 'texto_longo', 'numero', 'data', 'escolha_unica',
    'multipla_escolha', 'escala', 'sim_nao'
  )),
  obrigatoria boolean not null default false,
  texto_ajuda text check (char_length(texto_ajuda) <= 500),
  configuracao jsonb not null default '{}'::jsonb check (jsonb_typeof(configuracao) = 'object'),
  created_at timestamptz not null default now(),
  unique (versao_id, ordem),
  unique (id, clinica_id),
  unique (id, versao_id, clinica_id),
  foreign key (versao_id, clinica_id) references public.questionario_versao(id, clinica_id) on delete cascade
);
create index questionario_questao_versao_idx on public.questionario_questao(versao_id, ordem);

create table public.questionario_opcao (
  id uuid primary key default gen_random_uuid(),
  questao_id uuid not null,
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  ordem integer not null check (ordem > 0),
  rotulo text not null check (char_length(btrim(rotulo)) between 1 and 300),
  valor text not null check (char_length(btrim(valor)) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (questao_id, ordem),
  foreign key (questao_id, clinica_id) references public.questionario_questao(id, clinica_id) on delete cascade
);
create index questionario_opcao_questao_idx on public.questionario_opcao(questao_id, ordem);

create table public.questionario_atribuicao (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  paciente_id uuid not null,
  versao_id uuid not null,
  atribuida_por uuid not null references auth.users(id),
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'respondido', 'cancelado')),
  prazo_em timestamptz,
  iniciada_em timestamptz,
  respondida_em timestamptz,
  created_at timestamptz not null default now(),
  unique (id, versao_id, paciente_id, clinica_id),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id) on delete cascade,
  foreign key (versao_id, clinica_id) references public.questionario_versao(id, clinica_id)
);
create index questionario_atribuicao_paciente_idx
  on public.questionario_atribuicao(paciente_id, status, created_at desc);
create index questionario_atribuicao_clinica_idx
  on public.questionario_atribuicao(clinica_id, status, prazo_em);

create table public.questionario_resposta (
  id uuid primary key default gen_random_uuid(),
  atribuicao_id uuid not null,
  versao_id uuid not null,
  paciente_id uuid not null,
  clinica_id uuid not null,
  respondida_por uuid not null references auth.users(id),
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada')),
  enviada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (atribuicao_id),
  unique (id, versao_id, paciente_id, clinica_id),
  foreign key (atribuicao_id, versao_id, paciente_id, clinica_id)
    references public.questionario_atribuicao(id, versao_id, paciente_id, clinica_id) on delete cascade
);
create index questionario_resposta_paciente_idx on public.questionario_resposta(paciente_id, created_at desc);

create table public.questionario_resposta_item (
  id uuid primary key default gen_random_uuid(),
  resposta_id uuid not null,
  questao_id uuid not null,
  versao_id uuid not null,
  paciente_id uuid not null,
  clinica_id uuid not null,
  valor_texto text check (char_length(valor_texto) <= 5000),
  valor_numero numeric,
  valor_data date,
  opcao_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (resposta_id, questao_id),
  foreign key (resposta_id, versao_id, paciente_id, clinica_id)
    references public.questionario_resposta(id, versao_id, paciente_id, clinica_id) on delete cascade,
  foreign key (questao_id, versao_id, clinica_id)
    references public.questionario_questao(id, versao_id, clinica_id),
  check (num_nonnulls(valor_texto, valor_numero, valor_data) + (cardinality(opcao_ids) > 0)::integer <= 1)
);
create index questionario_resposta_item_resposta_idx on public.questionario_resposta_item(resposta_id);
create index questionario_resposta_item_questao_idx on public.questionario_resposta_item(questao_id);

create trigger questionario_updated_at before update on public.questionario
  for each row execute function private.touch_updated_at();
create trigger questionario_resposta_updated_at before update on public.questionario_resposta
  for each row execute function private.touch_updated_at();
create trigger questionario_resposta_item_updated_at before update on public.questionario_resposta_item
  for each row execute function private.touch_updated_at();

create function private.guard_published_questionnaire()
returns trigger language plpgsql
set search_path = ''
as $$
declare version_status text;
begin
  select v.status into version_status from public.questionario_versao v
  where v.id = coalesce(new.versao_id, old.versao_id);
  if version_status = 'publicada' then
    raise exception 'Versões publicadas são imutáveis';
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.guard_published_questionnaire() from public, anon, authenticated;

create trigger questionario_questao_immutable before update or delete on public.questionario_questao
  for each row execute function private.guard_published_questionnaire();

create function private.guard_published_option()
returns trigger language plpgsql
set search_path = ''
as $$
declare version_status text;
begin
  select v.status into version_status
  from public.questionario_questao q
  join public.questionario_versao v on v.id = q.versao_id
  where q.id = coalesce(new.questao_id, old.questao_id);
  if version_status = 'publicada' then
    raise exception 'Versões publicadas são imutáveis';
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.guard_published_option() from public, anon, authenticated;

create trigger questionario_opcao_immutable before update or delete on public.questionario_opcao
  for each row execute function private.guard_published_option();

create function private.guard_published_version()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'publicada' then
    raise exception 'Versões publicadas são imutáveis';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_published_version() from public, anon, authenticated;

create trigger questionario_versao_immutable before update on public.questionario_versao
  for each row execute function private.guard_published_version();

create function private.sync_questionnaire_assignment_status()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  update public.questionario_atribuicao
  set status = case when new.status = 'enviada' then 'respondido' else 'em_andamento' end,
      iniciada_em = coalesce(iniciada_em, now()),
      respondida_em = case when new.status = 'enviada' then coalesce(new.enviada_em, now()) else respondida_em end
  where id = new.atribuicao_id and status <> 'cancelado';
  return new;
end;
$$;
revoke all on function private.sync_questionnaire_assignment_status() from public, anon, authenticated;

create trigger questionario_resposta_sync_assignment
  after insert or update of status on public.questionario_resposta
  for each row execute function private.sync_questionnaire_assignment_status();

alter table public.questionario enable row level security;
alter table public.questionario_versao enable row level security;
alter table public.questionario_questao enable row level security;
alter table public.questionario_opcao enable row level security;
alter table public.questionario_atribuicao enable row level security;
alter table public.questionario_resposta enable row level security;
alter table public.questionario_resposta_item enable row level security;

revoke all on public.questionario, public.questionario_versao, public.questionario_questao,
  public.questionario_opcao, public.questionario_atribuicao, public.questionario_resposta,
  public.questionario_resposta_item from anon, authenticated;
grant select, insert on public.questionario, public.questionario_versao, public.questionario_questao,
  public.questionario_opcao, public.questionario_atribuicao, public.questionario_resposta,
  public.questionario_resposta_item to authenticated;
grant update(titulo, descricao, status) on public.questionario to authenticated;
grant update(status, publicada_por, publicada_em) on public.questionario_versao to authenticated;
grant update(enunciado, tipo, obrigatoria, texto_ajuda, configuracao, ordem) on public.questionario_questao to authenticated;
grant update(rotulo, valor, ordem) on public.questionario_opcao to authenticated;
grant update(status, iniciada_em, respondida_em) on public.questionario_atribuicao to authenticated;
grant update(status, enviada_em) on public.questionario_resposta to authenticated;
grant update(valor_texto, valor_numero, valor_data, opcao_ids) on public.questionario_resposta_item to authenticated;
grant delete on public.questionario_questao, public.questionario_opcao, public.questionario_resposta_item to authenticated;

create policy "staff reads clinic questionnaires" on public.questionario
  for select to authenticated using (
    private.has_role(clinica_id, array['admin', 'profissional'])
    or exists (
      select 1 from public.questionario_versao v
      join public.questionario_atribuicao a on a.versao_id = v.id
      where v.questionario_id = questionario.id and v.status = 'publicada' and private.is_patient(a.paciente_id)
    )
  );
create policy "staff creates clinic questionnaires" on public.questionario
  for insert to authenticated with check (
    private.has_role(clinica_id, array['admin', 'profissional']) and criado_por = (select auth.uid())
  );
create policy "staff updates clinic questionnaires" on public.questionario
  for update to authenticated using (private.has_role(clinica_id, array['admin', 'profissional']))
  with check (private.has_role(clinica_id, array['admin', 'profissional']));

create policy "staff or assigned patient reads questionnaire versions" on public.questionario_versao
  for select to authenticated using (
    private.has_role(clinica_id, array['admin', 'profissional'])
    or (status = 'publicada' and exists (
      select 1 from public.questionario_atribuicao a
      where a.versao_id = questionario_versao.id and private.is_patient(a.paciente_id)
    ))
  );
create policy "staff creates questionnaire versions" on public.questionario_versao
  for insert to authenticated with check (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "staff publishes questionnaire versions" on public.questionario_versao
  for update to authenticated using (private.has_role(clinica_id, array['admin', 'profissional']))
  with check (private.has_role(clinica_id, array['admin', 'profissional']));

create policy "staff or assigned patient reads questions" on public.questionario_questao
  for select to authenticated using (
    private.has_role(clinica_id, array['admin', 'profissional'])
    or exists (
      select 1 from public.questionario_atribuicao a
      join public.questionario_versao v on v.id = a.versao_id and v.status = 'publicada'
      where a.versao_id = questionario_questao.versao_id and private.is_patient(a.paciente_id)
    )
  );
create policy "staff inserts draft questions" on public.questionario_questao
  for insert to authenticated with check (
    private.has_role(clinica_id, array['admin', 'profissional'])
    and exists (select 1 from public.questionario_versao v where v.id = versao_id and v.status = 'rascunho')
  );
create policy "staff updates draft questions" on public.questionario_questao
  for update to authenticated using (
    private.has_role(clinica_id, array['admin', 'profissional'])
    and exists (select 1 from public.questionario_versao v where v.id = versao_id and v.status = 'rascunho')
  ) with check (
    private.has_role(clinica_id, array['admin', 'profissional'])
    and exists (select 1 from public.questionario_versao v where v.id = versao_id and v.status = 'rascunho')
  );
create policy "staff deletes draft questions" on public.questionario_questao
  for delete to authenticated using (
    private.has_role(clinica_id, array['admin', 'profissional'])
    and exists (select 1 from public.questionario_versao v where v.id = versao_id and v.status = 'rascunho')
  );

create policy "staff or assigned patient reads options" on public.questionario_opcao
  for select to authenticated using (
    private.has_role(clinica_id, array['admin', 'profissional'])
    or exists (
      select 1 from public.questionario_questao q
      join public.questionario_atribuicao a on a.versao_id = q.versao_id
      join public.questionario_versao v on v.id = a.versao_id and v.status = 'publicada'
      where q.id = questionario_opcao.questao_id and private.is_patient(a.paciente_id)
    )
  );
create policy "staff inserts draft options" on public.questionario_opcao
  for insert to authenticated with check (
    private.has_role(clinica_id, array['admin', 'profissional'])
    and exists (
      select 1 from public.questionario_questao q join public.questionario_versao v on v.id = q.versao_id
      where q.id = questao_id and v.status = 'rascunho'
    )
  );
create policy "staff updates draft options" on public.questionario_opcao
  for update to authenticated using (
    private.has_role(clinica_id, array['admin', 'profissional'])
    and exists (
      select 1 from public.questionario_questao q join public.questionario_versao v on v.id = q.versao_id
      where q.id = questao_id and v.status = 'rascunho'
    )
  ) with check (
    private.has_role(clinica_id, array['admin', 'profissional'])
    and exists (
      select 1 from public.questionario_questao q join public.questionario_versao v on v.id = q.versao_id
      where q.id = questao_id and v.status = 'rascunho'
    )
  );
create policy "staff deletes draft options" on public.questionario_opcao
  for delete to authenticated using (
    private.has_role(clinica_id, array['admin', 'profissional'])
    and exists (
      select 1 from public.questionario_questao q join public.questionario_versao v on v.id = q.versao_id
      where q.id = questao_id and v.status = 'rascunho'
    )
  );

create policy "staff or patient reads assignments" on public.questionario_atribuicao
  for select to authenticated using (
    private.can_manage_patient(paciente_id, clinica_id) or private.is_patient(paciente_id)
  );
create policy "staff assigns published questionnaires" on public.questionario_atribuicao
  for insert to authenticated with check (
    private.can_manage_patient(paciente_id, clinica_id)
    and atribuida_por = (select auth.uid())
    and exists (select 1 from public.questionario_versao v where v.id = versao_id and v.status = 'publicada')
  );
create policy "staff updates questionnaire assignments" on public.questionario_atribuicao
  for update to authenticated using (private.can_manage_patient(paciente_id, clinica_id))
  with check (private.can_manage_patient(paciente_id, clinica_id));

create policy "staff or patient reads questionnaire responses" on public.questionario_resposta
  for select to authenticated using (
    private.can_manage_patient(paciente_id, clinica_id)
    or (respondida_por = (select auth.uid()) and private.is_patient(paciente_id))
  );
create policy "patient starts own questionnaire response" on public.questionario_resposta
  for insert to authenticated with check (
    respondida_por = (select auth.uid()) and private.is_patient(paciente_id) and status = 'rascunho'
    and exists (
      select 1 from public.questionario_atribuicao a where a.id = atribuicao_id
        and a.paciente_id = questionario_resposta.paciente_id and a.status in ('pendente', 'em_andamento')
    )
  );
create policy "patient submits own draft response" on public.questionario_resposta
  for update to authenticated using (
    respondida_por = (select auth.uid()) and private.is_patient(paciente_id) and status = 'rascunho'
  ) with check (
    respondida_por = (select auth.uid()) and private.is_patient(paciente_id) and status in ('rascunho', 'enviada')
  );

create policy "staff or patient reads response items" on public.questionario_resposta_item
  for select to authenticated using (
    private.can_manage_patient(paciente_id, clinica_id)
    or exists (
      select 1 from public.questionario_resposta r where r.id = resposta_id
        and r.respondida_por = (select auth.uid()) and private.is_patient(r.paciente_id)
    )
  );
create policy "patient inserts own draft response items" on public.questionario_resposta_item
  for insert to authenticated with check (
    exists (
      select 1 from public.questionario_resposta r where r.id = resposta_id
        and r.respondida_por = (select auth.uid()) and r.status = 'rascunho' and private.is_patient(r.paciente_id)
    )
  );
create policy "patient updates own draft response items" on public.questionario_resposta_item
  for update to authenticated using (
    exists (
      select 1 from public.questionario_resposta r where r.id = resposta_id
        and r.respondida_por = (select auth.uid()) and r.status = 'rascunho' and private.is_patient(r.paciente_id)
    )
  ) with check (
    exists (
      select 1 from public.questionario_resposta r where r.id = resposta_id
        and r.respondida_por = (select auth.uid()) and r.status = 'rascunho' and private.is_patient(r.paciente_id)
    )
  );
create policy "patient deletes own draft response items" on public.questionario_resposta_item
  for delete to authenticated using (
    exists (
      select 1 from public.questionario_resposta r where r.id = resposta_id
        and r.respondida_por = (select auth.uid()) and r.status = 'rascunho' and private.is_patient(r.paciente_id)
    )
  );

create function public.create_questionnaire_draft(p_title text, p_description text default '')
returns uuid language plpgsql security invoker
set search_path = ''
as $$
declare target_clinic uuid; questionnaire_id uuid;
begin
  select p.clinica_id into target_clinic from public.perfil p
  where p.user_id = auth.uid() and p.papel in ('admin', 'profissional');
  if target_clinic is null then raise exception 'Acesso negado'; end if;
  if char_length(btrim(p_title)) not between 3 and 120 then raise exception 'Título inválido'; end if;
  insert into public.questionario(clinica_id, titulo, descricao, criado_por)
  values (target_clinic, btrim(p_title), coalesce(btrim(p_description), ''), auth.uid())
  returning id into questionnaire_id;
  insert into public.questionario_versao(questionario_id, clinica_id, numero)
  values (questionnaire_id, target_clinic, 1);
  return questionnaire_id;
end;
$$;
revoke all on function public.create_questionnaire_draft(text, text) from public, anon;
grant execute on function public.create_questionnaire_draft(text, text) to authenticated;

create function public.publish_questionnaire(p_questionnaire_id uuid)
returns uuid language plpgsql security invoker
set search_path = ''
as $$
declare version_id uuid; target_clinic uuid; question_count integer;
begin
  select q.clinica_id, v.id into target_clinic, version_id
  from public.questionario q join public.questionario_versao v on v.questionario_id = q.id
  where q.id = p_questionnaire_id and v.status = 'rascunho'
  order by v.numero desc limit 1;
  if version_id is null or not private.has_role(target_clinic, array['admin', 'profissional']) then
    raise exception 'Acesso negado';
  end if;
  select count(*) into question_count from public.questionario_questao where versao_id = version_id;
  if question_count = 0 then raise exception 'Adicione pelo menos uma pergunta'; end if;
  update public.questionario_versao set status = 'publicada', publicada_por = auth.uid(), publicada_em = now()
  where id = version_id;
  update public.questionario set status = 'publicado' where id = p_questionnaire_id;
  return version_id;
end;
$$;
revoke all on function public.publish_questionnaire(uuid) from public, anon;
grant execute on function public.publish_questionnaire(uuid) to authenticated;
