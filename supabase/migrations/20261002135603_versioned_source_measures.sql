alter table public.alimento_fonte add column medidas_sha256 text
  check (medidas_sha256 is null or medidas_sha256 ~ '^[0-9a-f]{64}$');

-- Global measures need a true unique key even though clinica_id is NULL.
create unique index alimento_medida_fonte_unique
  on public.alimento_medida (alimento_id, nome) where origem = 'fonte';
