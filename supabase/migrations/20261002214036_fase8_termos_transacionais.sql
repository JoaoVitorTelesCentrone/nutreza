alter table public.teleconsulta_aceite drop constraint teleconsulta_aceite_sessao_id_termo_id_user_id_key;

create or replace function public.publish_teleconsulta_termo(
  p_clinica_id uuid, p_versao text, p_conteudo text, p_user_id uuid
)
returns uuid language plpgsql set search_path = '' as $$
declare v_id uuid;
begin
  if auth.jwt() ->> 'role' <> 'service_role'
     or p_clinica_id is null or p_user_id is null
     or char_length(btrim(coalesce(p_versao, ''))) not between 1 and 80
     or char_length(btrim(coalesce(p_conteudo, ''))) not between 20 and 20000 then
    raise exception 'Invalid term publication request' using errcode = '42501';
  end if;
  update public.teleconsulta_termo
     set status = 'arquivado', publicado_em = null
   where clinica_id = p_clinica_id and status = 'publicado';
  insert into public.teleconsulta_termo(clinica_id, versao, conteudo, status, criado_por, publicado_por, publicado_em)
  values (p_clinica_id, btrim(p_versao), btrim(p_conteudo), 'publicado', p_user_id, p_user_id, now())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.publish_teleconsulta_termo(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.publish_teleconsulta_termo(uuid, text, text, uuid) to service_role;
