create function private.authorize_booking_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.origem = 'interno' and (
    new.created_by is distinct from auth.uid()
    or not private.has_role(new.clinica_id, array['admin', 'profissional', 'recepcao'])
  ) then
    raise exception 'Agendamento não autorizado' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.authorize_booking_insert() from public, anon, authenticated;
create trigger agendamento_autorizacao before insert on public.agendamento
  for each row execute function private.authorize_booking_insert();

create function private.validate_agenda_service_professional()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.perfil p where p.user_id = new.profissional_id
    and p.clinica_id = new.clinica_id and p.papel in ('admin', 'profissional')) then
    raise exception 'Responsável pelo serviço precisa ser profissional' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and new.profissional_id is distinct from old.profissional_id
    and exists (select 1 from public.agendamento a where a.servico_id = old.id and a.status <> 'cancelado') then
    raise exception 'Serviço com agendamentos não pode mudar de profissional' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_agenda_service_professional() from public, anon, authenticated;
create trigger agenda_servico_profissional before insert or update on public.agenda_servico
  for each row execute function private.validate_agenda_service_professional();

create function private.validate_agenda_block()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.ativo and exists (
    select 1 from public.agendamento a
    where a.clinica_id = new.clinica_id and a.profissional_id = new.profissional_id
      and a.status <> 'cancelado' and a.inicio >= now()
      and tstzrange(a.inicio, a.ocupado_ate, '[)') && tstzrange(new.inicio, new.fim, '[)')
  ) then
    raise exception 'Cancele ou remarque as consultas antes de bloquear o horário' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_agenda_block() from public, anon, authenticated;
create trigger agenda_bloqueio_conflito before insert or update on public.agenda_bloqueio
  for each row execute function private.validate_agenda_block();

create function private.validate_availability_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.ativo and (not new.ativo or new.inicio_hora <> old.inicio_hora or
    new.fim_hora <> old.fim_hora or new.dia_semana <> old.dia_semana) and exists (
    select 1 from public.agendamento a join public.agenda_config cfg on cfg.clinica_id = a.clinica_id
    where a.clinica_id = old.clinica_id and a.profissional_id = old.profissional_id
      and a.status <> 'cancelado' and a.inicio >= now()
      and extract(isodow from (a.inicio at time zone cfg.timezone)::date)::integer = old.dia_semana
      and (a.inicio at time zone cfg.timezone)::time >= old.inicio_hora
      and (a.ocupado_ate at time zone cfg.timezone)::time <= old.fim_hora
  ) then
    raise exception 'Remarque consultas futuras antes de alterar a disponibilidade' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_availability_change() from public, anon, authenticated;
create trigger agenda_disponibilidade_protecao before update on public.agenda_disponibilidade
  for each row execute function private.validate_availability_change();

create function private.confirm_booking(p_booking uuid, p_patient uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  a public.agendamento%rowtype;
  linked_patient uuid;
begin
  select * into a from public.agendamento where id = p_booking for update;
  if a.id is null or not private.has_role(a.clinica_id, array['admin', 'profissional', 'recepcao']) then
    raise exception 'Agendamento não encontrado' using errcode = '42501';
  end if;
  if a.status = 'confirmado' then return a.id; end if;
  if a.status <> 'solicitado' then
    raise exception 'Agendamento não pode ser confirmado' using errcode = '22023';
  end if;
  if p_patient is not null then
    select id into linked_patient from public.paciente
      where id = p_patient and clinica_id = a.clinica_id and status = 'ativo';
    if linked_patient is null then raise exception 'Paciente inválido' using errcode = '22023'; end if;
  elsif a.paciente_id is not null then
    linked_patient := a.paciente_id;
  else
    insert into public.paciente(clinica_id, nome, email, telefone, cadastrado_por)
    values (a.clinica_id, a.nome_contato, a.email_contato, a.telefone_contato, auth.uid())
    returning id into linked_patient;
  end if;
  update public.agendamento set paciente_id = linked_patient, status = 'confirmado' where id = a.id;
  return a.id;
end;
$$;
revoke all on function private.confirm_booking(uuid, uuid) from public, anon;
grant execute on function private.confirm_booking(uuid, uuid) to authenticated;
create function public.confirmar_agendamento(p_booking uuid, p_patient uuid default null)
returns uuid language sql set search_path = '' as $$
  select private.confirm_booking(p_booking, p_patient)
$$;
revoke all on function public.confirmar_agendamento(uuid, uuid) from public, anon;
grant execute on function public.confirmar_agendamento(uuid, uuid) to authenticated;
alter table public.agendamento alter column ocupado_ate set default now();
