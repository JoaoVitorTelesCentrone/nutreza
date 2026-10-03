begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public','teleconsulta_sessao','teleconsultation sessions exist');
select has_table('public','teleconsulta_aceite','teleconsultation consent evidence exists');
select has_table('public','whatsapp_outbox','WhatsApp durable outbox exists');
select has_table('public','whatsapp_webhook_event','WhatsApp webhook replay protection exists');
select has_table('public','whatsapp_paciente_telefone','verified patient phone mapping exists');
select ok((select relrowsecurity from pg_class where oid='public.teleconsulta_sessao'::regclass),'teleconsultation RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.whatsapp_mensagem'::regclass),'message RLS enabled');
select ok(not has_table_privilege('anon','public.whatsapp_mensagem','SELECT'),'anonymous cannot read WhatsApp messages');
select ok(not has_function_privilege('authenticated','public.queue_whatsapp_template(uuid,uuid,uuid,text,text,jsonb)','EXECUTE'),'browser cannot enqueue provider messages');
select ok(not has_function_privilege('authenticated','public.consume_whatsapp_phone_challenge(text,text)','EXECUTE'),'browser cannot consume phone challenges');

select has_table('public','saas_plano','commercial plan catalog exists');
select has_table('public','saas_assinatura','clinic subscriptions exist');
select has_table('public','equipe_convite','team invites exist');
select has_table('public','biblioteca_item','reviewed clinic library exists');
select has_table('public','suporte_ticket','support tickets exist');
select ok((select relrowsecurity from pg_class where oid='public.saas_assinatura'::regclass),'subscriptions have RLS');
select ok((select relrowsecurity from pg_class where oid='public.equipe_convite'::regclass),'team invites have RLS');
select ok(not has_table_privilege('anon','public.saas_assinatura','SELECT'),'anonymous cannot read subscriptions');

select has_table('public','platform_feature_flag','release feature flags exist');
select has_table('public','operational_incident','incident register exists');
select ok((select relrowsecurity from pg_class where oid='public.operational_incident'::regclass),'incident register has RLS');
select ok(not has_table_privilege('anon','public.operational_incident','SELECT'),'anonymous cannot read incidents');

select * from finish();
rollback;
