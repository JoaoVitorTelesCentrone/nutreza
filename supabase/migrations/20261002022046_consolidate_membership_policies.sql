drop policy "owner reads clinic" on public.clinica;
drop policy "staff reads clinic" on public.clinica;
create policy "owner or staff reads clinic" on public.clinica
  for select to authenticated
  using (
    created_by = (select auth.uid())
    or private.has_role(id, array['admin', 'profissional', 'recepcao'])
  );

drop policy "member reads own profile" on public.perfil;
drop policy "admin reads clinic profiles" on public.perfil;
create policy "member or admin reads profile" on public.perfil
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_role(clinica_id, array['admin'])
  );

drop policy "owner creates own profile" on public.perfil;
drop policy "admin adds team member" on public.perfil;
create policy "owner or admin adds profile" on public.perfil
  for insert to authenticated
  with check (
    (
      user_id = (select auth.uid())
      and papel = 'admin'
      and exists (
        select 1 from public.clinica c
        where c.id = clinica_id and c.created_by = (select auth.uid())
      )
    )
    or (
      user_id <> (select auth.uid())
      and private.has_role(clinica_id, array['admin'])
    )
  );
