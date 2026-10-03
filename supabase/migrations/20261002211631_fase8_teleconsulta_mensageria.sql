-- Phase 8: consented teleconsultation and auditable WhatsApp workflows.
-- Secrets, room access tokens and raw provider payloads are never stored here.

alter table public.agendamento add constraint agendamento_phase8_scope_unique unique (id, clinica_id);

create table public.teleconsulta_termo (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references public.clinica(id) on delete cascade,
  versao text not null check (char_length(btrim(versao)) between 1 and 80),
  conteudo text not null check (char_length(btrim(conteudo)) between 20 and 20000),
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado', 'arquivado')),
  criado_por uuid references auth.users(id),
  publicado_por uuid references auth.users(id),
  publicado_em timestamptz,
  created_at timestamptz not null default now(),
  unique nulls not distinct (clinica_id, versao),
  check ((status = 'publicado') = (publicado_em is not null))
);
create unique index teleconsulta_termo_current_idx on public.teleconsulta_termo(coalesce(clinica_id, '00000000-0000-0000-0000-000000000000'::uuid)) where status = 'publicado';
create index teleconsulta_termo_clinic_idx on public.teleconsulta_termo(clinica_id, status, publicado_em desc);

create table public.teleconsulta_sessao (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  agendamento_id uuid not null unique,
  paciente_id uuid not null,
  profissional_id uuid not null,
  provedor text not null check (provedor in ('livekit', 'simulado')),
  sala_ref text not null unique check (char_length(sala_ref) between 24 and 100),
  estado text not null default 'agendada' check (estado in ('agendada', 'em_andamento', 'encerrada', 'falhou', 'cancelada')),
  abre_em timestamptz not null,
  encerra_em timestamptz not null,
  criada_por uuid not null references auth.users(id),
  iniciada_em timestamptz,
  encerrada_em timestamptz,
  erro_codigo text check (char_length(erro_codigo) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (abre_em < encerra_em),
  foreign key (agendamento_id, clinica_id) references public.agendamento(id, clinica_id) on delete cascade,
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id) on delete cascade,
  foreign key (profissional_id, clinica_id) references public.perfil(user_id, clinica_id)
);
create index teleconsulta_sessao_patient_idx on public.teleconsulta_sessao(paciente_id, abre_em desc);
create index teleconsulta_sessao_clinic_idx on public.teleconsulta_sessao(clinica_id, estado, abre_em);

create table public.teleconsulta_aceite (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  sessao_id uuid not null references public.teleconsulta_sessao(id) on delete cascade,
  agendamento_id uuid not null,
  paciente_id uuid not null,
  user_id uuid not null references auth.users(id),
  termo_id uuid not null references public.teleconsulta_termo(id),
  aceito boolean not null,
  aceito_em timestamptz not null default now(),
  foreign key (agendamento_id, clinica_id) references public.agendamento(id, clinica_id) on delete cascade,
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id) on delete cascade,
  unique (sessao_id, termo_id, user_id)
);
create index teleconsulta_aceite_patient_idx on public.teleconsulta_aceite(paciente_id, aceito_em desc);

create table public.whatsapp_termo (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references public.clinica(id) on delete cascade,
  finalidade text not null check (finalidade in ('contato_whatsapp', 'checkin_whatsapp', 'conteudo_educativo_whatsapp')),
  versao text not null check (char_length(btrim(versao)) between 1 and 80),
  conteudo text not null check (char_length(btrim(conteudo)) between 20 and 12000),
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado', 'arquivado')),
  criado_por uuid references auth.users(id),
  publicado_por uuid references auth.users(id),
  publicado_em timestamptz,
  created_at timestamptz not null default now(),
  unique nulls not distinct (clinica_id, finalidade, versao),
  check ((status = 'publicado') = (publicado_em is not null))
);
create unique index whatsapp_termo_current_idx
  on public.whatsapp_termo(coalesce(clinica_id, '00000000-0000-0000-0000-000000000000'::uuid), finalidade)
  where status = 'publicado';

