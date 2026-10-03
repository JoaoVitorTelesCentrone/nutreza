create extension if not exists btree_gist with schema extensions;
alter table public.perfil add constraint perfil_usuario_clinica_unique unique (user_id, clinica_id);

create table public.agenda_config (
  clinica_id uuid primary key references public.clinica(id),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,47}$'),
  timezone text not null default 'America/Sao_Paulo',
  antecedencia_horas integer not null default 12 check (antecedencia_horas between 0 and 168),
  horizonte_dias integer not null default 60 check (horizonte_dias between 1 and 180),
  cancelamento_horas integer not null default 12 check (cancelamento_horas between 0 and 168),
  ativa boolean not null default true,
  updated_at timestamptz not null default now()
);

create function private.validate_agenda_timezone()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Fuso horário inválido' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.validate_agenda_timezone() from public, anon, authenticated;
create trigger agenda_config_timezone before insert or update on public.agenda_config
  for each row execute function private.validate_agenda_timezone();

create table public.agenda_servico (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id),
  profissional_id uuid not null,
  nome text not null check (char_length(btrim(nome)) between 3 and 100),
  tipo text not null check (tipo in ('presencial', 'online', 'retorno')),
  duracao_minutos integer not null default 50 check (duracao_minutos between 15 and 180 and duracao_minutos % 5 = 0),
  intervalo_minutos integer not null default 10 check (intervalo_minutos between 0 and 60),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, clinica_id),
  foreign key (profissional_id, clinica_id) references public.perfil(user_id, clinica_id)
);
create index agenda_servico_clinica_idx on public.agenda_servico(clinica_id, ativo);

create table public.agenda_disponibilidade (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id),
  profissional_id uuid not null,
  dia_semana integer not null check (dia_semana between 1 and 7),
  inicio_hora time not null,
  fim_hora time not null,
  ativo boolean not null default true,
  check (inicio_hora < fim_hora),
  foreign key (profissional_id, clinica_id) references public.perfil(user_id, clinica_id),
  exclude using gist (
    profissional_id with =,
    dia_semana with =,
    tsrange(date '2000-01-01' + inicio_hora, date '2000-01-01' + fim_hora, '[)') with &&
  ) where (ativo)
);
create index agenda_disponibilidade_clinica_idx on public.agenda_disponibilidade(clinica_id, profissional_id);

create table public.agenda_bloqueio (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id),
  profissional_id uuid not null,
  inicio timestamptz not null,
  fim timestamptz not null,
  motivo text check (char_length(motivo) <= 200),
  ativo boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (inicio < fim),
  foreign key (profissional_id, clinica_id) references public.perfil(user_id, clinica_id)
);
create index agenda_bloqueio_intervalo_idx on public.agenda_bloqueio using gist (profissional_id, tstzrange(inicio, fim, '[)'));

create table public.agendamento (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id),
  servico_id uuid not null,
  profissional_id uuid not null,
  paciente_id uuid,
  nome_contato text not null check (char_length(btrim(nome_contato)) between 2 and 160),
  email_contato text check (char_length(email_contato) <= 180),
  telefone_contato text check (char_length(telefone_contato) <= 30),
  inicio timestamptz not null,
  fim timestamptz not null,
  ocupado_ate timestamptz not null,
  intervalo_minutos integer not null check (intervalo_minutos between 0 and 60),
  status text not null check (status in ('solicitado', 'confirmado', 'em_atendimento', 'realizado', 'falta', 'cancelado')),
  origem text not null check (origem in ('publico', 'interno')),
  lembretes_email boolean not null default false,
  token_hash text unique,
  observacao text check (char_length(observacao) <= 2000),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (inicio < fim),
  check ((origem = 'publico' and created_by is null and token_hash is not null)
    or (origem = 'interno' and created_by is not null)),
  foreign key (servico_id, clinica_id) references public.agenda_servico(id, clinica_id),
  foreign key (profissional_id, clinica_id) references public.perfil(user_id, clinica_id),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id),
  exclude using gist (
    profissional_id with =,
    tstzrange(inicio, ocupado_ate, '[)') with &&
  ) where (status <> 'cancelado')
);
create index agendamento_clinica_inicio_idx on public.agendamento(clinica_id, inicio);
create index agendamento_paciente_idx on public.agendamento(paciente_id, inicio desc);

