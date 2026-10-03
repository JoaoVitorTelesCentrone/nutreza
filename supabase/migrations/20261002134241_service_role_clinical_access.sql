-- Server-side administrative flows (including patient access provisioning) use
-- a secret service key. RLS bypass does not itself grant table privileges.
grant select on public.paciente to service_role;
grant select, insert on public.paciente_acesso to service_role;
