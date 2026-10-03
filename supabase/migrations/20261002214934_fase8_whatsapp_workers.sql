alter table public.whatsapp_mensagem add column parametros_template jsonb not null default '[]'::jsonb
  check (jsonb_typeof(parametros_template) = 'array' and jsonb_array_length(parametros_template) <= 10);
alter table public.whatsapp_webhook_event add column estado text not null default 'recebido'
  check (estado in ('recebido', 'processando', 'processado', 'erro'));
alter table public.whatsapp_webhook_event add column bloqueado_em timestamptz;
create index whatsapp_webhook_pending_idx on public.whatsapp_webhook_event(recebido_em)
  where estado in ('recebido', 'erro');

create or replace function public.publish_whatsapp_termo(
  p_clinica_id uuid, p_finalidade text, p_versao text, p_conteudo text, p_user_id uuid
)
returns uuid language plpgsql set search_path = '' as $$
declare v_id uuid;
begin
  if auth.jwt() ->> 'role' <> 'service_role'
     or p_clinica_id is null or p_user_id is null
     or p_finalidade not in ('contato_whatsapp', 'checkin_whatsapp', 'conteudo_educativo_whatsapp')
     or char_length(btrim(coalesce(p_versao, ''))) not between 1 and 80
     or char_length(btrim(coalesce(p_conteudo, ''))) not between 20 and 12000 then
    raise exception 'Invalid WhatsApp term publication request' using errcode = '42501';
  end if;
  update public.whatsapp_termo set status = 'arquivado', publicado_em = null
   where clinica_id = p_clinica_id and finalidade = p_finalidade and status = 'publicado';
  insert into public.whatsapp_termo(clinica_id, finalidade, versao, conteudo, status, criado_por, publicado_por, publicado_em)
  values (p_clinica_id, p_finalidade, btrim(p_versao), btrim(p_conteudo), 'publicado', p_user_id, p_user_id, now())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.publish_whatsapp_termo(uuid, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.publish_whatsapp_termo(uuid, text, text, text, uuid) to service_role;

create or replace function public.queue_whatsapp_template(
  p_clinica_id uuid, p_paciente_id uuid, p_template_id uuid, p_finalidade text,
  p_idempotency_key text, p_parametros jsonb default '[]'::jsonb
)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_consent public.whatsapp_consent_event%rowtype;
  v_template public.whatsapp_template%rowtype;
  v_config public.whatsapp_config%rowtype;
  v_conversation_id uuid;
  v_message_id uuid;
  v_outbox_id uuid;
  v_channel_purpose text;
begin
  if auth.jwt() ->> 'role' <> 'service_role'
     or p_clinica_id is null or p_paciente_id is null or p_template_id is null
     or p_idempotency_key is null or char_length(p_idempotency_key) not between 16 and 200
     or jsonb_typeof(coalesce(p_parametros, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_parametros, '[]'::jsonb)) > 10 then
    raise exception 'Invalid WhatsApp queue request' using errcode = '42501';
  end if;
  v_channel_purpose := case p_finalidade
    when 'checkin' then 'checkin_whatsapp'
    when 'lembrete_consulta' then 'contato_whatsapp'
    when 'resposta_aprovada' then 'contato_whatsapp'
    when 'escalonamento' then 'contato_whatsapp'
    else null end;
  if v_channel_purpose is null then raise exception 'Invalid WhatsApp purpose' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_clinica_id::text || ':' || p_idempotency_key, 0));
  select o.id into v_outbox_id from public.whatsapp_outbox o
   where o.clinica_id = p_clinica_id and o.idempotency_key = p_idempotency_key;
  if found then return v_outbox_id; end if;

  select * into v_template from public.whatsapp_template t
   where t.id = p_template_id and t.clinica_id = p_clinica_id and t.finalidade = p_finalidade and t.status = 'aprovado';
  if not found then raise exception 'Approved template not found' using errcode = '23503'; end if;
  select * into v_config from public.whatsapp_config c where c.clinica_id = p_clinica_id and c.ativo;
  if not found then raise exception 'WhatsApp channel disabled' using errcode = '55000'; end if;
  select * into v_consent from public.whatsapp_consent_event e
   where e.clinica_id = p_clinica_id and e.paciente_id = p_paciente_id and e.finalidade = v_channel_purpose
   order by e.created_at desc, e.id desc limit 1;
  if not found or not v_consent.aceito then raise exception 'WhatsApp consent missing' using errcode = '42501'; end if;
  if not exists (select 1 from public.paciente p where p.id = p_paciente_id and p.clinica_id = p_clinica_id and p.status = 'ativo') then
    raise exception 'Patient unavailable' using errcode = '23503';
  end if;
  insert into public.whatsapp_conversa(clinica_id, paciente_id, telefone_e164, ultima_mensagem_em, janela_expira_em, estado)
  values (p_clinica_id, p_paciente_id, v_consent.telefone_e164, now(), now() + interval '24 hours', 'aberta')
  on conflict (clinica_id, paciente_id, telefone_e164) do update
    set ultima_mensagem_em = excluded.ultima_mensagem_em, janela_expira_em = excluded.janela_expira_em, estado = 'aberta'
  returning id into v_conversation_id;
  insert into public.whatsapp_mensagem(clinica_id, conversa_id, paciente_id, direcao, tipo, conteudo,
    finalidade, template_id, status, parametros_template)
  values (p_clinica_id, v_conversation_id, p_paciente_id, 'saida', 'template', v_template.conteudo,
    p_finalidade, v_template.id, 'enfileirada', coalesce(p_parametros, '[]'::jsonb))
  returning id into v_message_id;
  insert into public.whatsapp_outbox(clinica_id, paciente_id, conversa_id, mensagem_id, finalidade,
    consent_event_id, idempotency_key, status)
  values (p_clinica_id, p_paciente_id, v_conversation_id, v_message_id, v_channel_purpose,
    v_consent.id, p_idempotency_key, 'pendente')
  on conflict (clinica_id, idempotency_key) do update set idempotency_key = excluded.idempotency_key
  returning id into v_outbox_id;
  return v_outbox_id;
