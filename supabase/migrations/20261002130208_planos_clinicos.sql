create function private.guard_food_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.fonte_id is distinct from old.fonte_id or new.codigo is distinct from old.codigo
    or new.clinica_id is distinct from old.clinica_id or new.created_by is distinct from old.created_by then
    raise exception 'Origem e autoria do alimento não podem mudar' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_food_identity() from public, anon, authenticated;
create trigger alimento_identidade before update on public.alimento
  for each row execute function private.guard_food_identity();

create function private.guard_recipe_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.clinica_id is distinct from old.clinica_id or new.created_by is distinct from old.created_by then
    raise exception 'Clínica e autoria da receita não podem mudar' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_recipe_identity() from public, anon, authenticated;
create trigger receita_identidade before update on public.receita
  for each row execute function private.guard_recipe_identity();

create table public.plano_alimentar (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  paciente_id uuid not null,
  serie_id uuid not null default gen_random_uuid(),
  versao integer not null default 1 check (versao > 0),
  titulo text not null check (char_length(btrim(titulo)) between 3 and 160),
  objetivo text not null default '' check (char_length(objetivo) <= 2000),
  meta_energia_kcal numeric(12,2) check (meta_energia_kcal > 0),
  meta_proteina_g numeric(12,2) check (meta_proteina_g > 0),
  meta_carboidrato_g numeric(12,2) check (meta_carboidrato_g > 0),
  meta_lipidios_g numeric(12,2) check (meta_lipidios_g > 0),
  status text not null default 'rascunho' check (status in ('rascunho', 'aprovado')),
  alergias_revisadas boolean not null default false,
  created_by uuid not null references auth.users(id),
  aprovado_por uuid references auth.users(id),
  aprovado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (serie_id, versao),
  unique (id, clinica_id, paciente_id),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id),
  check ((status = 'rascunho' and aprovado_por is null and aprovado_em is null)
      or (status = 'aprovado' and aprovado_por is not null and aprovado_em is not null))
);
create index plano_paciente_version_idx on public.plano_alimentar(paciente_id, aprovado_em desc);

create table public.plano_refeicao (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid not null,
  clinica_id uuid not null,
  paciente_id uuid not null,
  nome text not null check (char_length(btrim(nome)) between 2 and 80),
  horario time,
  ordem integer not null check (ordem >= 0),
  unique (plano_id, ordem),
  unique (id, plano_id, clinica_id, paciente_id),
  foreign key (plano_id, clinica_id, paciente_id)
    references public.plano_alimentar(id, clinica_id, paciente_id)
);

create table public.plano_item (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid not null,
  refeicao_id uuid not null,
  clinica_id uuid not null,
  paciente_id uuid not null,
  substitui_item_id uuid references public.plano_item(id),
  ordem integer not null check (ordem >= 0),
  alimento_id uuid references public.alimento(id),
  receita_id uuid references public.receita(id),
  medida_id uuid references public.alimento_medida(id),
  quantidade_medida numeric(12,3) check (quantidade_medida > 0),
  gramas numeric(12,3) not null check (gramas > 0 and gramas <= 100000),
  nome_snapshot text not null default '',
  nutrientes_snapshot jsonb not null default '{}'::jsonb,
  fonte_snapshot jsonb not null default '[]'::jsonb,
  observacao text not null default '' check (char_length(observacao) <= 500),
  check ((alimento_id is null) <> (receita_id is null)),
  check ((medida_id is null and quantidade_medida is null)
      or (medida_id is not null and quantidade_medida is not null and alimento_id is not null)),
  foreign key (refeicao_id, plano_id, clinica_id, paciente_id)
    references public.plano_refeicao(id, plano_id, clinica_id, paciente_id)
);
create index plano_item_refeicao_idx on public.plano_item(refeicao_id, ordem);

create function private.can_read_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.plano_alimentar p where p.id = p_plan and
    (private.has_role(p.clinica_id, array['admin', 'profissional'])
      or (p.status = 'aprovado' and private.is_patient(p.paciente_id))));
$$;
revoke all on function private.can_read_plan(uuid) from public, anon;
grant execute on function private.can_read_plan(uuid) to authenticated;

create function private.can_edit_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.plano_alimentar p where p.id = p_plan
    and p.status = 'rascunho'
    and private.has_role(p.clinica_id, array['admin', 'profissional']));
$$;
revoke all on function private.can_edit_plan(uuid) from public, anon;
grant execute on function private.can_edit_plan(uuid) to authenticated;