create table public.whatsapp_config (
  clinica_id uuid primary key references public.clinica(id) on delete cascade,
  provedor text not null default 'meta' check (provedor in ('meta', 'simulado')),
  ativo boolean not null default false,
  phone_number_id text,
  business_account_id text,
  telefone_exibicao text,
  graph_api_version text not null default 'v24.0' check (graph_api_version ~ '^v[0-9]+\\.[0-9]+$'),
  token_cifrado text,
  fuso_horario text not null default 'America/Sao_Paulo',
  janela_inicio time not null default '08:00',
  janela_fim time not null default '19:00',
  limite_diario integer not null default 100 check (limite_diario between 0 and 10000),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (janela_inicio < janela_fim),
  check ((provedor = 'simulado') or (not ativo) or (phone_number_id is not null and token_cifrado is not null))
);

create table public.whatsapp_template (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  finalidade text not null check (finalidade in ('lembrete_consulta', 'checkin', 'resposta_aprovada', 'escalonamento')),
  nome text not null check (nome ~ '^[a-z0-9_]{3,512}$'),
  idioma text not null default 'pt_BR',
  categoria text not null check (categoria in ('utility', 'marketing', 'authentication', 'service')),
  conteudo text not null check (char_length(btrim(conteudo)) between 1 and 4096),
  provedor_template_id text,
  status text not null default 'rascunho' check (status in ('rascunho', 'pendente', 'aprovado', 'rejeitado', 'pausado')),
  publicado_por uuid references auth.users(id),
  aprovado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinica_id, nome, idioma),
  unique (id, clinica_id)
);
create index whatsapp_template_active_idx on public.whatsapp_template(clinica_id, finalidade, status);

create table public.whatsapp_consent_event (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  paciente_id uuid not null,
  user_id uuid references auth.users(id),
  finalidade text not null check (finalidade in ('contato_whatsapp', 'checkin_whatsapp', 'conteudo_educativo_whatsapp')),
  termo_id uuid references public.whatsapp_termo(id),
  telefone_e164 text not null check (telefone_e164 ~ '^\\+[1-9][0-9]{7,14}$'),
  aceito boolean not null,
  versao_termo text not null check (char_length(versao_termo) between 1 and 80),
  origem text not null check (origem in ('pwa', 'painel_profissional', 'inbound_parar', 'inbound_reiniciar', 'importacao')),
  created_at timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id) on delete cascade,
  check (not aceito or termo_id is not null),
  unique (id, paciente_id, clinica_id)
);
create index whatsapp_consent_current_idx on public.whatsapp_consent_event(paciente_id, finalidade, created_at desc);

create table public.whatsapp_conversa (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  paciente_id uuid not null,
  telefone_e164 text not null check (telefone_e164 ~ '^\\+[1-9][0-9]{7,14}$'),
  aberta_em timestamptz not null default now(),
  ultima_mensagem_em timestamptz,
  janela_expira_em timestamptz,
  estado text not null default 'aberta' check (estado in ('aberta', 'encerrada', 'bloqueada')),
  created_at timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id) on delete cascade,
  unique (clinica_id, paciente_id, telefone_e164)
);
alter table public.whatsapp_conversa add constraint whatsapp_conversa_scope_unique unique (id, paciente_id, clinica_id);
create index whatsapp_conversa_clinic_activity_idx on public.whatsapp_conversa(clinica_id, ultima_mensagem_em desc);

create table public.whatsapp_mensagem (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  conversa_id uuid not null references public.whatsapp_conversa(id) on delete cascade,
  paciente_id uuid not null,
  direcao text not null check (direcao in ('entrada', 'saida')),
  tipo text not null check (tipo in ('texto', 'template', 'status')),
  conteudo text check (char_length(conteudo) <= 4096),
  finalidade text,
  template_id uuid,
  provedor_message_id text,
  status text not null check (status in ('recebida', 'enfileirada', 'enviada', 'entregue', 'lida', 'falhou', 'bloqueada')),
  erro_codigo text check (char_length(erro_codigo) <= 100),
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id) on delete cascade,
  foreign key (conversa_id, paciente_id, clinica_id) references public.whatsapp_conversa(id, paciente_id, clinica_id) on delete cascade,
  foreign key (template_id, clinica_id) references public.whatsapp_template(id, clinica_id),
  unique (provedor_message_id)
);
create index whatsapp_mensagem_conversation_idx on public.whatsapp_mensagem(conversa_id, criada_em desc);

create table public.whatsapp_webhook_event (
  id uuid primary key default gen_random_uuid(),
  provedor text not null check (provedor in ('meta', 'simulado')),
  evento_id text not null,
  tipo text not null,
  phone_number_id text,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  processado_em timestamptz,
  erro_codigo text check (char_length(erro_codigo) <= 100),
  recebido_em timestamptz not null default now(),
  unique (provedor, evento_id)
);

