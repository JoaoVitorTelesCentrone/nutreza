drop policy "patient records own progress" on public.patient_progress;
drop policy "patient edits own progress" on public.patient_progress;
drop policy "patient records own diary" on public.patient_diary_entry;
drop policy "patient edits own diary" on public.patient_diary_entry;
drop policy "patient manages own progress photos" on public.patient_progress_photo;
drop policy "patient uploads own image" on storage.objects;
drop function private.patient_area_consent(uuid, uuid);

create or replace function private.patient_area_consent(p_paciente_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select c.aceito from public.patient_consent_event c
    where c.paciente_id = p_paciente_id and c.user_id = auth.uid() and c.finalidade = 'uso_area_paciente'
    order by c.created_at desc limit 1), false);
$$;
revoke all on function private.patient_area_consent(uuid) from public, anon;
grant execute on function private.patient_area_consent(uuid) to authenticated;

create policy "patient records own progress" on public.patient_progress
  for insert to authenticated with check (registrado_por = (select auth.uid()) and private.is_patient(paciente_id)
    and private.patient_area_consent(paciente_id));
create policy "patient edits own progress" on public.patient_progress
  for update to authenticated using (registrado_por = (select auth.uid()) and private.is_patient(paciente_id))
  with check (registrado_por = (select auth.uid()) and private.is_patient(paciente_id)
    and private.patient_area_consent(paciente_id));
create policy "patient records own diary" on public.patient_diary_entry
  for insert to authenticated with check (registrado_por = (select auth.uid()) and private.is_patient(paciente_id)
    and private.patient_area_consent(paciente_id));
create policy "patient edits own diary" on public.patient_diary_entry
  for update to authenticated using (registrado_por = (select auth.uid()) and private.is_patient(paciente_id))
  with check (registrado_por = (select auth.uid()) and private.is_patient(paciente_id)
    and private.patient_area_consent(paciente_id));
create policy "patient manages own progress photos" on public.patient_progress_photo
  for all to authenticated using (registrado_por = (select auth.uid()) and private.is_patient(paciente_id))
  with check (registrado_por = (select auth.uid()) and private.is_patient(paciente_id)
    and private.patient_area_consent(paciente_id));
create policy "patient uploads own image" on storage.objects for insert to authenticated
  with check (bucket_id = 'patient-health-images' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
    and (storage.foldername(name))[3] = (select auth.uid())::text
    and private.is_patient(((storage.foldername(name))[2])::uuid)
    and private.patient_area_consent(((storage.foldername(name))[2])::uuid));

create or replace function public.consume_patient_photo_ai_call(p_paciente_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_allowed boolean;
begin
  if v_user is null or not private.is_patient(p_paciente_id)
    or not private.patient_area_consent(p_paciente_id) then return false; end if;
  select coalesce((select c.aceito from public.patient_consent_event c
    where c.paciente_id = p_paciente_id and c.user_id = v_user and c.finalidade = 'diario_foto_ia'
    order by c.created_at desc limit 1), false) into v_allowed;
  if not v_allowed then return false; end if;
  insert into public.patient_photo_ai_usage(user_id, usage_day, calls)
  values (v_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, usage_day) do update set calls = public.patient_photo_ai_usage.calls + 1
    where public.patient_photo_ai_usage.calls < 20;
  return found;
end;
$$;
revoke all on function public.consume_patient_photo_ai_call(uuid) from public, anon;
grant execute on function public.consume_patient_photo_ai_call(uuid) to authenticated;
