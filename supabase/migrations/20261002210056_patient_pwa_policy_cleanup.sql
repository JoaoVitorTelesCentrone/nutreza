drop policy "clinician reads measurements" on public.antropometria;
drop policy "patient reads own consultation measurements" on public.antropometria;
create policy "clinic staff and linked patient read measurements" on public.antropometria
  for select to authenticated using (private.has_role(clinica_id, array['admin', 'profissional']) or private.is_patient(paciente_id));

drop policy "patient reads own consent events" on public.patient_consent_event;
drop policy "clinical staff reads consent events" on public.patient_consent_event;
create policy "patient and clinic staff read consent events" on public.patient_consent_event
  for select to authenticated using ((user_id = (select auth.uid()) and private.is_patient(paciente_id))
    or private.has_role(clinica_id, array['admin', 'profissional']));

drop policy "patient pwa config staff manages" on public.patient_pwa_config;
drop policy "patient reads clinic photo analysis availability" on public.patient_pwa_config;
create policy "staff reads patient pwa config" on public.patient_pwa_config
  for select to authenticated using (private.has_role(clinica_id, array['admin', 'profissional']));
create policy "staff creates patient pwa config" on public.patient_pwa_config
  for insert to authenticated with check (private.has_role(clinica_id, array['admin', 'profissional']) and updated_by = (select auth.uid()));
create policy "staff updates patient pwa config" on public.patient_pwa_config
  for update to authenticated using (private.has_role(clinica_id, array['admin', 'profissional']))
  with check (private.has_role(clinica_id, array['admin', 'profissional']) and updated_by = (select auth.uid()));
create policy "patient reads clinic photo analysis availability" on public.patient_pwa_config
  for select to authenticated using (exists (select 1 from public.paciente_acesso a
    where a.clinica_id = patient_pwa_config.clinica_id and a.user_id = (select auth.uid())));

drop policy "patient manages own progress photos" on public.patient_progress_photo;
create policy "patient creates own progress photos" on public.patient_progress_photo
  for insert to authenticated with check (registrado_por = (select auth.uid()) and private.is_patient(paciente_id)
    and private.patient_area_consent(paciente_id));
create policy "patient updates own progress photos" on public.patient_progress_photo
  for update to authenticated using (registrado_por = (select auth.uid()) and private.is_patient(paciente_id))
  with check (registrado_por = (select auth.uid()) and private.is_patient(paciente_id)
    and private.patient_area_consent(paciente_id));
create policy "patient deletes own progress photos" on public.patient_progress_photo
  for delete to authenticated using (registrado_por = (select auth.uid()) and private.is_patient(paciente_id));

