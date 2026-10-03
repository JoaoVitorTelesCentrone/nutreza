-- Pausing public booking must not disable the clinic's internal calendar.
create or replace function private.validate_agendamento()
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
  if new.status = 'falta' and new.inicio > now() then
    raise exception 'Falta só pode ser registrada após o início da consulta' using errcode = '22023';
  end if;
  if new.status <> 'cancelado' and (tg_op = 'INSERT' or new.inicio is distinct from old.inicio or new.fim is distinct from old.fim) then
    select * into s from public.agenda_servico where id = new.servico_id and clinica_id = new.clinica_id;
    select * into cfg from public.agenda_config where clinica_id = new.clinica_id;
    if s.id is null or cfg.clinica_id is null or s.profissional_id <> new.profissional_id
       or (new.origem = 'publico' and (not s.ativo or not cfg.ativa)) then
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

create or replace function private.validate_agenda_service_professional()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.perfil p where p.user_id = new.profissional_id
    and p.clinica_id = new.clinica_id and p.papel in ('admin', 'profissional')) then
    raise exception 'Responsável pelo serviço precisa ser profissional' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and (new.profissional_id is distinct from old.profissional_id
      or new.duracao_minutos is distinct from old.duracao_minutos
      or new.intervalo_minutos is distinct from old.intervalo_minutos)
    and exists (select 1 from public.agendamento a where a.servico_id = old.id and a.status <> 'cancelado') then
    raise exception 'Serviço com agendamentos não pode mudar de profissional, duração ou intervalo' using errcode = '22023';
  end if;
  return new;
end;
$$;

create function private.audit_agenda_setting()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  changed_fields text[];
begin
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(k), '{}') into changed_fields
      from jsonb_object_keys(to_jsonb(new)) as k
      where to_jsonb(new)->k is distinct from to_jsonb(old)->k;
    if cardinality(changed_fields) = 0 then return new; end if;
  else
    select coalesce(array_agg(k), '{}') into changed_fields
      from jsonb_object_keys(to_jsonb(new)) as k;
  end if;
  insert into public.audit_log
    (clinica_id, ator_id, acao, entidade, entidade_id, campos_alterados)
  values
    (new.clinica_id, auth.uid(), lower(tg_op), tg_table_name,
     coalesce((to_jsonb(new)->>'id')::uuid, new.clinica_id), changed_fields);
  return new;
end;
$$;
revoke all on function private.audit_agenda_setting() from public, anon, authenticated;
create trigger agenda_config_audit after insert or update on public.agenda_config
  for each row execute function private.audit_agenda_setting();
create trigger agenda_servico_audit after insert or update on public.agenda_servico
  for each row execute function private.audit_agenda_setting();
create trigger agenda_disponibilidade_audit after insert or update on public.agenda_disponibilidade
  for each row execute function private.audit_agenda_setting();
create trigger agenda_bloqueio_audit after insert or update on public.agenda_bloqueio
  for each row execute function private.audit_agenda_setting();

-- Staff-only slot listing, independent from the public link and service switches.
create function public.agenda_horarios_internos(p_servico uuid, p_dia date)
returns table(inicio timestamptz, fim timestamptz)
language sql stable security definer set search_path = '' as $$
  select slot.inicio, slot.inicio + make_interval(mins => s.duracao_minutos)
  from public.agenda_servico s
  join public.agenda_config cfg on cfg.clinica_id = s.clinica_id
  join public.agenda_disponibilidade d on d.clinica_id = s.clinica_id
    and d.profissional_id = s.profissional_id and d.ativo
    and d.dia_semana = extract(isodow from p_dia)::integer
  cross join lateral generate_series(
    (p_dia + d.inicio_hora) at time zone cfg.timezone,
    ((p_dia + d.fim_hora) at time zone cfg.timezone) - make_interval(mins => s.duracao_minutos + s.intervalo_minutos),
    interval '15 minutes'
  ) as slot(inicio)
  where s.id = p_servico
    and private.has_role(s.clinica_id, array['admin', 'profissional', 'recepcao'])
    and p_dia >= (now() at time zone cfg.timezone)::date
    and slot.inicio > now()
    and not exists (select 1 from public.agenda_bloqueio b
      where b.profissional_id = s.profissional_id and b.clinica_id = s.clinica_id and b.ativo
        and tstzrange(b.inicio, b.fim, '[)') &&
          tstzrange(slot.inicio, slot.inicio + make_interval(mins => s.duracao_minutos + s.intervalo_minutos), '[)'))
    and not exists (select 1 from public.agendamento a
      where a.profissional_id = s.profissional_id and a.clinica_id = s.clinica_id
        and a.status <> 'cancelado'
        and tstzrange(a.inicio, a.ocupado_ate, '[)') &&
          tstzrange(slot.inicio, slot.inicio + make_interval(mins => s.duracao_minutos + s.intervalo_minutos), '[)'))
  order by slot.inicio;
$$;
revoke all on function public.agenda_horarios_internos(uuid, date) from public, anon;
grant execute on function public.agenda_horarios_internos(uuid, date) to authenticated;