end;
$$;
revoke all on function public.queue_whatsapp_template(uuid, uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.queue_whatsapp_template(uuid, uuid, uuid, text, text, jsonb) to service_role;

create or replace function public.claim_whatsapp_outbox(p_limit integer default 20)
returns setof public.whatsapp_outbox language sql set search_path = '' as $$
  with picked as (
    select o.id from public.whatsapp_outbox o
     where (o.status = 'pendente' and o.proxima_tentativa_em <= now())
        or (o.status = 'processando' and o.bloqueada_em < now() - interval '5 minutes')
     order by o.proxima_tentativa_em, o.created_at
     for update skip locked limit greatest(1, least(p_limit, 100))
  )
  update public.whatsapp_outbox o set status = 'processando', bloqueada_em = now(), tentativas = o.tentativas + 1
   from picked where o.id = picked.id returning o.*;
$$;
revoke all on function public.claim_whatsapp_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_whatsapp_outbox(integer) to service_role;

create or replace function public.claim_whatsapp_webhook(
  p_provedor text, p_evento_id text, p_tipo text, p_phone_number_id text, p_payload_hash text
)
returns boolean language plpgsql set search_path = '' as $$
declare v_claimed uuid;
begin
  if auth.jwt() ->> 'role' <> 'service_role' or p_provedor not in ('meta', 'simulado')
     or p_evento_id is null or char_length(p_evento_id) > 240
     or p_tipo is null or char_length(p_tipo) > 80 or p_payload_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid webhook event' using errcode = '42501';
  end if;
  insert into public.whatsapp_webhook_event(provedor, evento_id, tipo, phone_number_id, payload_hash, estado, bloqueado_em)
  values (p_provedor, p_evento_id, p_tipo, p_phone_number_id, p_payload_hash, 'processando', now())
  on conflict (provedor, evento_id) do update
    set estado = 'processando', bloqueado_em = now(), erro_codigo = null
    where public.whatsapp_webhook_event.estado = 'erro'
       or (public.whatsapp_webhook_event.estado = 'processando' and public.whatsapp_webhook_event.bloqueado_em < now() - interval '5 minutes')
  returning id into v_claimed;
  return v_claimed is not null;
end;
$$;
revoke all on function public.claim_whatsapp_webhook(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_whatsapp_webhook(text, text, text, text, text) to service_role;
