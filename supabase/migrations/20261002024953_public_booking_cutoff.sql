create or replace function private.public_booking_by_token(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', a.id, 'nome', a.nome_contato, 'inicio', a.inicio,
    'fim', a.fim, 'status', a.status, 'servico', s.nome, 'servico_id', s.id,
    'clinica', c.nome, 'slug', cfg.slug, 'timezone', cfg.timezone,
    'cancelamento_horas', cfg.cancelamento_horas,
    'pode_alterar', a.status in ('solicitado', 'confirmado')
      and a.inicio >= now() + make_interval(hours => cfg.cancelamento_horas))
  from public.agendamento a join public.agenda_servico s on s.id = a.servico_id
    join public.clinica c on c.id = a.clinica_id
    join public.agenda_config cfg on cfg.clinica_id = a.clinica_id
  where char_length(p_token) = 72 and a.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;
