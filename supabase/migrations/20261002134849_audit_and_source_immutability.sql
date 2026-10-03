create function private.guard_published_food()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.fonte_id is not null and to_jsonb(new) is distinct from to_jsonb(old) then
    raise exception 'Alimento importado deve ser corrigido em nova versao da fonte'
      using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_published_food() from public, anon, authenticated;
create trigger zz_alimento_fonte_imutavel before update on public.alimento
  for each row execute function private.guard_published_food();

create function private.guard_source_measure()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.origem = 'fonte' and to_jsonb(new) is distinct from to_jsonb(old) then
    raise exception 'Medida importada deve ser corrigida em nova versao da fonte'
      using errcode = '22023';
  end if;
  if new.alimento_id is distinct from old.alimento_id or
     new.clinica_id is distinct from old.clinica_id or
     new.created_by is distinct from old.created_by or
     new.origem is distinct from old.origem then
    raise exception 'Origem e autoria da medida nao podem mudar' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_source_measure() from public, anon, authenticated;
create trigger zz_alimento_medida_identidade before update on public.alimento_medida
  for each row execute function private.guard_source_measure();

create trigger alimento_medida_audit after insert or update on public.alimento_medida
  for each row when (new.origem = 'profissional')
  execute function private.audit_clinical_change();

create function private.audit_food_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log(clinica_id, ator_id, acao, entidade, entidade_id)
  values (old.clinica_id, auth.uid(), 'delete', tg_table_name, old.id);
  return old;
end;
$$;
revoke all on function private.audit_food_delete() from public, anon, authenticated;
create trigger receita_ingrediente_delete_audit after delete on public.receita_ingrediente
  for each row execute function private.audit_food_delete();
create trigger alimento_medida_delete_audit after delete on public.alimento_medida
  for each row when (old.origem = 'profissional')
  execute function private.audit_food_delete();
