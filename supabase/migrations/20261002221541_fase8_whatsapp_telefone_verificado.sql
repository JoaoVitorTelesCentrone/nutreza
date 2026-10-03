create table public.whatsapp_paciente_telefone (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  paciente_id uuid not null,
  user_id uuid not null references auth.users(id),
  telefone_e164 text not null check (telefone_e164 ~ '^\\+[1-9][0-9]{7,14}$'),
  verificado_em timestamptz not null default now(),
  revogado_em timestamptz,
  created_at timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id) on delete cascade,
  unique (clinica_id, paciente_id),
  unique (clinica_id, telefone_e164),
  unique (id, clinica_id, paciente_id, user_id)
);
create table public.whatsapp_phone_challenge (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  paciente_id uuid not null,
  user_id uuid not null references auth.users(id),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id) on delete cascade,
  check (expires_at > created_at)
);
create index whatsapp_phone_challenge_expiry_idx on public.whatsapp_phone_challenge(expires_at) where consumed_at is null;

alter table public.whatsapp_paciente_telefone enable row level security;
alter table public.whatsapp_phone_challenge enable row level security;
revoke all on public.whatsapp_paciente_telefone, public.whatsapp_phone_challenge from anon, authenticated;
grant all on public.whatsapp_paciente_telefone, public.whatsapp_phone_challenge to service_role;

drop policy "whatsapp terms published and current" on public.whatsapp_termo;
create policy "whatsapp terms published and current" on public.whatsapp_termo
  for select to authenticated using (
    status = 'publicado' and (
      clinica_id is null
      or exists (select 1 from public.perfil p where p.clinica_id = whatsapp_termo.clinica_id and p.user_id = (select auth.uid()))
      or exists (select 1 from public.paciente_acesso pa join public.paciente p on p.id = pa.paciente_id
        where p.clinica_id = whatsapp_termo.clinica_id and pa.user_id = (select auth.uid()))
    )
  );

create or replace function public.consume_whatsapp_phone_challenge(p_token_hash text, p_telefone_e164 text)
returns table (clinica_id uuid, paciente_id uuid, user_id uuid)
language plpgsql set search_path = '' as $$
declare v_challenge public.whatsapp_phone_challenge%rowtype;
begin
  if auth.jwt() ->> 'role' <> 'service_role'
     or p_token_hash !~ '^[a-f0-9]{64}$' or p_telefone_e164 !~ '^\\+[1-9][0-9]{7,14}$' then
    raise exception 'Invalid phone verification request' using errcode = '42501';
  end if;
  select * into v_challenge from public.whatsapp_phone_challenge c
   where c.token_hash = p_token_hash and c.consumed_at is null and c.expires_at > now()
   for update;
  if not found then return; end if;
  insert into public.whatsapp_paciente_telefone(clinica_id, paciente_id, user_id, telefone_e164, verificado_em, revogado_em)
  values (v_challenge.clinica_id, v_challenge.paciente_id, v_challenge.user_id, p_telefone_e164, now(), null)
  on conflict (clinica_id, paciente_id) do update set
    user_id = excluded.user_id, telefone_e164 = excluded.telefone_e164,
    verificado_em = excluded.verificado_em, revogado_em = null;
  update public.whatsapp_phone_challenge set consumed_at = now() where id = v_challenge.id;
  return query select v_challenge.clinica_id, v_challenge.paciente_id, v_challenge.user_id;
exception when unique_violation then
  return;
end;
$$;
revoke all on function public.consume_whatsapp_phone_challenge(text, text) from public, anon, authenticated;
grant execute on function public.consume_whatsapp_phone_challenge(text, text) to service_role;

create or replace function public.queue_whatsapp_template(
  p_clinica_id uuid, p_paciente_id uuid, p_template_id uuid, p_finalidade text,
  p_idempotency_key text, p_parametros jsonb default '[]'::jsonb
)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_consent public.whatsapp_consent_event%rowtype;
  v_template public.whatsapp_template%rowtype;
  v_config public.whatsapp_config%rowtype;
  v_phone public.whatsapp_paciente_telefone%rowtype;
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
  select o.id into v_outbox_id from public.whatsapp_outbox o where o.clinica_id = p_clinica_id and o.idempotency_key = p_idempotency_key;
  if found then return v_outbox_id; end if;
  select * into v_template from public.whatsapp_template t
   where t.id = p_template_id and t.clinica_id = p_clinica_id and t.finalidade = p_finalidade and t.status = 'aprovado';
  if not found then raise exception 'Approved template not found' using errcode = '23503'; end if;
  select * into v_config from public.whatsapp_config c where c.clinica_id = p_clinica_id and c.ativo;
  if not found then raise exception 'WhatsApp channel disabled' using errcode = '55000'; end if;
  select * into v_phone from public.whatsapp_paciente_telefone p
   where p.clinica_id = p_clinica_id and p.paciente_id = p_paciente_id and p.revogado_em is null;
  if not found then raise exception 'Patient phone is not verified' using errcode = '42501'; end if;
  select * into v_consent from public.whatsapp_consent_event e
   where e.clinica_id = p_clinica_id and e.paciente_id = p_paciente_id and e.finalidade = v_channel_purpose
   order by e.created_at desc, e.id desc limit 1;
  if not found or not v_consent.aceito or v_consent.telefone_e164 <> v_phone.telefone_e164 then
    raise exception 'WhatsApp consent missing or stale' using errcode = '42501';
  end if;
  if not exists (select 1 from public.paciente p where p.id = p_paciente_id and p.clinica_id = p_clinica_id and p.status = 'ativo') then
    raise exception 'Patient unavailable' using errcode = '23503';
  end if;
  insert into public.whatsapp_conversa(clinica_id, paciente_id, telefone_e164, ultima_mensagem_em, janela_expira_em, estado)
  values (p_clinica_id, p_paciente_id, v_phone.telefone_e164, now(), now() + interval '24 hours', 'aberta')
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
  returning id into v_outbox_id;
  return v_outbox_id;
end;
$$;
revoke all on function public.queue_whatsapp_template(uuid, uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.queue_whatsapp_template(uuid, uuid, uuid, text, text, jsonb) to service_role;
