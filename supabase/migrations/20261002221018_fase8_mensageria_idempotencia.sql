create unique index whatsapp_config_phone_number_unique on public.whatsapp_config(phone_number_id)
  where phone_number_id is not null;
create unique index whatsapp_conversa_phone_clinic_unique on public.whatsapp_conversa(clinica_id, telefone_e164);
alter table public.whatsapp_consent_event add column source_event_id text;
alter table public.whatsapp_consent_event add constraint whatsapp_consent_source_event_unique unique (source_event_id, finalidade);
alter table public.whatsapp_escalacao add column source_event_id text unique;

create function private.create_whatsapp_checkin_from_outbox()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.finalidade <> 'checkin_whatsapp' then return new; end if;
  insert into public.whatsapp_checkin(clinica_id, paciente_id, mensagem_id, finalidade, chave_ocorrencia)
  values (new.clinica_id, new.paciente_id, new.mensagem_id, 'checkin', new.idempotency_key)
  on conflict (clinica_id, paciente_id, chave_ocorrencia) do nothing;
  return new;
end;
$$;
revoke all on function private.create_whatsapp_checkin_from_outbox() from public, anon, authenticated;
create trigger whatsapp_outbox_checkin after insert on public.whatsapp_outbox
  for each row execute function private.create_whatsapp_checkin_from_outbox();

create or replace function public.claim_whatsapp_outbox(p_limit integer default 20)
returns setof public.whatsapp_outbox language plpgsql set search_path = '' as $$
begin
  -- A stale external request has an unknown outcome. Mark it for human reconciliation;
  -- never automatically resend it because the provider may already have accepted it.
  update public.whatsapp_outbox set status = 'erro', bloqueada_em = null,
    erro_codigo = 'worker_timeout_outcome_unknown'
   where status = 'processando' and bloqueada_em < now() - interval '5 minutes';
  return query
    with picked as (
      select o.id from public.whatsapp_outbox o
       where o.status = 'pendente' and o.proxima_tentativa_em <= now()
       order by o.proxima_tentativa_em, o.created_at
       for update skip locked limit greatest(1, least(p_limit, 100))
    )
    update public.whatsapp_outbox o set status = 'processando', bloqueada_em = now(), tentativas = o.tentativas + 1
     from picked where o.id = picked.id returning o.*;
end;
$$;
revoke all on function public.claim_whatsapp_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_whatsapp_outbox(integer) to service_role;
