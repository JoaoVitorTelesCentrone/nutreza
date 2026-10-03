-- Preserve the exact composition used when a draft item was calculated.
alter table public.plano_item add column composicao_snapshot jsonb not null default '{}'::jsonb;

create function private.snapshot_plan_composition()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.composicao_snapshot := jsonb_build_object(
    'tipo', case when new.alimento_id is not null then 'alimento' else 'receita' end,
    'medida', (select jsonb_build_object('nome', m.nome, 'gramas', m.gramas,
      'quantidade', new.quantidade_medida) from public.alimento_medida m where m.id = new.medida_id),
    'ingredientes', case when new.receita_id is null then '[]'::jsonb else
      (select coalesce(jsonb_agg(jsonb_build_object(
        'nome', f.nome, 'gramas', ri.gramas, 'energia_kcal_100g', f.energia_kcal_100g,
        'proteina_g_100g', f.proteina_g_100g, 'carboidrato_g_100g', f.carboidrato_g_100g,
        'lipidios_g_100g', f.lipidios_g_100g, 'fibra_g_100g', f.fibra_g_100g,
        'sodio_mg_100g', f.sodio_mg_100g, 'fonte', src.nome,
        'versao_fonte', src.versao, 'codigo', f.codigo) order by ri.id), '[]'::jsonb)
       from public.receita_ingrediente ri
       join public.alimento f on f.id = ri.alimento_id
       left join public.alimento_fonte src on src.id = f.fonte_id
       where ri.receita_id = new.receita_id) end,
    'rendimento_g', (select r.rendimento_g from public.receita r where r.id = new.receita_id),
    'alimento_100g', (select jsonb_build_object('energia_kcal', f.energia_kcal_100g,
      'proteina_g', f.proteina_g_100g, 'carboidrato_g', f.carboidrato_g_100g,
      'lipidios_g', f.lipidios_g_100g, 'fibra_g', f.fibra_g_100g,
      'sodio_mg', f.sodio_mg_100g, 'codigo', f.codigo)
      from public.alimento f where f.id = new.alimento_id)
  );
  return new;
end;
$$;
revoke all on function private.snapshot_plan_composition() from public, anon, authenticated;
create trigger zz_plano_item_composicao before insert or update on public.plano_item
  for each row execute function private.snapshot_plan_composition();

create function public.clone_plan_revision(p_source uuid)
returns uuid language plpgsql set search_path = '' as $$
declare
  source_plan public.plano_alimentar%rowtype;
  new_plan_id uuid;
  meal_row public.plano_refeicao%rowtype;
  item_row public.plano_item%rowtype;
  new_meal_id uuid;
  new_item_id uuid;
  meal_map jsonb := '{}'::jsonb;
  item_map jsonb := '{}'::jsonb;
begin
  select * into source_plan from public.plano_alimentar
    where id = p_source and status = 'aprovado' for update;
  if source_plan.id is null or not private.has_role(source_plan.clinica_id, array['admin', 'profissional']) then
    raise exception 'Plano aprovado indisponivel' using errcode = '42501';
  end if;
  if exists (select 1 from public.plano_alimentar p
      where p.serie_id = source_plan.serie_id and p.versao > source_plan.versao) then
    raise exception 'Existe uma versao mais recente' using errcode = '22023';
  end if;
  insert into public.plano_alimentar (clinica_id, paciente_id, serie_id, versao,
      titulo, objetivo, meta_energia_kcal, meta_proteina_g,
      meta_carboidrato_g, meta_lipidios_g, created_by)
    values (source_plan.clinica_id, source_plan.paciente_id, source_plan.serie_id,
      source_plan.versao + 1, source_plan.titulo, source_plan.objetivo,
      source_plan.meta_energia_kcal, source_plan.meta_proteina_g,
      source_plan.meta_carboidrato_g, source_plan.meta_lipidios_g, auth.uid())
    returning id into new_plan_id;
  for meal_row in select * from public.plano_refeicao where plano_id = p_source order by ordem loop
    insert into public.plano_refeicao (plano_id, clinica_id, paciente_id, nome, horario, ordem)
      values (new_plan_id, meal_row.clinica_id, meal_row.paciente_id,
        meal_row.nome, meal_row.horario, meal_row.ordem) returning id into new_meal_id;
    meal_map := meal_map || jsonb_build_object(meal_row.id::text, new_meal_id::text);
  end loop;
  for item_row in select * from public.plano_item
      where plano_id = p_source and substitui_item_id is null order by refeicao_id, ordem loop
    insert into public.plano_item (plano_id, refeicao_id, clinica_id, paciente_id,
      ordem, alimento_id, receita_id, medida_id, quantidade_medida, gramas, observacao)
      values (new_plan_id, (meal_map->>item_row.refeicao_id::text)::uuid,
        item_row.clinica_id, item_row.paciente_id, item_row.ordem,
        item_row.alimento_id, item_row.receita_id, item_row.medida_id,
        item_row.quantidade_medida, item_row.gramas, item_row.observacao)
      returning id into new_item_id;
    item_map := item_map || jsonb_build_object(item_row.id::text, new_item_id::text);
  end loop;
  for item_row in select * from public.plano_item
      where plano_id = p_source and substitui_item_id is not null order by refeicao_id, ordem loop
    insert into public.plano_item (plano_id, refeicao_id, clinica_id, paciente_id,
      substitui_item_id, ordem, alimento_id, receita_id, medida_id,
      quantidade_medida, gramas, observacao)
      values (new_plan_id, (meal_map->>item_row.refeicao_id::text)::uuid,
        item_row.clinica_id, item_row.paciente_id,
        (item_map->>item_row.substitui_item_id::text)::uuid, item_row.ordem,
        item_row.alimento_id, item_row.receita_id, item_row.medida_id,
        item_row.quantidade_medida, item_row.gramas, item_row.observacao);
  end loop;
  return new_plan_id;
end;
$$;
revoke all on function public.clone_plan_revision(uuid) from public, anon;
grant execute on function public.clone_plan_revision(uuid) to authenticated;

create trigger receita_ingrediente_audit after insert or update on public.receita_ingrediente
  for each row execute function private.audit_clinical_change();
