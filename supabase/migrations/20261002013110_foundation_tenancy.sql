create table public.clinica (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 2 and 120),
  created_by uuid not null unique references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.perfil (
  user_id uuid primary key references auth.users(id) on delete cascade,
  clinica_id uuid not null references public.clinica(id),
  nome text not null check (char_length(trim(nome)) between 2 and 120),
  papel text not null default 'admin' check (papel in ('admin', 'profissional', 'recepcao')),
  crn text,
  created_at timestamptz not null default now()
);

create index perfil_clinica_id_idx on public.perfil(clinica_id);

alter table public.clinica enable row level security;
alter table public.perfil enable row level security;

revoke all on public.clinica, public.perfil from anon, authenticated;
grant select, insert on public.clinica, public.perfil to authenticated;

create policy "owner reads clinic" on public.clinica
  for select to authenticated
  using (created_by = (select auth.uid()));

create policy "owner creates clinic" on public.clinica
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "member reads own profile" on public.perfil
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "owner creates own profile" on public.perfil
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and papel = 'admin'
    and exists (
      select 1 from public.clinica c
      where c.id = clinica_id and c.created_by = (select auth.uid())
    )
  );
