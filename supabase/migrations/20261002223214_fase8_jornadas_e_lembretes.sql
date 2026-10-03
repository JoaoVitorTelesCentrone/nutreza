alter table public.whatsapp_template drop constraint if exists whatsapp_template_categoria_check;
alter table public.whatsapp_template add constraint whatsapp_template_categoria_check
  check (categoria in ('utility', 'marketing', 'authentication'));

alter table public.whatsapp_config alter column graph_api_version set default 'v26.0';

create or replace function public.patient_next_appointment(p_paciente_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not private.is_patient(p_paciente_id) then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'id', a.id, 'inicio', a.inicio, 'fim', a.fim, 'status', a.status,
    'servico', s.nome, 'clinica', c.nome, 'modalidade', a.modalidade,
    'sessao_id', (select ts.id from public.teleconsulta_sessao ts
      where ts.agendamento_id = a.id and ts.paciente_id = a.paciente_id and ts.clinica_id = a.clinica_id
        and ts.estado in ('agendada', 'em_andamento') limit 1)
  ) into v_result
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
