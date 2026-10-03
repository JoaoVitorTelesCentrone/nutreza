create table public.financeiro_config (
  clinica_id uuid primary key references public.clinica(id) on delete cascade,
  provedor text not null default 'asaas' check (provedor = 'asaas'),
  ambiente text not null default 'sandbox' check (ambiente in ('sandbox', 'producao')),
  api_key_cifrada text not null,
  webhook_token_hash text not null unique,
  ativa boolean not null default false,
  updated_at timestamptz not null default now()
);
revoke all on public.financeiro_config from anon, authenticated;

create table public.financeiro_pacote (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 2 and 100),
  descricao text check (char_length(descricao) <= 500),
  valor_centavos bigint not null check (valor_centavos > 0),
  creditos integer not null check (creditos between 1 and 100),
  validade_dias integer check (validade_dias between 1 and 730),
  ativo boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (id, clinica_id)
);

alter table public.agendamento add constraint agendamento_id_clinica_unique unique (id, clinica_id);

create table public.financeiro_cliente_psp (
  clinica_id uuid not null,
  paciente_id uuid not null,
  cliente_provedor_id text not null,
  created_at timestamptz not null default now(),
  primary key (clinica_id, paciente_id),
  unique (clinica_id, cliente_provedor_id),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id)
);
alter table public.financeiro_cliente_psp enable row level security;
revoke all on public.financeiro_cliente_psp from anon, authenticated;

create table public.financeiro_cobranca (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id),
  paciente_id uuid not null,
  agendamento_id uuid,
  pacote_id uuid,
  valor_centavos bigint not null check (valor_centavos > 0),
  devolvido_centavos bigint not null default 0 check (devolvido_centavos >= 0 and devolvido_centavos <= valor_centavos),
  moeda text not null default 'BRL' check (moeda = 'BRL'),
  descricao text not null check (char_length(btrim(descricao)) between 2 and 200),
  referencia_externa text not null unique,
  provedor text not null default 'asaas' check (provedor = 'asaas'),
  pagamento_provedor_id text unique,
  status text not null default 'rascunho'
    check (status in ('rascunho','pendente','recebida','vencida','cancelada','devolvida_parcial','devolvida_total')),
  vencimento date not null,
  pix_copia_cola text,
  pix_qr_base64 text,
  recibo_numero bigint,
  recebida_em timestamptz,
  criada_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id),
  foreign key (agendamento_id, clinica_id) references public.agendamento(id, clinica_id),
  foreign key (pacote_id, clinica_id) references public.financeiro_pacote(id, clinica_id),
  check (pacote_id is null or agendamento_id is null),
  check ((status in ('recebida','devolvida_parcial','devolvida_total')) = (recebida_em is not null)),
  check (status <> 'devolvida_total' or devolvido_centavos = valor_centavos),
  unique (id, clinica_id)
);
create index financeiro_cobranca_clinica_status_idx on public.financeiro_cobranca(clinica_id, status, vencimento desc);
create index financeiro_cobranca_paciente_idx on public.financeiro_cobranca(clinica_id, paciente_id, created_at desc);
create unique index financeiro_cobranca_agendamento_unica_idx on public.financeiro_cobranca(agendamento_id)
  where agendamento_id is not null and status <> 'cancelada';
create unique index financeiro_cobranca_pacote_aberta_idx on public.financeiro_cobranca(clinica_id, paciente_id, pacote_id)
  where pacote_id is not null and status in ('rascunho','pendente');

create table public.financeiro_compra_pacote (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  paciente_id uuid not null,
  pacote_id uuid not null,
  cobranca_id uuid not null unique,
  creditos integer not null check (creditos > 0),
  validade_dias integer check (validade_dias between 1 and 730),
  expira_em timestamptz,
  created_at timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id),
  foreign key (pacote_id, clinica_id) references public.financeiro_pacote(id, clinica_id),
  foreign key (cobranca_id, clinica_id) references public.financeiro_cobranca(id, clinica_id),
  unique (id, clinica_id)
);

