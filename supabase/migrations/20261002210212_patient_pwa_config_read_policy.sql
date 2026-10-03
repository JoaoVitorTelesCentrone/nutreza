drop policy "staff reads patient pwa config" on public.patient_pwa_config;
drop policy "patient reads clinic photo analysis availability" on public.patient_pwa_config;
create policy "staff and patient read patient pwa config" on public.patient_pwa_config
  for select to authenticated using (private.has_role(clinica_id, array['admin', 'profissional']) or exists (
    select 1 from public.paciente_acesso a where a.clinica_id = patient_pwa_config.clinica_id and a.user_id = (select auth.uid())
  ));
