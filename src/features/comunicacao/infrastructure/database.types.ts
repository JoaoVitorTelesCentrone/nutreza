import type { Database } from "@/shared/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Table<Row extends Record<string, unknown>> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
type IdRow = { id: string; clinica_id: string; created_at: string };

type Phase8Tables = {
  agendamento: Table<{ id: string; clinica_id: string; servico_id: string; profissional_id: string; paciente_id: string | null; nome_contato: string; inicio: string; fim: string; status: string; modalidade: string }>;
  agenda_servico: Table<{ id: string; clinica_id: string; profissional_id: string; nome: string; tipo: string; modalidade: string }>;
  teleconsulta_termo: Table<IdRow & { versao: string; conteudo: string; status: string; publicado_em: string | null }>;
  teleconsulta_sessao: Table<IdRow & { agendamento_id: string; paciente_id: string; profissional_id: string; provedor: string; sala_ref: string; estado: string; abre_em: string; encerra_em: string; criada_por: string; iniciada_em: string | null; encerrada_em: string | null; updated_at: string }>;
  teleconsulta_aceite: Table<IdRow & { sessao_id: string; agendamento_id: string; paciente_id: string; user_id: string; termo_id: string; aceito: boolean; aceito_em: string }>;
  whatsapp_termo: Table<IdRow & { finalidade: string; versao: string; conteudo: string; status: string; publicado_em: string | null }>;
  whatsapp_config: Table<{ clinica_id: string; provedor: string; ativo: boolean; phone_number_id: string | null; business_account_id: string | null; telefone_exibicao: string | null; graph_api_version: string; token_cifrado: string | null; fuso_horario: string; janela_inicio: string; janela_fim: string; limite_diario: number; updated_by: string | null; created_at: string; updated_at: string }>;
  whatsapp_template: Table<IdRow & { finalidade: string; nome: string; idioma: string; categoria: string; conteudo: string; provedor_template_id: string | null; status: string; publicado_por: string | null; aprovado_em: string | null; updated_at: string }>;
  whatsapp_consent_event: Table<IdRow & { paciente_id: string; user_id: string | null; finalidade: string; termo_id: string | null; telefone_e164: string; aceito: boolean; versao_termo: string; origem: string; source_event_id: string | null }>;
  whatsapp_paciente_telefone: Table<IdRow & { paciente_id: string; user_id: string; telefone_e164: string; verificado_em: string; revogado_em: string | null }>;
  whatsapp_phone_challenge: Table<IdRow & { paciente_id: string; user_id: string; token_hash: string; expires_at: string; consumed_at: string | null }>;
  whatsapp_conversa: Table<IdRow & { paciente_id: string; telefone_e164: string; ultima_mensagem_em: string | null; janela_expira_em: string | null; estado: string }>;
  whatsapp_mensagem: Table<IdRow & { conversa_id: string; paciente_id: string; direcao: string; tipo: string; conteudo: string | null; finalidade: string | null; template_id: string | null; provedor_message_id: string | null; status: string; erro_codigo: string | null; criada_em: string; atualizada_em: string; parametros_template: unknown[] }>;
  whatsapp_webhook_event: Table<{ id: string; provedor: string; evento_id: string; tipo: string; phone_number_id: string | null; payload_hash: string; processado_em: string | null; erro_codigo: string | null; recebido_em: string; estado: string; bloqueado_em: string | null }>;
  whatsapp_outbox: Table<IdRow & { paciente_id: string; conversa_id: string; mensagem_id: string; finalidade: string; consent_event_id: string; idempotency_key: string; status: string; tentativas: number; proxima_tentativa_em: string; bloqueada_em: string | null; erro_codigo: string | null }>;
  whatsapp_escalacao: Table<IdRow & { paciente_id: string; conversa_id: string; mensagem_id: string | null; categoria: string; prioridade: string; estado: string; atribuida_a: string | null; criada_em: string; prazo_em: string | null; resolvida_em: string | null; resolvida_por: string | null; resolucao: string | null; source_event_id: string | null }>;
  whatsapp_checkin: Table<IdRow & { paciente_id: string; agendamento_id: string | null; mensagem_id: string | null; finalidade: string; chave_ocorrencia: string; resposta_codigo: string | null; respondida_em: string | null }>;
};

export type Phase8Database = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Omit<Database["public"]["Tables"], keyof Phase8Tables> & Phase8Tables;
    Functions: Database["public"]["Functions"] & {
      publish_teleconsulta_termo: { Args: { p_clinica_id: string; p_versao: string; p_conteudo: string; p_user_id: string }; Returns: string };
      publish_whatsapp_termo: { Args: { p_clinica_id: string; p_finalidade: string; p_versao: string; p_conteudo: string; p_user_id: string }; Returns: string };
      queue_whatsapp_template: { Args: { p_clinica_id: string; p_paciente_id: string; p_template_id: string; p_finalidade: string; p_idempotency_key: string; p_parametros?: unknown }; Returns: string };
      claim_whatsapp_outbox: { Args: { p_limit?: number }; Returns: Phase8Tables["whatsapp_outbox"]["Row"][] };
      claim_whatsapp_webhook: { Args: { p_provedor: string; p_evento_id: string; p_tipo: string; p_phone_number_id: string | null; p_payload_hash: string }; Returns: boolean };
      consume_whatsapp_phone_challenge: { Args: { p_token_hash: string; p_telefone_e164: string }; Returns: Array<{ clinica_id: string; paciente_id: string; user_id: string }> };
    };
  };
};
export const withPhase8Tables = (client: SupabaseClient<Database>) => client as unknown as SupabaseClient<Phase8Database>;
