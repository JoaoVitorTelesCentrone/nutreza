-- Keep the actual attribution text and source URL with each calculated item.
-- An approved plan can then be rendered without reading a mutable catalog.
create function private.snapshot_plan_source_attribution()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select coalesce(jsonb_agg(jsonb_build_object(
      'fonte', source_name, 'versao', source_version, 'codigo', food_code,
      'atribuicao', attribution, 'referencia_url', reference_url,
      'licenca', license_text) order by source_name, source_version, food_code), '[]'::jsonb)
    into new.fonte_snapshot
  from (
    select distinct src.nome as source_name, src.versao as source_version,
      f.codigo as food_code, src.atribuicao as attribution,
      src.referencia_url as reference_url, src.licenca as license_text
    from public.alimento f
    join public.alimento_fonte src on src.id = f.fonte_id
    where f.id = new.alimento_id
    union
    select distinct src.nome, src.versao, f.codigo, src.atribuicao,
      src.referencia_url, src.licenca
    from public.receita_ingrediente ri
    join public.alimento f on f.id = ri.alimento_id
    join public.alimento_fonte src on src.id = f.fonte_id
    where ri.receita_id = new.receita_id
  ) sources;
  return new;
end;
$$;
revoke all on function private.snapshot_plan_source_attribution() from public, anon, authenticated;
create trigger zz_plano_item_atribuicao before insert or update on public.plano_item
  for each row execute function private.snapshot_plan_source_attribution();
