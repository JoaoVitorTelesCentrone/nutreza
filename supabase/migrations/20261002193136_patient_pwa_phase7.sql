create table public.patient_invite (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  paciente_id uuid not null,
  email_normalizado text not null check (email_normalizado = lower(btrim(email_normalizado))),
  token_hash text not null unique check (char_length(token_hash) = 64),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id),
  check ((accepted_by is null) = (accepted_at is null))
);
create unique index patient_invite_active_idx on public.patient_invite(paciente_id, email_normalizado)
  where accepted_at is null and revoked_at is null;
create index patient_invite_clinic_idx on public.patient_invite(clinica_id, created_at desc);

create table public.patient_pwa_config (
  clinica_id uuid primary key references public.clinica(id) on delete cascade,
  photo_ai_enabled boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.patient_pwa_config enable row level security;
revoke all on public.patient_pwa_config from anon, authenticated;
grant select, insert, update on public.patient_pwa_config to authenticated;
create policy "patient pwa config staff manages" on public.patient_pwa_config
  for all to authenticated using (private.has_role(clinica_id, array['admin', 'profissional']))
  with check (private.has_role(clinica_id, array['admin', 'profissional']) and updated_by = (select auth.uid()));
create policy "patient reads clinic photo analysis availability" on public.patient_pwa_config
  for select to authenticated using (exists (select 1 from public.paciente_acesso a
    where a.clinica_id = patient_pwa_config.clinica_id and a.user_id = (select auth.uid())));

create table public.patient_consent_event (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  paciente_id uuid not null,
  user_id uuid not null references auth.users(id),
  finalidade text not null check (finalidade in ('uso_area_paciente', 'diario_foto_ia', 'compartilhar_fotos_diario', 'compartilhar_fotos_progresso', 'exibir_nutrientes')),
  versao_termo text not null check (char_length(btrim(versao_termo)) between 1 and 40),
  aceito boolean not null,
  created_at timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id)
);
create index patient_consent_history_idx on public.patient_consent_event(paciente_id, finalidade, created_at desc);

create table public.patient_consent_term (
  finalidade text not null check (finalidade in ('uso_area_paciente', 'diario_foto_ia', 'compartilhar_fotos_diario', 'compartilhar_fotos_progresso', 'exibir_nutrientes')),
  versao text not null,
  conteudo text not null check (char_length(btrim(conteudo)) between 10 and 4000),
  publicado_em timestamptz not null default now(),
  primary key (finalidade, versao)
);
alter table public.patient_consent_term enable row level security;
revoke all on public.patient_consent_term from anon, authenticated;
grant select on public.patient_consent_term to authenticated;
create policy "authenticated reads published patient terms" on public.patient_consent_term
  for select to authenticated using (true);
insert into public.patient_consent_term(finalidade, versao, conteudo) values
  ('uso_area_paciente', '2026-10-02-v1', 'A área do paciente permite consultar o plano alimentar aprovado, registrar relatos de refeições e acompanhar dados compartilhados com o consultório. O acesso é pessoal e vinculado à sua conta. Você pode retirar esta escolha; nesse caso, o acesso à área será suspenso.'),
  ('diario_foto_ia', '2026-10-02-v1', 'Se você autorizar, a foto escolhida será enviada ao serviço de inteligência artificial configurado pelo consultório para sugerir alimentos e porções. A sugestão é aproximada, pode estar errada e só será registrada depois que você revisar e confirmar. O recurso pode ser desativado pelo consultório.'),
  ('compartilhar_fotos_diario', '2026-10-02-v1', 'Se você autorizar, fotos de refeições registradas no diário poderão ser vistas pela equipe clínica autorizada do consultório para acompanhar seu relato. Sem essa escolha, a foto permanece privada para você.'),
  ('compartilhar_fotos_progresso', '2026-10-02-v1', 'Fotos de progresso são privadas por padrão. Se você autorizar o compartilhamento em cada foto, profissionais autorizados do consultório poderão visualizá-la. Você pode retirar esta escolha para novos acessos.'),
  ('exibir_nutrientes', '2026-10-02-v1', 'Você pode escolher exibir no aplicativo os valores e metas nutricionais incluídos no seu plano aprovado. Esta escolha altera apenas a visualização do plano.')
on conflict do nothing;

create table public.patient_progress (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  paciente_id uuid not null,
  registrado_por uuid not null references auth.users(id),
  client_entry_id uuid not null,
  medida_em date not null,
  peso_kg numeric(6,2) check (peso_kg > 0 and peso_kg <= 500),
  cintura_cm numeric(5,1) check (cintura_cm > 0 and cintura_cm <= 300),
  nota text not null default '' check (char_length(nota) <= 1000),
  versao integer not null default 1 check (versao > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (paciente_id, client_entry_id),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id),
  check (num_nonnulls(peso_kg, cintura_cm) > 0)
);
create index patient_progress_history_idx on public.patient_progress(paciente_id, medida_em desc);

