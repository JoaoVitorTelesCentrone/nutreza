alter table public.agendamento drop constraint agendamento_phase8_scope_unique;

create or replace function public.consume_whatsapp_phone_challenge(p_token_hash text, p_telefone_e164 text)
returns table (clinica_id uuid, paciente_id uuid, user_id uuid)
language plpgsql set search_path = '' as $$
declare v_challenge public.whatsapp_phone_challenge%rowtype;
begin
  if auth.jwt() ->> 'role' <> 'service_role'
     or p_token_hash !~ '^[a-f0-9]{64}$' or p_telefone_e164 !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Invalid phone verification request' using errcode = '42501';
  end if;
  select * into v_challenge from public.whatsapp_phone_challenge c
   where c.token_hash = p_token_hash and c.consumed_at is null and c.expires_at > now()
   for update;
  if not found then return; end if;
  insert into public.whatsapp_paciente_telefone(clinica_id, paciente_id, user_id, telefone_e164, verificado_em, revogado_em)
  values (v_challenge.clinica_id, v_challenge.paciente_id, v_challenge.user_id, p_telefone_e164, now(), null)
  on conflict on constraint whatsapp_paciente_telefone_clinica_id_paciente_id_key do update set
    user_id = excluded.user_id, telefone_e164 = excluded.telefone_e164,
    verificado_em = excluded.verificado_em, revogado_em = null;
  update public.whatsapp_phone_challenge c set consumed_at = now() where c.id = v_challenge.id;
  return query select v_challenge.clinica_id, v_challenge.paciente_id, v_challenge.user_id;
exception when unique_violation then return;
end;
$$;
revoke all on function public.consume_whatsapp_phone_challenge(text,text) from public,anon,authenticated;
grant execute on function public.consume_whatsapp_phone_challenge(text,text) to service_role;