create table public.agenda_notificacao (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references public.agendamento(id),
  clinica_id uuid not null references public.clinica(id),
  tipo text not null check (tipo in ('solicitacao', 'confirmacao', 'remarcacao', 'cancelamento', 'lembrete_24h', 'lembrete_1h')),
  destinatario_email text not null,
  agendada_em timestamptz not null,
  status text not null default 'pendente' check (status in ('pendente', 'processando', 'enviada', 'cancelada', 'erro')),
  tentativas integer not null default 0,
  proxima_tentativa_em timestamptz not null default now(),
  bloqueada_em timestamptz,
  enviada_em timestamptz,
  erro_resumo text,
  created_at timestamptz not null default now(),
  unique (agendamento_id, tipo, agendada_em)
);
create index agenda_notificacao_pendentes_idx on public.agenda_notificacao(agendada_em, proxima_tentativa_em)
  where status = 'pendente';

create function private.validate_agendamento()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  s public.agenda_servico%rowtype;
  cfg public.agenda_config%rowtype;
  local_day date;
  local_start time;
  local_end time;
begin
  if tg_op = 'UPDATE' then
    if new.clinica_id <> old.clinica_id or new.servico_id <> old.servico_id
       or new.profissional_id <> old.profissional_id or new.origem <> old.origem
       or new.created_by is distinct from old.created_by or new.token_hash is distinct from old.token_hash then
      raise exception 'Dados fixos do agendamento não podem mudar' using errcode = '22023';
    end if;
    if new.status is distinct from old.status then
      if not ((old.status = 'solicitado' and new.status in ('confirmado', 'cancelado'))
        or (old.status = 'confirmado' and new.status in ('solicitado', 'em_atendimento', 'realizado', 'falta', 'cancelado'))
        or (old.status = 'em_atendimento' and new.status in ('realizado', 'falta', 'cancelado'))) then
        raise exception 'Transição de status inválida' using errcode = '22023';
      end if;
    end if;
    if old.status in ('realizado', 'falta', 'cancelado') and
       (new.inicio is distinct from old.inicio or new.fim is distinct from old.fim) then
      raise exception 'Agendamento encerrado não pode ser remarcado' using errcode = '22023';
    end if;
  end if;
  if new.status <> 'cancelado' and (tg_op = 'INSERT' or new.inicio is distinct from old.inicio or new.fim is distinct from old.fim) then
    select * into s from public.agenda_servico where id = new.servico_id and clinica_id = new.clinica_id;
    select * into cfg from public.agenda_config where clinica_id = new.clinica_id;
    if not found or s.id is null or not s.ativo or s.profissional_id <> new.profissional_id or not cfg.ativa then
      raise exception 'Serviço ou agenda indisponível' using errcode = '22023';
    end if;
    if new.fim <> new.inicio + make_interval(mins => s.duracao_minutos)
       or new.intervalo_minutos <> s.intervalo_minutos then
      raise exception 'Duração ou intervalo inválido' using errcode = '22023';
    end if;
    local_day := (new.inicio at time zone cfg.timezone)::date;
    local_start := (new.inicio at time zone cfg.timezone)::time;
    local_end := ((new.fim + make_interval(mins => new.intervalo_minutos)) at time zone cfg.timezone)::time;
    if local_end <= local_start then
      raise exception 'Consulta atravessa o fim do dia' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.agenda_disponibilidade d
      where d.clinica_id = new.clinica_id and d.profissional_id = new.profissional_id
        and d.ativo and d.dia_semana = extract(isodow from local_day)::integer
        and d.inicio_hora <= local_start and d.fim_hora >= local_end
    ) then
      raise exception 'Fora da disponibilidade' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.agenda_bloqueio b
      where b.clinica_id = new.clinica_id and b.profissional_id = new.profissional_id and b.ativo
        and tstzrange(b.inicio, b.fim, '[)') &&
            tstzrange(new.inicio, new.fim + make_interval(mins => new.intervalo_minutos), '[)')
    ) then
      raise exception 'Horário bloqueado' using errcode = '22023';
    end if;
  end if;
  new.ocupado_ate := new.fim + make_interval(mins => new.intervalo_minutos);
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.validate_agendamento() from public, anon, authenticated;
create trigger agendamento_validacao before insert or update on public.agendamento
  for each row execute function private.validate_agendamento();