create function private.guard_plan()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'rascunho' or new.created_by is distinct from auth.uid() then
      raise exception 'Plano deve iniciar como rascunho do autor' using errcode = '42501';
    end if;
    if new.versao > 1 and not exists (
      select 1 from public.plano_alimentar previous
      where previous.serie_id = new.serie_id and previous.versao = new.versao - 1
        and previous.clinica_id = new.clinica_id and previous.paciente_id = new.paciente_id
        and previous.status = 'aprovado') then
      raise exception 'Versão anterior aprovada não encontrada' using errcode = '22023';
    end if;
  else
    if old.status = 'aprovado' then
      raise exception 'Plano aprovado é imutável' using errcode = '22023';
    end if;
    if new.id <> old.id or new.clinica_id <> old.clinica_id or new.paciente_id <> old.paciente_id
      or new.serie_id <> old.serie_id or new.versao <> old.versao
      or new.created_by <> old.created_by or new.created_at <> old.created_at then
      raise exception 'Identidade do plano não pode mudar' using errcode = '22023';
    end if;
    if new.status = 'aprovado' then
      if not new.alergias_revisadas or new.aprovado_por is distinct from auth.uid() then
        raise exception 'Aprovação exige revisão de alergias e autor identificado' using errcode = '22023';
      end if;
      if not exists (select 1 from public.plano_item i where i.plano_id = new.id and i.substitui_item_id is null) then
        raise exception 'Plano sem itens principais' using errcode = '22023';
      end if;
      new.aprovado_em := now();
    else
      if new.aprovado_por is not null or new.aprovado_em is not null then
        raise exception 'Rascunho não pode ter aprovação' using errcode = '22023';
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.guard_plan() from public, anon, authenticated;
create trigger plano_validacao before insert or update on public.plano_alimentar
  for each row execute function private.guard_plan();

create function private.guard_plan_meal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.id <> old.id or new.plano_id <> old.plano_id
    or new.clinica_id <> old.clinica_id or new.paciente_id <> old.paciente_id) then
    raise exception 'Identidade da refeição não pode mudar' using errcode = '22023';
  end if;
  if not private.can_edit_plan(coalesce(new.plano_id, old.plano_id)) then
    raise exception 'Plano aprovado ou acesso negado' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.guard_plan_meal() from public, anon, authenticated;
create trigger plano_refeicao_validacao before insert or update or delete on public.plano_refeicao
  for each row execute function private.guard_plan_meal();

create function private.calculate_plan_item()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  source_name text;
  totals jsonb;
  source_versions jsonb;
  measure public.alimento_medida%rowtype;
begin
  if tg_op = 'DELETE' then
    if not private.can_edit_plan(old.plano_id) then
      raise exception 'Plano aprovado ou acesso negado' using errcode = '42501';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and (new.id <> old.id or new.plano_id <> old.plano_id
    or new.refeicao_id <> old.refeicao_id or new.clinica_id <> old.clinica_id
    or new.paciente_id <> old.paciente_id) then
    raise exception 'Identidade do item não pode mudar' using errcode = '22023';
  end if;
  if not private.can_edit_plan(new.plano_id) then
    raise exception 'Plano aprovado ou acesso negado' using errcode = '42501';
  end if;
  if new.medida_id is not null then
    select * into measure from public.alimento_medida where id = new.medida_id;
    if measure.id is null or measure.alimento_id <> new.alimento_id or
      (measure.clinica_id is not null and measure.clinica_id <> new.clinica_id) then
      raise exception 'Medida incompatível com o alimento' using errcode = '22023';
    end if;
    new.gramas := round(measure.gramas * new.quantidade_medida, 3);
  end if;
  if new.substitui_item_id is not null and not exists (
    select 1 from public.plano_item original where original.id = new.substitui_item_id
      and original.refeicao_id = new.refeicao_id and original.substitui_item_id is null) then
    raise exception 'Substituição precisa apontar para item principal da mesma refeição' using errcode = '22023';
  end if;
  if new.alimento_id is not null then
    select f.nome into source_name from public.alimento f where f.id = new.alimento_id
      and (f.clinica_id is null or f.clinica_id = new.clinica_id);
  else
    select r.nome into source_name from public.receita r where r.id = new.receita_id
      and r.clinica_id = new.clinica_id;
  end if;
  if source_name is null then raise exception 'Alimento ou receita indisponível' using errcode = '22023'; end if;

  with parts as (
    select f.*, new.gramas / 100::numeric as multiplier
      from public.alimento f where f.id = new.alimento_id
    union all
    select f.*, (new.gramas * ri.gramas / r.rendimento_g) / 100::numeric as multiplier
      from public.receita r join public.receita_ingrediente ri on ri.receita_id = r.id
      join public.alimento f on f.id = ri.alimento_id
      where r.id = new.receita_id and r.clinica_id = new.clinica_id
  ), aggregates as (
    select count(*) as n,
      case when count(*) = count(energia_kcal_100g) then round(sum(energia_kcal_100g * multiplier), 4) end as energy,
      case when count(*) = count(proteina_g_100g) then round(sum(proteina_g_100g * multiplier), 4) end as protein,
      case when count(*) = count(carboidrato_g_100g) then round(sum(carboidrato_g_100g * multiplier), 4) end as carbs,
      case when count(*) = count(lipidios_g_100g) then round(sum(lipidios_g_100g * multiplier), 4) end as fat,
      case when count(*) = count(fibra_g_100g) then round(sum(fibra_g_100g * multiplier), 4) end as fiber,
      case when count(*) = count(sodio_mg_100g) then round(sum(sodio_mg_100g * multiplier), 4) end as sodium,
      coalesce(jsonb_agg(distinct jsonb_build_object('fonte', src.nome, 'versao', src.versao,
        'codigo', parts.codigo)) filter (where src.id is not null), '[]'::jsonb) as sources
    from parts left join public.alimento_fonte src on src.id = parts.fonte_id
  )
  select jsonb_build_object('energia_kcal', energy, 'proteina_g', protein,
    'carboidrato_g', carbs, 'lipidios_g', fat, 'fibra_g', fiber, 'sodio_mg', sodium), sources
    into totals, source_versions from aggregates where n > 0;
  if totals is null or totals->>'energia_kcal' is null or totals->>'proteina_g' is null
    or totals->>'carboidrato_g' is null or totals->>'lipidios_g' is null then
    raise exception 'Composição nutricional incompleta para o plano' using errcode = '22023';
  end if;
  new.nome_snapshot := source_name;
  new.nutrientes_snapshot := totals;
  new.fonte_snapshot := source_versions;
  return new;