create table public.patient_diary_entry (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  paciente_id uuid not null,
  registrado_por uuid not null references auth.users(id),
  client_entry_id uuid not null,
  refeicao text not null check (refeicao in ('cafe', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia', 'outro')),
  consumido_em timestamptz not null,
  descricao text not null default '' check (char_length(descricao) <= 2000),
  itens jsonb not null default '[]'::jsonb check (jsonb_typeof(itens) = 'array' and pg_column_size(itens) <= 16000),
  origem text not null default 'manual' check (origem in ('manual', 'foto')),
  foto_path text,
  compartilhado_com_profissional boolean not null default false,
  versao integer not null default 1 check (versao > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  excluido_em timestamptz,
  unique (paciente_id, client_entry_id),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id),
  check ((origem = 'foto' and foto_path is not null) or origem = 'manual')
);
create index patient_diary_timeline_idx on public.patient_diary_entry(paciente_id, consumido_em desc) where excluido_em is null;

create table public.patient_progress_photo (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  paciente_id uuid not null,
  registrado_por uuid not null references auth.users(id),
  client_entry_id uuid not null,
  foto_path text not null unique,
  tirada_em date not null,
  compartilhado_com_profissional boolean not null default false,
  created_at timestamptz not null default now(),
  unique (paciente_id, client_entry_id),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id)
);
create index patient_progress_photo_history_idx on public.patient_progress_photo(paciente_id, tirada_em desc);

create table public.patient_data_request (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  paciente_id uuid not null,
  user_id uuid not null references auth.users(id),
  tipo text not null check (tipo in ('exportacao', 'correcao', 'desvinculacao', 'exclusao_conta')),
  observacao text not null default '' check (char_length(observacao) <= 1000),
  status text not null default 'solicitada' check (status in ('solicitada', 'em_analise', 'concluida', 'indeferida')),
  created_at timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id)
);
create index patient_data_request_clinic_idx on public.patient_data_request(clinica_id, status, created_at desc);

create table public.patient_photo_ai_usage (
  user_id uuid not null references auth.users(id),
  usage_day date not null default (now() at time zone 'utc')::date,
  calls integer not null default 0 check (calls between 0 and 20),
  primary key (user_id, usage_day)
);
alter table public.patient_photo_ai_usage enable row level security;
revoke all on public.patient_photo_ai_usage from anon, authenticated;