create function private.queue_agenda_notifications()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  recipient text;
begin
  if tg_op = 'UPDATE' then
    if new.inicio is distinct from old.inicio or new.status in ('cancelado', 'realizado', 'falta', 'em_atendimento') then
      update public.agenda_notificacao set status = 'cancelada'
      where agendamento_id = new.id and status = 'pendente';
    end if;
  end if;
  if not new.lembretes_email then return new; end if;
  recipient := coalesce(new.email_contato, (select p.email from public.paciente p where p.id = new.paciente_id));
  if recipient is null or recipient = '' then return new; end if;
  if tg_op = 'INSERT' and new.origem = 'publico' then
    insert into public.agenda_notificacao(agendamento_id, clinica_id, tipo, destinatario_email, agendada_em)
    values (new.id, new.clinica_id, 'solicitacao', recipient, now());
  elsif tg_op = 'UPDATE' and new.status = 'cancelado' and old.status <> 'cancelado' then
    insert into public.agenda_notificacao(agendamento_id, clinica_id, tipo, destinatario_email, agendada_em)
    values (new.id, new.clinica_id, 'cancelamento', recipient, now());
  elsif tg_op = 'UPDATE' and new.inicio is distinct from old.inicio then
    insert into public.agenda_notificacao(agendamento_id, clinica_id, tipo, destinatario_email, agendada_em)
    values (new.id, new.clinica_id, 'remarcacao', recipient, now());
  elsif tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.status = 'confirmado' and old.status <> 'confirmado') then
    insert into public.agenda_notificacao(agendamento_id, clinica_id, tipo, destinatario_email, agendada_em)
    values (new.id, new.clinica_id, 'confirmacao', recipient, now());
  end if;
  if new.status = 'confirmado' and (tg_op = 'INSERT' or new.inicio is distinct from old.inicio or old.status <> 'confirmado') then
    if new.inicio - interval '24 hours' > now() then
      insert into public.agenda_notificacao(agendamento_id, clinica_id, tipo, destinatario_email, agendada_em)
      values (new.id, new.clinica_id, 'lembrete_24h', recipient, new.inicio - interval '24 hours');
    end if;
    if new.inicio - interval '1 hour' > now() then
      insert into public.agenda_notificacao(agendamento_id, clinica_id, tipo, destinatario_email, agendada_em)
      values (new.id, new.clinica_id, 'lembrete_1h', recipient, new.inicio - interval '1 hour');
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.queue_agenda_notifications() from public, anon, authenticated;
create trigger agendamento_notificacoes after insert or update of inicio, status on public.agendamento
  for each row execute function private.queue_agenda_notifications();

create trigger agendamento_audit after insert or update on public.agendamento
  for each row execute function private.audit_clinical_change();

alter table public.agenda_config enable row level security;
alter table public.agenda_servico enable row level security;
alter table public.agenda_disponibilidade enable row level security;
alter table public.agenda_bloqueio enable row level security;
alter table public.agendamento enable row level security;
alter table public.agenda_notificacao enable row level security;
revoke all on public.agenda_config, public.agenda_servico, public.agenda_disponibilidade,
  public.agenda_bloqueio, public.agendamento, public.agenda_notificacao from anon, authenticated;
grant select, insert, update on public.agenda_config, public.agenda_servico,
  public.agenda_disponibilidade, public.agenda_bloqueio, public.agendamento to authenticated;
grant select, update on public.agenda_notificacao to service_role;

create policy "staff reads agenda config" on public.agenda_config for select to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional', 'recepcao']));
create policy "admin creates agenda config" on public.agenda_config for insert to authenticated
  with check (private.has_role(clinica_id, array['admin']));
create policy "admin updates agenda config" on public.agenda_config for update to authenticated
  using (private.has_role(clinica_id, array['admin']))
  with check (private.has_role(clinica_id, array['admin']));

create policy "staff reads services" on public.agenda_servico for select to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional', 'recepcao']));
create policy "admin creates service" on public.agenda_servico for insert to authenticated
  with check (private.has_role(clinica_id, array['admin']));
