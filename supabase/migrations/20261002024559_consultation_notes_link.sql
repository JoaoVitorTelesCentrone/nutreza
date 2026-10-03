alter table public.evolucao add column agendamento_id uuid references public.agendamento(id);
create unique index evolucao_agendamento_versao_idx on public.evolucao(agendamento_id, versao)
  where agendamento_id is not null;

create function private.validate_evolution_booking()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  booking public.agendamento%rowtype;
begin
  if new.agendamento_id is null then return new; end if;
  select * into booking from public.agendamento where id = new.agendamento_id;
  if booking.id is null or booking.clinica_id <> new.clinica_id
     or booking.paciente_id is distinct from new.paciente_id
     or booking.status in ('solicitado', 'cancelado', 'falta') then
    raise exception 'Consulta inválida para evolução clínica' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_evolution_booking() from public, anon, authenticated;
create trigger evolucao_agendamento_validacao before insert on public.evolucao
  for each row execute function private.validate_evolution_booking();