create table public.whatsapp_outbox (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  paciente_id uuid not null,
  conversa_id uuid not null references public.whatsapp_conversa(id) on delete cascade,
  mensagem_id uuid not null unique references public.whatsapp_mensagem(id) on delete cascade,
  finalidade text not null,
  consent_event_id uuid not null references public.whatsapp_consent_event(id),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 200),
  status text not null default 'pendente' check (status in ('pendente', 'processando', 'enviada', 'cancelada', 'erro')),
  tentativas integer not null default 0 check (tentativas >= 0),
  proxima_tentativa_em timestamptz not null default now(),
  bloqueada_em timestamptz,
  erro_codigo text check (char_length(erro_codigo) <= 100),
  created_at timestamptz not null default now(),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id) on delete cascade,
  foreign key (conversa_id, paciente_id, clinica_id) references public.whatsapp_conversa(id, paciente_id, clinica_id) on delete cascade,
  foreign key (consent_event_id, paciente_id, clinica_id) references public.whatsapp_consent_event(id, paciente_id, clinica_id),
  unique (clinica_id, idempotency_key)
);
create index whatsapp_outbox_pending_idx on public.whatsapp_outbox(proxima_tentativa_em, created_at)
  where status in ('pendente', 'processando');

create table public.whatsapp_escalacao (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  paciente_id uuid not null,
  conversa_id uuid not null references public.whatsapp_conversa(id) on delete cascade,
  mensagem_id uuid references public.whatsapp_mensagem(id) on delete set null,
  categoria text not null check (categoria in ('clinica', 'urgencia', 'ambigua', 'suporte', 'falha_operacional')),
  prioridade text not null default 'normal' check (prioridade in ('baixa', 'normal', 'alta', 'urgente')),
  estado text not null default 'pendente' check (estado in ('pendente', 'atribuida', 'resolvida', 'cancelada')),
  atribuida_a uuid references auth.users(id),
  criada_em timestamptz not null default now(),
  prazo_em timestamptz,
  resolvida_em timestamptz,
  resolvida_por uuid references auth.users(id),
  resolucao text check (char_length(resolucao) <= 2000),
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id) on delete cascade
);
create index whatsapp_escalacao_queue_idx on public.whatsapp_escalacao(clinica_id, estado, prioridade, criada_em desc);

create table public.whatsapp_checkin (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica(id) on delete cascade,
  paciente_id uuid not null,
  agendamento_id uuid,
  mensagem_id uuid references public.whatsapp_mensagem(id) on delete set null,
  finalidade text not null check (finalidade in ('lembrete_consulta', 'checkin')),
  chave_ocorrencia text not null check (char_length(chave_ocorrencia) between 12 and 200),
  resposta_codigo text check (resposta_codigo in ('sim', 'nao', 'ajuda', 'parar')),
  criada_em timestamptz not null default now(),
  respondida_em timestamptz,
  foreign key (paciente_id, clinica_id) references public.paciente(id, clinica_id) on delete cascade,
  foreign key (agendamento_id, clinica_id) references public.agendamento(id, clinica_id) on delete cascade,
  unique (clinica_id, paciente_id, chave_ocorrencia)
);

-- RLS: frontends may read only their own/clinic-scoped rows; writes are server mediated.
alter table public.teleconsulta_termo enable row level security;
alter table public.teleconsulta_sessao enable row level security;
alter table public.teleconsulta_aceite enable row level security;
alter table public.whatsapp_config enable row level security;
alter table public.whatsapp_termo enable row level security;
alter table public.whatsapp_template enable row level security;
alter table public.whatsapp_consent_event enable row level security;
alter table public.whatsapp_conversa enable row level security;
alter table public.whatsapp_mensagem enable row level security;
alter table public.whatsapp_webhook_event enable row level security;
alter table public.whatsapp_outbox enable row level security;
alter table public.whatsapp_escalacao enable row level security;
alter table public.whatsapp_checkin enable row level security;

revoke all on public.teleconsulta_termo, public.teleconsulta_sessao, public.teleconsulta_aceite,
  public.whatsapp_config, public.whatsapp_termo, public.whatsapp_template, public.whatsapp_consent_event,
  public.whatsapp_conversa, public.whatsapp_mensagem, public.whatsapp_webhook_event,
  public.whatsapp_outbox, public.whatsapp_escalacao, public.whatsapp_checkin from anon, authenticated;