create policy "admin updates service" on public.agenda_servico for update to authenticated
  using (private.has_role(clinica_id, array['admin']))
  with check (private.has_role(clinica_id, array['admin']));

create policy "staff reads availability" on public.agenda_disponibilidade for select to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional', 'recepcao']));
create policy "clinician creates own availability" on public.agenda_disponibilidade for insert to authenticated
  with check (private.has_role(clinica_id, array['admin']) or
    (profissional_id = (select auth.uid()) and private.has_role(clinica_id, array['profissional'])));
create policy "clinician updates own availability" on public.agenda_disponibilidade for update to authenticated
  using (private.has_role(clinica_id, array['admin']) or
    (profissional_id = (select auth.uid()) and private.has_role(clinica_id, array['profissional'])))
  with check (private.has_role(clinica_id, array['admin']) or
    (profissional_id = (select auth.uid()) and private.has_role(clinica_id, array['profissional'])));

create policy "staff reads blocks" on public.agenda_bloqueio for select to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional', 'recepcao']));
create policy "staff creates blocks" on public.agenda_bloqueio for insert to authenticated
  with check (created_by = (select auth.uid()) and
    private.has_role(clinica_id, array['admin', 'profissional', 'recepcao']));
create policy "staff updates blocks" on public.agenda_bloqueio for update to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional', 'recepcao']))
  with check (private.has_role(clinica_id, array['admin', 'profissional', 'recepcao']));

create policy "staff reads bookings" on public.agendamento for select to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional', 'recepcao']));
create policy "staff creates booking" on public.agendamento for insert to authenticated
  with check (origem = 'interno' and created_by = (select auth.uid()) and
    private.has_role(clinica_id, array['admin', 'profissional', 'recepcao']));
create policy "staff updates booking" on public.agendamento for update to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional', 'recepcao']))
  with check (private.has_role(clinica_id, array['admin', 'profissional', 'recepcao']));

-- Public API wrappers are invoker functions. The privileged implementations stay
-- in the unexposed private schema and expose only the minimal booking data.
grant usage on schema private to anon;

create function private.public_agenda_info(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'clinica', c.nome,
    'timezone', cfg.timezone,
    'servicos', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome,
        'tipo', s.tipo, 'duracao_minutos', s.duracao_minutos) order by s.nome)
      from public.agenda_servico s
      where s.clinica_id = cfg.clinica_id and s.ativo
        and exists (select 1 from public.perfil p where p.user_id = s.profissional_id
          and p.clinica_id = s.clinica_id and p.papel in ('admin', 'profissional'))
    ), '[]'::jsonb)
  ) from public.agenda_config cfg join public.clinica c on c.id = cfg.clinica_id
  where cfg.slug = p_slug and cfg.ativa;
$$;
revoke all on function private.public_agenda_info(text) from public;
grant execute on function private.public_agenda_info(text) to anon, authenticated;
create function public.agenda_info(p_slug text) returns jsonb language sql stable
set search_path = '' as $$ select private.public_agenda_info(p_slug) $$;
revoke all on function public.agenda_info(text) from public;
grant execute on function public.agenda_info(text) to anon, authenticated;

create function private.public_horarios(p_slug text, p_servico uuid, p_dia date)
returns table(inicio timestamptz, fim timestamptz)
language sql stable security definer set search_path = '' as $$
  select slot.inicio, slot.inicio + make_interval(mins => s.duracao_minutos)
  from public.agenda_config cfg
  join public.agenda_servico s on s.clinica_id = cfg.clinica_id and s.id = p_servico and s.ativo
  join public.agenda_disponibilidade d on d.clinica_id = cfg.clinica_id
    and d.profissional_id = s.profissional_id and d.ativo
    and d.dia_semana = extract(isodow from p_dia)::integer
  cross join lateral generate_series(
    (p_dia + d.inicio_hora) at time zone cfg.timezone,
    ((p_dia + d.fim_hora) at time zone cfg.timezone) - make_interval(mins => s.duracao_minutos + s.intervalo_minutos),
    interval '15 minutes'
  ) as slot(inicio)
  where cfg.slug = p_slug and cfg.ativa
    and p_dia between (now() at time zone cfg.timezone)::date
      and (now() at time zone cfg.timezone)::date + cfg.horizonte_dias
    and slot.inicio >= now() + make_interval(hours => cfg.antecedencia_horas)
    and not exists (select 1 from public.agenda_bloqueio b
      where b.profissional_id = s.profissional_id and b.clinica_id = s.clinica_id and b.ativo
        and tstzrange(b.inicio, b.fim, '[)') &&
          tstzrange(slot.inicio, slot.inicio + make_interval(mins => s.duracao_minutos + s.intervalo_minutos), '[)'))
    and not exists (select 1 from public.agendamento a
      where a.profissional_id = s.profissional_id and a.clinica_id = s.clinica_id
        and a.status <> 'cancelado'
        and tstzrange(a.inicio, a.fim + make_interval(mins => a.intervalo_minutos), '[)') &&
          tstzrange(slot.inicio, slot.inicio + make_interval(mins => s.duracao_minutos + s.intervalo_minutos), '[)'))
  order by slot.inicio;