end;
$$;
revoke all on function private.calculate_plan_item() from public, anon, authenticated;
create trigger plano_item_calculo before insert or update or delete on public.plano_item
  for each row execute function private.calculate_plan_item();

alter table public.plano_alimentar enable row level security;
alter table public.plano_refeicao enable row level security;
alter table public.plano_item enable row level security;
revoke all on public.plano_alimentar, public.plano_refeicao, public.plano_item from anon, authenticated;
grant select, insert, update on public.plano_alimentar to authenticated;
grant select, insert, update, delete on public.plano_refeicao, public.plano_item to authenticated;

create policy "clinician or patient reads plan" on public.plano_alimentar for select to authenticated
  using (private.has_role(clinica_id, array['admin', 'profissional'])
    or (status = 'aprovado' and private.is_patient(paciente_id)));
create policy "clinician creates draft" on public.plano_alimentar for insert to authenticated
  with check (status = 'rascunho' and created_by = (select auth.uid())
    and private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician updates draft" on public.plano_alimentar for update to authenticated
  using (status = 'rascunho' and private.has_role(clinica_id, array['admin', 'profissional']))
  with check (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "clinician or patient reads meals" on public.plano_refeicao for select to authenticated
  using (private.can_read_plan(plano_id));
create policy "clinician adds meal to draft" on public.plano_refeicao for insert to authenticated
  with check (private.can_edit_plan(plano_id));
create policy "clinician updates draft meal" on public.plano_refeicao for update to authenticated
  using (private.can_edit_plan(plano_id)) with check (private.can_edit_plan(plano_id));
create policy "clinician deletes draft meal" on public.plano_refeicao for delete to authenticated
  using (private.can_edit_plan(plano_id));
create policy "clinician or patient reads items" on public.plano_item for select to authenticated
  using (private.can_read_plan(plano_id));
create policy "clinician adds item to draft" on public.plano_item for insert to authenticated
  with check (private.can_edit_plan(plano_id));
create policy "clinician updates draft item" on public.plano_item for update to authenticated
  using (private.can_edit_plan(plano_id)) with check (private.can_edit_plan(plano_id));
create policy "clinician deletes draft item" on public.plano_item for delete to authenticated
  using (private.can_edit_plan(plano_id));

create trigger plano_audit after insert or update on public.plano_alimentar
  for each row execute function private.audit_clinical_change();
create trigger plano_refeicao_audit after insert or update on public.plano_refeicao
  for each row execute function private.audit_clinical_change();
create trigger plano_item_audit after insert or update on public.plano_item
  for each row execute function private.audit_clinical_change();

create function private.audit_plan_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log(clinica_id, paciente_id, ator_id, acao, entidade, entidade_id)
  values (old.clinica_id, old.paciente_id, auth.uid(), 'delete', tg_table_name, old.id);
  return old;
end;
$$;
revoke all on function private.audit_plan_delete() from public, anon, authenticated;
create trigger plano_refeicao_delete_audit after delete on public.plano_refeicao
  for each row execute function private.audit_plan_delete();
create trigger plano_item_delete_audit after delete on public.plano_item
  for each row execute function private.audit_plan_delete();
