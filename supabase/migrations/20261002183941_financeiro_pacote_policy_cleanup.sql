drop policy financeiro_pacote_admin on public.financeiro_pacote;
revoke insert, update, delete on public.financeiro_pacote from authenticated;
grant select on public.financeiro_pacote to authenticated;