$$;
revoke all on function private.public_horarios(text, uuid, date) from public;
grant execute on function private.public_horarios(text, uuid, date) to anon, authenticated;
create function public.agenda_horarios(p_slug text, p_servico uuid, p_dia date)
returns table(inicio timestamptz, fim timestamptz) language sql stable
set search_path = '' as $$ select * from private.public_horarios(p_slug, p_servico, p_dia) $$;
revoke all on function public.agenda_horarios(text, uuid, date) from public;
grant execute on function public.agenda_horarios(text, uuid, date) to anon, authenticated;

create function private.book_public(p_slug text, p_servico uuid, p_inicio timestamptz,
  p_nome text, p_email text, p_telefone text, p_lembretes boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  slot record;
  cfg public.agenda_config%rowtype;
  s public.agenda_servico%rowtype;
  secret text := gen_random_uuid()::text || gen_random_uuid()::text;
  booking_id uuid;
begin
  if char_length(btrim(p_nome)) not between 2 and 160
     or char_length(p_email) not between 5 and 180
     or p_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or char_length(regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g')) not between 10 and 13 then
    raise exception 'Dados de contato inválidos' using errcode = '22023';
  end if;
  select * into cfg from public.agenda_config where slug = p_slug and ativa;
  select * into s from public.agenda_servico where id = p_servico and clinica_id = cfg.clinica_id and ativo;
  if s.id is null then raise exception 'Serviço indisponível' using errcode = '22023'; end if;
  if (select count(*) from public.agendamento a where a.clinica_id = cfg.clinica_id
      and lower(a.email_contato) = lower(p_email) and a.inicio > now()
      and a.status in ('solicitado', 'confirmado')) >= 2 then
    raise exception 'Limite de reservas futuras atingido' using errcode = '22023';
  end if;
  select * into slot from private.public_horarios(p_slug, p_servico,
    (p_inicio at time zone cfg.timezone)::date) h where h.inicio = p_inicio;
  if slot.inicio is null then raise exception 'Horário indisponível' using errcode = '22023'; end if;
  insert into public.agendamento(clinica_id, servico_id, profissional_id, nome_contato,
    email_contato, telefone_contato, inicio, fim, intervalo_minutos, status, origem,
    lembretes_email, token_hash)
  values (cfg.clinica_id, s.id, s.profissional_id, btrim(p_nome), lower(btrim(p_email)),
    btrim(p_telefone), slot.inicio, slot.fim, s.intervalo_minutos, 'solicitado', 'publico',
    coalesce(p_lembretes, false), encode(extensions.digest(secret, 'sha256'), 'hex'))
  returning id into booking_id;
  return jsonb_build_object('id', booking_id, 'token', secret);
end;
$$;
revoke all on function private.book_public(text, uuid, timestamptz, text, text, text, boolean) from public;
grant execute on function private.book_public(text, uuid, timestamptz, text, text, text, boolean) to anon, authenticated;
create function public.agendar_publico(p_slug text, p_servico uuid, p_inicio timestamptz,
  p_nome text, p_email text, p_telefone text, p_lembretes boolean)
returns jsonb language sql set search_path = '' as $$
  select private.book_public(p_slug, p_servico, p_inicio, p_nome, p_email, p_telefone, p_lembretes)
$$;
revoke all on function public.agendar_publico(text, uuid, timestamptz, text, text, text, boolean) from public;
grant execute on function public.agendar_publico(text, uuid, timestamptz, text, text, text, boolean) to anon, authenticated;

create function private.public_booking_by_token(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', a.id, 'nome', a.nome_contato, 'inicio', a.inicio,
    'fim', a.fim, 'status', a.status, 'servico', s.nome, 'clinica', c.nome,
    'slug', cfg.slug, 'timezone', cfg.timezone,
    'cancelamento_horas', cfg.cancelamento_horas)
  from public.agendamento a join public.agenda_servico s on s.id = a.servico_id
    join public.clinica c on c.id = a.clinica_id
    join public.agenda_config cfg on cfg.clinica_id = a.clinica_id
  where char_length(p_token) = 72 and a.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;
revoke all on function private.public_booking_by_token(text) from public;
grant execute on function private.public_booking_by_token(text) to anon, authenticated;
create function public.agendamento_publico(p_token text) returns jsonb language sql stable
set search_path = '' as $$ select private.public_booking_by_token(p_token) $$;
revoke all on function public.agendamento_publico(text) from public;
grant execute on function public.agendamento_publico(text) to anon, authenticated;

create function private.change_public_booking(p_token text, p_action text, p_inicio timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.agendamento%rowtype;
  cfg public.agenda_config%rowtype;
  slot record;
begin
  if char_length(p_token) <> 72 then raise exception 'Reserva não encontrada' using errcode = '22023'; end if;
  select * into a from public.agendamento
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if a.id is null then raise exception 'Reserva não encontrada' using errcode = '22023'; end if;
  select * into cfg from public.agenda_config where clinica_id = a.clinica_id;
  if p_action = 'cancelar' then
    if a.status = 'cancelado' then return private.public_booking_by_token(p_token); end if;
    if a.status not in ('solicitado', 'confirmado') or
       a.inicio < now() + make_interval(hours => cfg.cancelamento_horas) then
      raise exception 'Cancelamento fora do prazo' using errcode = '22023';
    end if;
    update public.agendamento set status = 'cancelado' where id = a.id;
  elsif p_action = 'remarcar' then
    if a.status not in ('solicitado', 'confirmado') or
       a.inicio < now() + make_interval(hours => cfg.cancelamento_horas) then
      raise exception 'Remarcação fora do prazo' using errcode = '22023';
    end if;
    if p_inicio = a.inicio then return private.public_booking_by_token(p_token); end if;
    select * into slot from private.public_horarios(cfg.slug, a.servico_id,
      (p_inicio at time zone cfg.timezone)::date) h where h.inicio = p_inicio;
    if slot.inicio is null then raise exception 'Horário indisponível' using errcode = '22023'; end if;
    update public.agendamento set inicio = slot.inicio, fim = slot.fim, status = 'solicitado'
      where id = a.id;
  else
    raise exception 'Ação inválida' using errcode = '22023';
  end if;
  return private.public_booking_by_token(p_token);
end;
$$;
revoke all on function private.change_public_booking(text, text, timestamptz) from public;
grant execute on function private.change_public_booking(text, text, timestamptz) to anon, authenticated;
create function public.alterar_agendamento_publico(p_token text, p_action text, p_inicio timestamptz default null)
returns jsonb language sql set search_path = '' as $$
  select private.change_public_booking(p_token, p_action, p_inicio)
$$;
revoke all on function public.alterar_agendamento_publico(text, text, timestamptz) from public;
grant execute on function public.alterar_agendamento_publico(text, text, timestamptz) to anon, authenticated;

create function public.claim_agenda_notifications(p_limit integer default 20)
returns setof public.agenda_notificacao language sql security definer set search_path = '' as $$
  update public.agenda_notificacao n set status = 'processando',
    bloqueada_em = now(), tentativas = tentativas + 1
  where n.id in (
    select id from public.agenda_notificacao
    where ((status = 'pendente' and agendada_em <= now() and proxima_tentativa_em <= now())
      or (status = 'processando' and bloqueada_em < now() - interval '10 minutes'))
    order by agendada_em for update skip locked limit least(greatest(p_limit, 1), 100)
  ) returning n.*;
$$;
revoke all on function public.claim_agenda_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_agenda_notifications(integer) to service_role;
