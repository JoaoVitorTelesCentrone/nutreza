drop policy "member or admin reads profile" on public.perfil;
create policy "member or clinician reads profile" on public.perfil
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_role(clinica_id, array['admin', 'profissional'])
  );