create or replace function public.consume_patient_photo_ai_call(p_paciente_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_allowed boolean;
begin
  if v_user is null or not private.is_patient(p_paciente_id) then return false; end if;
  select coalesce((select c.aceito from public.patient_consent_event c
    where c.paciente_id = p_paciente_id and c.user_id = v_user and c.finalidade = 'diario_foto_ia'
    order by c.created_at desc limit 1), false) into v_allowed;
  if not v_allowed then return false; end if;
  insert into public.patient_photo_ai_usage(user_id, usage_day, calls) values (v_user, (now() at time zone 'utc')::date, 1)
    on conflict (user_id, usage_day) do update set calls = public.patient_photo_ai_usage.calls + 1
      where public.patient_photo_ai_usage.calls < 20;
  return found;
end;
$$;
revoke all on function public.consume_patient_photo_ai_call(uuid) from public, anon;
grant execute on function public.consume_patient_photo_ai_call(uuid) to authenticated;

create or replace function public.patient_next_appointment(p_paciente_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not private.is_patient(p_paciente_id) then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;
  select jsonb_build_object('id', a.id, 'inicio', a.inicio, 'fim', a.fim, 'status', a.status,
    'servico', s.nome, 'clinica', c.nome)
    into v_result
    from public.agendamento a
    join public.agenda_servico s on s.id = a.servico_id and s.clinica_id = a.clinica_id
    join public.clinica c on c.id = a.clinica_id
    where a.paciente_id = p_paciente_id and a.inicio >= now()
      and a.status in ('solicitado', 'confirmado')
    order by a.inicio asc limit 1;
  return v_result;
end;
$$;
revoke all on function public.patient_next_appointment(uuid) from public, anon;
grant execute on function public.patient_next_appointment(uuid) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('patient-health-images', 'patient-health-images', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.patient_update_timestamp()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.versao := old.versao + 1;
  return new;
end;
$$;
revoke all on function private.patient_update_timestamp() from public, anon, authenticated;

create or replace function private.patient_records_immutable_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.paciente_id is distinct from old.paciente_id or new.clinica_id is distinct from old.clinica_id
    or new.registrado_por is distinct from old.registrado_por or new.client_entry_id is distinct from old.client_entry_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Identidade do registro não pode ser alterada' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.patient_records_immutable_owner() from public, anon, authenticated;

create or replace function private.patient_photo_sharing_consent()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_purpose text := case when tg_table_name = 'patient_progress_photo' then 'compartilhar_fotos_progresso' else 'compartilhar_fotos_diario' end;
  v_accepted boolean;
begin
  if new.compartilhado_com_profissional then
    select c.aceito into v_accepted from public.patient_consent_event c
      where c.paciente_id = new.paciente_id and c.user_id = v_user and c.finalidade = v_purpose
      order by c.created_at desc limit 1;
    if not coalesce(v_accepted, false) then
      raise exception 'Compartilhamento exige autorização vigente' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.patient_photo_sharing_consent() from public, anon, authenticated;

create trigger patient_diary_updated before update on public.patient_diary_entry
  for each row execute function private.patient_update_timestamp();
create trigger patient_progress_updated before update on public.patient_progress
  for each row execute function private.patient_update_timestamp();
create trigger patient_diary_identity before update on public.patient_diary_entry
  for each row execute function private.patient_records_immutable_owner();
create trigger patient_progress_identity before update on public.patient_progress
  for each row execute function private.patient_records_immutable_owner();
create trigger patient_progress_photo_identity before update on public.patient_progress_photo
  for each row execute function private.patient_records_immutable_owner();
create trigger patient_diary_share_consent before insert or update on public.patient_diary_entry
  for each row execute function private.patient_photo_sharing_consent();
create trigger patient_progress_photo_share_consent before insert or update on public.patient_progress_photo
  for each row execute function private.patient_photo_sharing_consent();

create or replace function public.accept_patient_invite(p_token_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_patient uuid;
  v_invite public.patient_invite%rowtype;
begin
  if v_user is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Convite inválido ou expirado' using errcode = '42501';
  end if;
  select lower(u.email) into v_email from auth.users u
    where u.id = v_user and u.email_confirmed_at is not null;
  if v_email is null then
    raise exception 'Confirme seu e-mail antes de ativar o acesso' using errcode = '42501';
  end if;
  select * into v_invite from public.patient_invite i
    where i.token_hash = p_token_hash and i.email_normalizado = v_email
      and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    for update;
  if not found then
    raise exception 'Convite inválido ou expirado' using errcode = '42501';
  end if;
  if exists (select 1 from public.paciente_acesso a where a.paciente_id = v_invite.paciente_id and a.user_id <> v_user) then
    raise exception 'Este cadastro já está vinculado a outra conta' using errcode = '23505';
  end if;
  insert into public.paciente_acesso(paciente_id, clinica_id, user_id, vinculado_por)
    values (v_invite.paciente_id, v_invite.clinica_id, v_user, v_invite.created_by)
    on conflict (paciente_id, user_id) do nothing;
  update public.patient_invite set accepted_by = v_user, accepted_at = now() where id = v_invite.id;
  return v_invite.paciente_id;
end;
$$;
revoke all on function public.accept_patient_invite(text) from public, anon;
grant execute on function public.accept_patient_invite(text) to authenticated;

alter table public.patient_invite enable row level security;
alter table public.patient_consent_event enable row level security;
alter table public.patient_progress enable row level security;
alter table public.patient_diary_entry enable row level security;
alter table public.patient_progress_photo enable row level security;
alter table public.patient_data_request enable row level security;

revoke select on public.antropometria from authenticated;
grant select (id, clinica_id, paciente_id, medida_em, peso_kg, altura_cm, cintura_cm, gordura_pct, massa_magra_kg, registrado_por, created_at) on public.antropometria to authenticated;
create policy "patient reads own consultation measurements" on public.antropometria
  for select to authenticated using (private.is_patient(paciente_id));

revoke all on public.patient_invite, public.patient_consent_event, public.patient_progress,
  public.patient_diary_entry, public.patient_progress_photo, public.patient_data_request from anon, authenticated;
grant select, insert on public.patient_invite to authenticated;
grant update(revoked_at) on public.patient_invite to authenticated;
grant select, insert on public.patient_consent_event to authenticated;
grant select, insert, update, delete on public.patient_progress, public.patient_diary_entry,
  public.patient_progress_photo to authenticated;
grant select, insert on public.patient_data_request to authenticated;
grant update(status) on public.patient_data_request to authenticated;

create policy "clinical staff reads patient invites" on public.patient_invite
  for select to authenticated using (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinical staff creates patient invites" on public.patient_invite
  for insert to authenticated with check (private.has_role(clinica_id, array['admin', 'profissional']) and created_by = (select auth.uid()));
create policy "clinical staff revokes patient invites" on public.patient_invite
  for update to authenticated using (private.has_role(clinica_id, array['admin', 'profissional']))
  with check (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "patient reads own consent events" on public.patient_consent_event
  for select to authenticated using (user_id = (select auth.uid()) and private.is_patient(paciente_id));
create policy "clinical staff reads consent events" on public.patient_consent_event
  for select to authenticated using (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "patient records own consent events" on public.patient_consent_event
  for insert to authenticated with check (user_id = (select auth.uid()) and private.is_patient(paciente_id));
create policy "patient and clinician read progress" on public.patient_progress
  for select to authenticated using (private.is_patient(paciente_id) or private.has_role(clinica_id, array['admin', 'profissional']));
create policy "patient records own progress" on public.patient_progress
  for insert to authenticated with check (registrado_por = (select auth.uid()) and private.is_patient(paciente_id));
create policy "patient edits own progress" on public.patient_progress
  for update to authenticated using (registrado_por = (select auth.uid()) and private.is_patient(paciente_id))
  with check (registrado_por = (select auth.uid()) and private.is_patient(paciente_id));
create policy "patient deletes own progress" on public.patient_progress
  for delete to authenticated using (registrado_por = (select auth.uid()) and private.is_patient(paciente_id));
create policy "patient and clinician read diary" on public.patient_diary_entry
  for select to authenticated using (private.is_patient(paciente_id) or private.has_role(clinica_id, array['admin', 'profissional']));
create policy "patient records own diary" on public.patient_diary_entry
  for insert to authenticated with check (registrado_por = (select auth.uid()) and private.is_patient(paciente_id));
create policy "patient edits own diary" on public.patient_diary_entry
  for update to authenticated using (registrado_por = (select auth.uid()) and private.is_patient(paciente_id))
  with check (registrado_por = (select auth.uid()) and private.is_patient(paciente_id));
create policy "patient deletes own diary" on public.patient_diary_entry
  for delete to authenticated using (registrado_por = (select auth.uid()) and private.is_patient(paciente_id));
create policy "patient and authorized clinician read progress photos" on public.patient_progress_photo
  for select to authenticated using (private.is_patient(paciente_id) or
    (compartilhado_com_profissional and private.has_role(clinica_id, array['admin', 'profissional']) and
      coalesce((select c.aceito from public.patient_consent_event c where c.paciente_id = patient_progress_photo.paciente_id
        and c.finalidade = 'compartilhar_fotos_progresso' order by c.created_at desc limit 1), false)));
create policy "patient manages own progress photos" on public.patient_progress_photo
  for all to authenticated using (registrado_por = (select auth.uid()) and private.is_patient(paciente_id))
  with check (registrado_por = (select auth.uid()) and private.is_patient(paciente_id));
create policy "patient and clinician read data requests" on public.patient_data_request
  for select to authenticated using (user_id = (select auth.uid()) or private.has_role(clinica_id, array['admin', 'profissional']));
create policy "patient creates own data requests" on public.patient_data_request
  for insert to authenticated with check (user_id = (select auth.uid()) and private.is_patient(paciente_id));
create policy "clinical staff updates patient data requests" on public.patient_data_request
  for update to authenticated using (private.has_role(clinica_id, array['admin', 'profissional']))
  with check (private.has_role(clinica_id, array['admin', 'profissional']));

create policy "patient image access" on storage.objects for select to authenticated
  using (bucket_id = 'patient-health-images' and exists (
    select 1 from public.patient_diary_entry d where d.foto_path = name and private.is_patient(d.paciente_id)
    union all
    select 1 from public.patient_progress_photo p where p.foto_path = name and private.is_patient(p.paciente_id)
    union all
    select 1 from public.patient_diary_entry d where d.foto_path = name and d.compartilhado_com_profissional
      and private.has_role(d.clinica_id, array['admin', 'profissional'])
      and coalesce((select c.aceito from public.patient_consent_event c where c.paciente_id = d.paciente_id and c.finalidade = 'compartilhar_fotos_diario' order by c.created_at desc limit 1), false)
    union all
    select 1 from public.patient_progress_photo p where p.foto_path = name and p.compartilhado_com_profissional
      and private.has_role(p.clinica_id, array['admin', 'profissional'])
      and coalesce((select c.aceito from public.patient_consent_event c where c.paciente_id = p.paciente_id and c.finalidade = 'compartilhar_fotos_progresso' order by c.created_at desc limit 1), false)
  ));
create policy "patient uploads own image" on storage.objects for insert to authenticated
  with check (bucket_id = 'patient-health-images' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
    and (storage.foldername(name))[3] = (select auth.uid())::text
    and private.is_patient(((storage.foldername(name))[2])::uuid));
create policy "patient deletes own image" on storage.objects for delete to authenticated
  using (bucket_id = 'patient-health-images' and (storage.foldername(name))[3] = (select auth.uid())::text
    and private.is_patient(((storage.foldername(name))[2])::uuid));