create or replace function public.financeiro_confirmar_recebimento(
  p_clinica uuid, p_evento_id text, p_evento text, p_pagamento_id text,
  p_referencia text, p_valor_centavos bigint, p_payload jsonb, p_refund_centavos bigint default null
) returns boolean language plpgsql security definer set search_path = '' as $$
declare c public.financeiro_cobranca%rowtype; compra public.financeiro_compra_pacote%rowtype; receipt_no bigint;
begin
  insert into public.financeiro_evento_psp(clinica_id, evento_provedor_id, pagamento_provedor_id, tipo, payload)
  values (p_clinica, p_evento_id, p_pagamento_id, p_evento, p_payload)
  on conflict (clinica_id, evento_provedor_id) do nothing;
  if not found then return false; end if;
  select * into c from public.financeiro_cobranca
    where clinica_id = p_clinica and referencia_externa = p_referencia for update;
  if c.id is null or c.valor_centavos <> p_valor_centavos or c.provedor <> 'asaas'
      or (c.pagamento_provedor_id is not null and c.pagamento_provedor_id <> p_pagamento_id) then
    update public.financeiro_evento_psp set estado = 'erro', erro_resumo = 'Cobranca ou valor nao corresponde'
      where clinica_id = p_clinica and evento_provedor_id = p_evento_id;
    return false;
  end if;
  if p_evento = 'PAYMENT_RECEIVED' and c.status in ('rascunho','pendente','vencida','cancelada') then
    insert into public.financeiro_recibo_contador(clinica_id, ultimo_numero) values (p_clinica, 1)
      on conflict (clinica_id) do update set ultimo_numero = public.financeiro_recibo_contador.ultimo_numero + 1
      returning ultimo_numero into receipt_no;
    update public.financeiro_cobranca set status = 'recebida', pagamento_provedor_id = p_pagamento_id,
      recebida_em = now(), recibo_numero = receipt_no, updated_at = now() where id = c.id;
    if c.pacote_id is not null then
      update public.financeiro_compra_pacote set expira_em = now() + make_interval(days => validade_dias)
        where cobranca_id = c.id and validade_dias is not null;
      select * into compra from public.financeiro_compra_pacote where cobranca_id = c.id for update;
      if compra.id is not null and not exists (select 1 from public.financeiro_credito where chave_idempotencia = 'grant:' || compra.id::text) then
        insert into public.financeiro_credito(clinica_id, compra_id, paciente_id, tipo, delta, chave_idempotencia)
        values (compra.clinica_id, compra.id, compra.paciente_id, 'concessao', compra.creditos, 'grant:' || compra.id::text);
      end if;
    end if;
  elsif p_evento in ('PAYMENT_PARTIALLY_REFUNDED','PAYMENT_REFUNDED') then
    declare r public.financeiro_estorno%rowtype; refund_amount bigint; available integer;
    begin
      select * into r from public.financeiro_estorno where cobranca_id = c.id and status = 'processando' for update;
      if r.id is null then
        update public.financeiro_evento_psp set estado = 'erro', erro_resumo = 'Estorno sem solicitacao local'
          where clinica_id = p_clinica and evento_provedor_id = p_evento_id;
        return false;
      end if;
      refund_amount := coalesce(p_refund_centavos, case when p_evento = 'PAYMENT_REFUNDED' then c.valor_centavos - c.devolvido_centavos else null end);
      if refund_amount <= 0 or refund_amount > c.valor_centavos - c.devolvido_centavos then
        update public.financeiro_evento_psp set estado = 'erro', erro_resumo = 'Valor de estorno invalido'
          where clinica_id = p_clinica and evento_provedor_id = p_evento_id;
        return false;
      end if;
      update public.financeiro_estorno set status = 'concluido', valor_centavos = refund_amount,
        referencia_provedor = coalesce(referencia_provedor, p_evento_id), concluido_em = now() where id = r.id;
      update public.financeiro_cobranca set devolvido_centavos = devolvido_centavos + refund_amount,
        status = case when devolvido_centavos + refund_amount >= valor_centavos then 'devolvida_total' else 'devolvida_parcial' end,
        updated_at = now() where id = c.id;
      if c.pacote_id is not null and c.devolvido_centavos + refund_amount >= c.valor_centavos then
        select coalesce(sum(fc.delta),0) into available from public.financeiro_credito fc
          join public.financeiro_compra_pacote cp on cp.id = fc.compra_id where cp.cobranca_id = c.id;
        if available > 0 then
          insert into public.financeiro_credito(clinica_id, compra_id, paciente_id, tipo, delta, chave_idempotencia)
          select cpa.clinica_id, cpa.id, cpa.paciente_id, 'estorno', -available, 'refund:' || r.id::text
          from public.financeiro_compra_pacote cpa where cpa.cobranca_id = c.id
          on conflict (chave_idempotencia) do nothing;
        end if;
      end if;
    end;
  elsif p_evento = 'PAYMENT_OVERDUE' and c.status = 'pendente' then
    update public.financeiro_cobranca set status = 'vencida', updated_at = now() where id = c.id;
  elsif p_evento = 'PAYMENT_REFUND_DENIED' then
    update public.financeiro_estorno set status = 'falhou'
      where cobranca_id = c.id and status = 'processando';
  end if;
  update public.financeiro_evento_psp set estado = 'processado', processado_em = now()
    where clinica_id = p_clinica and evento_provedor_id = p_evento_id;
  return true;
end;
$$;
revoke all on function public.financeiro_confirmar_recebimento(uuid,text,text,text,text,bigint,jsonb,bigint) from public, anon, authenticated;
grant execute on function public.financeiro_confirmar_recebimento(uuid,text,text,text,text,bigint,jsonb,bigint) to service_role;