alter table public.agendamento add column pacote_compra_id uuid;
alter table public.agendamento add constraint agendamento_pacote_compra_fk
  foreign key (pacote_compra_id, clinica_id) references public.financeiro_compra_pacote(id, clinica_id);

create table public.financeiro_credito (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  compra_id uuid not null,
  paciente_id uuid not null,
  agendamento_id uuid,
  tipo text not null check (tipo in ('concessao','reserva','liberacao','consumo','estorno')),
  delta integer not null check (delta between -100 and 100),
  chave_idempotencia text not null unique,
  ator_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (compra_id, clinica_id) references public.financeiro_compra_pacote(id, clinica_id),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id),
  foreign key (agendamento_id, clinica_id) references public.agendamento(id, clinica_id),
  check ((tipo = 'concessao' and delta > 0) or (tipo = 'reserva' and delta = -1)
    or (tipo = 'liberacao' and delta = 1) or (tipo = 'consumo' and delta = 0)
    or (tipo = 'estorno' and delta < 0))
);
create index financeiro_credito_compra_idx on public.financeiro_credito(compra_id, created_at);

create table public.financeiro_estorno (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null,
  cobranca_id uuid not null,
  valor_centavos bigint not null check (valor_centavos > 0),
  motivo text not null check (char_length(btrim(motivo)) between 3 and 500),
  status text not null default 'solicitado' check (status in ('solicitado','processando','concluido','falhou')),
  referencia_provedor text unique,
  solicitado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  concluido_em timestamptz,
  foreign key (cobranca_id, clinica_id) references public.financeiro_cobranca(id, clinica_id),
  check ((status = 'concluido') = (concluido_em is not null))
);
create unique index financeiro_estorno_em_andamento_idx on public.financeiro_estorno(cobranca_id)
  where status in ('solicitado','processando');

create table public.financeiro_evento_psp (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id),
  evento_provedor_id text not null,
  pagamento_provedor_id text,
  tipo text not null,
  payload jsonb not null,
  estado text not null default 'recebido' check (estado in ('recebido','processado','ignorado','erro')),
  erro_resumo text,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz,
  unique (clinica_id, evento_provedor_id)
);

