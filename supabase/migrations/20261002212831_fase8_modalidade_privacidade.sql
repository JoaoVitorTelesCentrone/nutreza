alter table public.agenda_servico add column modalidade text not null default 'presencial'
  check (modalidade in ('presencial', 'online'));
update public.agenda_servico set modalidade = 'online' where tipo = 'online';
alter table public.agendamento add column modalidade text not null default 'presencial'
  check (modalidade in ('presencial', 'online'));
update public.agendamento a set modalidade = s.modalidade
from public.agenda_servico s where s.id = a.servico_id and s.clinica_id = a.clinica_id;

create function private.set_booking_modality()
returns trigger language plpgsql set search_path = '' as $$
begin
  select s.modalidade into new.modalidade from public.agenda_servico s
   where s.id = new.servico_id and s.clinica_id = new.clinica_id;
  if new.modalidade is null then raise exception 'Serviço inválido' using errcode = '23503'; end if;
  return new;
end;
$$;
revoke all on function private.set_booking_modality() from public, anon, authenticated;
create trigger agendamento_phase8_modality before insert or update of servico_id on public.agendamento
  for each row execute function private.set_booking_modality();

alter table public.teleconsulta_sessao add constraint teleconsulta_session_max_duration
  check (encerra_em - abre_em <= interval '4 hours');

create or replace function private.validate_teleconsulta_sessao()
returns trigger language plpgsql set search_path = '' as $$
declare v_booking record;
begin
  select a.paciente_id, a.profissional_id, a.status, a.modalidade
    into v_booking from public.agendamento a
   where a.id = new.agendamento_id and a.clinica_id = new.clinica_id;
  if not found or v_booking.paciente_id is null or v_booking.paciente_id <> new.paciente_id
     or v_booking.profissional_id <> new.profissional_id or v_booking.modalidade <> 'online' then
    raise exception 'Consulta incompatível com a sessão online' using errcode = '23514';
  end if;
  if v_booking.status not in ('confirmado', 'em_atendimento') then
    raise exception 'A sessão exige consulta confirmada' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_teleconsulta_sessao() from public, anon, authenticated;
create trigger teleconsulta_session_validate before insert or update of agendamento_id, paciente_id, profissional_id, clinica_id
  on public.teleconsulta_sessao for each row execute function private.validate_teleconsulta_sessao();

drop policy "teleconsult session patient or clinic staff reads" on public.teleconsulta_sessao;
create policy "teleconsult session patient or clinical staff reads" on public.teleconsulta_sessao
  for select to authenticated using (
    exists (select 1 from public.perfil p where p.clinica_id = teleconsulta_sessao.clinica_id
      and p.user_id = (select auth.uid()) and p.papel in ('admin', 'profissional'))
    or exists (select 1 from public.paciente_acesso pa where pa.paciente_id = teleconsulta_sessao.paciente_id
      and pa.user_id = (select auth.uid()))
  );
drop policy "teleconsult acceptance patient or clinic staff reads" on public.teleconsulta_aceite;
create policy "teleconsult acceptance patient or clinical staff reads" on public.teleconsulta_aceite
  for select to authenticated using (
    exists (select 1 from public.perfil p where p.clinica_id = teleconsulta_aceite.clinica_id
      and p.user_id = (select auth.uid()) and p.papel in ('admin', 'profissional'))
    or (user_id = (select auth.uid()) and exists (select 1 from public.paciente_acesso pa
      where pa.paciente_id = teleconsulta_aceite.paciente_id and pa.user_id = (select auth.uid())))
  );