grant select on public.teleconsulta_termo, public.teleconsulta_sessao, public.teleconsulta_aceite,
  public.whatsapp_termo, public.whatsapp_template, public.whatsapp_consent_event, public.whatsapp_conversa,
  public.whatsapp_mensagem, public.whatsapp_escalacao, public.whatsapp_checkin to authenticated;

create policy "teleconsulta terms published and current" on public.teleconsulta_termo
  for select to authenticated using (
    status = 'publicado' and (clinica_id is null or exists (
      select 1 from public.perfil p where p.clinica_id = teleconsulta_termo.clinica_id and p.user_id = (select auth.uid())
    ))
  );
create policy "teleconsult session patient or clinic staff reads" on public.teleconsulta_sessao
  for select to authenticated using (
    exists (select 1 from public.perfil p where p.clinica_id = teleconsulta_sessao.clinica_id and p.user_id = (select auth.uid())) or exists (
      select 1 from public.paciente_acesso pa where pa.paciente_id = teleconsulta_sessao.paciente_id and pa.user_id = (select auth.uid())
    )
  );
create policy "teleconsult acceptance patient or clinic staff reads" on public.teleconsulta_aceite
  for select to authenticated using (
    exists (select 1 from public.perfil p where p.clinica_id = teleconsulta_aceite.clinica_id and p.user_id = (select auth.uid())) or (user_id = (select auth.uid()) and exists (
      select 1 from public.paciente_acesso pa where pa.paciente_id = teleconsulta_aceite.paciente_id and pa.user_id = (select auth.uid())
    ))
  );
create policy "whatsapp templates clinic staff reads" on public.whatsapp_template
  for select to authenticated using (exists (
    select 1 from public.perfil p where p.clinica_id = whatsapp_template.clinica_id and p.user_id = (select auth.uid())
  ));
create policy "whatsapp terms published and current" on public.whatsapp_termo
  for select to authenticated using (
    status = 'publicado' and (clinica_id is null or exists (
      select 1 from public.perfil p where p.clinica_id = whatsapp_termo.clinica_id and p.user_id = (select auth.uid())
    ))
  );
create policy "whatsapp consent patient or clinic staff reads" on public.whatsapp_consent_event
  for select to authenticated using (
    exists (select 1 from public.perfil p where p.clinica_id = whatsapp_consent_event.clinica_id and p.user_id = (select auth.uid())) or (user_id = (select auth.uid()) and exists (
      select 1 from public.paciente_acesso pa where pa.paciente_id = whatsapp_consent_event.paciente_id and pa.user_id = (select auth.uid())
    ))
  );
create policy "whatsapp conversation clinic staff reads" on public.whatsapp_conversa
  for select to authenticated using (exists (
    select 1 from public.perfil p where p.clinica_id = whatsapp_conversa.clinica_id and p.user_id = (select auth.uid())
  ));
create policy "whatsapp messages clinical staff reads" on public.whatsapp_mensagem
  for select to authenticated using (
    exists (select 1 from public.perfil p where p.clinica_id = whatsapp_mensagem.clinica_id
      and p.user_id = (select auth.uid()) and p.papel in ('admin', 'profissional'))
  );
create policy "whatsapp escalations clinical staff reads" on public.whatsapp_escalacao
  for select to authenticated using (
    exists (select 1 from public.perfil p where p.clinica_id = whatsapp_escalacao.clinica_id
      and p.user_id = (select auth.uid()) and p.papel in ('admin', 'profissional'))
  );
create policy "whatsapp checkins clinic staff reads" on public.whatsapp_checkin
  for select to authenticated using (exists (
    select 1 from public.perfil p where p.clinica_id = whatsapp_checkin.clinica_id and p.user_id = (select auth.uid())
  ));

-- No client-facing session, consent, message, or outbox writes. Server code uses service role
-- only after independently checking claims, clinic membership, patient link, and latest consent.
grant all on public.teleconsulta_termo, public.teleconsulta_sessao, public.teleconsulta_aceite,
  public.whatsapp_config, public.whatsapp_termo, public.whatsapp_template, public.whatsapp_consent_event,
  public.whatsapp_conversa, public.whatsapp_mensagem, public.whatsapp_webhook_event,
  public.whatsapp_outbox, public.whatsapp_escalacao, public.whatsapp_checkin to service_role;