create table public.financeiro_recibo_contador (
  clinica_id uuid primary key references public.clinica(id) on delete cascade,
  ultimo_numero bigint not null default 0 check (ultimo_numero >= 0)
);
alter table public.financeiro_recibo_contador enable row level security;
revoke all on public.financeiro_recibo_contador from anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['financeiro_config','financeiro_pacote','financeiro_cobranca',
    'financeiro_compra_pacote','financeiro_credito','financeiro_estorno','financeiro_evento_psp'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

grant select, insert, update, delete on public.financeiro_pacote to authenticated;
grant select on public.financeiro_cobranca to authenticated;
grant select on public.financeiro_compra_pacote, public.financeiro_credito, public.financeiro_estorno to authenticated;
grant select, insert, update on public.financeiro_evento_psp to service_role;
grant all on public.financeiro_cliente_psp to service_role;
grant all on public.financeiro_pacote, public.financeiro_cobranca, public.financeiro_compra_pacote,
  public.financeiro_credito, public.financeiro_estorno, public.financeiro_evento_psp, public.financeiro_config to service_role;
grant all on public.financeiro_recibo_contador to service_role;

create policy financeiro_pacote_ler on public.financeiro_pacote for select to authenticated
  using (private.has_role(clinica_id, array['admin','profissional','recepcao']));
create policy financeiro_pacote_admin on public.financeiro_pacote for all to authenticated
  using (private.has_role(clinica_id, array['admin'])) with check (private.has_role(clinica_id, array['admin']));
create policy financeiro_cobranca_ler on public.financeiro_cobranca for select to authenticated
  using (private.has_role(clinica_id, array['admin','profissional','recepcao']));
create policy financeiro_compra_ler on public.financeiro_compra_pacote for select to authenticated
  using (private.has_role(clinica_id, array['admin','profissional','recepcao']));
create policy financeiro_credito_ler on public.financeiro_credito for select to authenticated
  using (private.has_role(clinica_id, array['admin','profissional','recepcao']));
create policy financeiro_estorno_ler on public.financeiro_estorno for select to authenticated
  using (private.has_role(clinica_id, array['admin','profissional','recepcao']));

create function public.financeiro_confirmar_recebimento(
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
      recebida_em = now(), recibo_numero = receipt_no, updated_at = now()
      where id = c.id;
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
          select compra.clinica_id, compra.id, compra.paciente_id, 'estorno', -available, 'refund:' || r.id::text
          from public.financeiro_compra_pacote compra where compra.cobranca_id = c.id
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

create function private.financeiro_reservar_credito()
returns trigger language plpgsql security definer set search_path = '' as $$
declare compra public.financeiro_compra_pacote%rowtype; saldo integer;
begin
  if tg_op = 'UPDATE' and old.pacote_compra_id is not null
      and new.pacote_compra_id is distinct from old.pacote_compra_id then
    raise exception 'Pacote vinculado ao agendamento nao pode ser trocado' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and old.pacote_compra_id is not distinct from new.pacote_compra_id then
    if old.status = new.status then return new; end if;
  end if;
  if tg_op = 'UPDATE' and old.pacote_compra_id is not null and new.status = 'cancelado'
      and old.status not in ('realizado','falta','cancelado') then
    insert into public.financeiro_credito(clinica_id, compra_id, paciente_id, agendamento_id, tipo, delta, chave_idempotencia)
    values (old.clinica_id, old.pacote_compra_id, old.paciente_id, old.id, 'liberacao', 1, 'release:' || old.id::text)
    on conflict (chave_idempotencia) do nothing;
  end if;
  if new.pacote_compra_id is not null and new.status not in ('cancelado') and
    (tg_op = 'INSERT' or old.pacote_compra_id is distinct from new.pacote_compra_id) then
    select * into compra from public.financeiro_compra_pacote
      where id = new.pacote_compra_id and clinica_id = new.clinica_id and paciente_id = new.paciente_id for update;
    if compra.id is null or compra.expira_em is not null and compra.expira_em <= now() or not exists (
      select 1 from public.financeiro_cobranca c where c.id = compra.cobranca_id and c.status = 'recebida'
    ) then raise exception 'Pacote indisponivel' using errcode = '22023'; end if;
    select coalesce(sum(delta),0) into saldo from public.financeiro_credito where compra_id = compra.id;
    if saldo <= 0 then raise exception 'Pacote sem creditos disponiveis' using errcode = '22023'; end if;
    insert into public.financeiro_credito(clinica_id, compra_id, paciente_id, agendamento_id, tipo, delta, chave_idempotencia)
    values (compra.clinica_id, compra.id, compra.paciente_id, new.id, 'reserva', -1, 'reserve:' || new.id::text)
    on conflict (chave_idempotencia) do nothing;
  end if;
  if tg_op = 'UPDATE' and old.pacote_compra_id is not null and new.pacote_compra_id is not null
    and old.pacote_compra_id is not distinct from new.pacote_compra_id and new.status in ('realizado','falta') then
    insert into public.financeiro_credito(clinica_id, compra_id, paciente_id, agendamento_id, tipo, delta, chave_idempotencia)
    values (new.clinica_id, new.pacote_compra_id, new.paciente_id, new.id, 'consumo', 0, 'consume:' || new.id::text)
    on conflict (chave_idempotencia) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.financeiro_reservar_credito() from public, anon, authenticated;
create trigger agendamento_financeiro_creditos before insert or update on public.agendamento
  for each row execute function private.financeiro_reservar_credito();

create trigger financeiro_pacote_audit after insert or update on public.financeiro_pacote
  for each row execute function private.audit_clinical_change();
create trigger financeiro_cobranca_audit after insert or update on public.financeiro_cobranca
  for each row execute function private.audit_clinical_change();
