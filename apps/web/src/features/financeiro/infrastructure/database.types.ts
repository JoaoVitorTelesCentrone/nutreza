import type { Database } from "@/shared/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Table<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type Charge = {
  id: string; clinica_id: string; paciente_id: string; agendamento_id: string | null; pacote_id: string | null;
  valor_centavos: number; devolvido_centavos: number; moeda: "BRL"; descricao: string; referencia_externa: string;
  provedor: "asaas"; pagamento_provedor_id: string | null;
  status: "rascunho" | "pendente" | "recebida" | "vencida" | "cancelada" | "devolvida_parcial" | "devolvida_total";
  vencimento: string; pix_copia_cola: string | null; pix_qr_base64: string | null; recibo_numero: number | null;
  recebida_em: string | null; criada_por: string; created_at: string; updated_at: string;
};
type Package = {
  id: string; clinica_id: string; nome: string; descricao: string | null; valor_centavos: number;
  creditos: number; validade_dias: number | null; ativo: boolean; created_by: string; created_at: string;
};
type Purchase = {
  id: string; clinica_id: string; paciente_id: string; pacote_id: string; cobranca_id: string;
  creditos: number; validade_dias: number | null; expira_em: string | null; created_at: string;
};
type Credit = {
  id: string; clinica_id: string; compra_id: string; paciente_id: string; agendamento_id: string | null;
  tipo: string; delta: number; chave_idempotencia: string; ator_id: string | null; created_at: string;
};
type Config = {
  clinica_id: string; provedor: "asaas"; ambiente: "sandbox" | "producao"; api_key_cifrada: string;
  webhook_token_hash: string; ativa: boolean; updated_at: string;
};
type ProviderCustomer = { clinica_id: string; paciente_id: string; cliente_provedor_id: string; created_at: string };
type Refund = {
  id: string; clinica_id: string; cobranca_id: string; valor_centavos: number; motivo: string;
  status: "solicitado" | "processando" | "concluido" | "falhou"; referencia_provedor: string | null;
  solicitado_por: string; created_at: string; concluido_em: string | null;
};
type ProviderEvent = {
  id: string; clinica_id: string; evento_provedor_id: string; pagamento_provedor_id: string | null;
  tipo: string; payload: unknown; estado: string; erro_resumo: string | null; recebido_em: string; processado_em: string | null;
};

type ExtraTables = {
  financeiro_config: Table<Config>;
  financeiro_cliente_psp: Table<ProviderCustomer>;
  financeiro_pacote: Table<Package>;
  financeiro_cobranca: Table<Charge>;
  financeiro_compra_pacote: Table<Purchase>;
  financeiro_credito: Table<Credit>;
  financeiro_estorno: Table<Refund>;
  financeiro_evento_psp: Table<ProviderEvent>;
  financeiro_recibo_contador: Table<{ clinica_id: string; ultimo_numero: number }>;
};

export type FinanceDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & ExtraTables & {
      agendamento: Database["public"]["Tables"]["agendamento"] & {
        Row: Database["public"]["Tables"]["agendamento"]["Row"] & { pacote_compra_id: string | null };
        Insert: Database["public"]["Tables"]["agendamento"]["Insert"] & { pacote_compra_id?: string | null };
        Update: Database["public"]["Tables"]["agendamento"]["Update"] & { pacote_compra_id?: string | null };
      };
    };
    Functions: Database["public"]["Functions"] & {
      financeiro_confirmar_recebimento: {
        Args: { p_clinica: string; p_evento_id: string; p_evento: string; p_pagamento_id: string; p_referencia: string; p_valor_centavos: number; p_payload: unknown; p_refund_centavos?: number | null };
        Returns: boolean;
      };
    };
  };
};

export function withFinanceTables(client: SupabaseClient<Database>) {
  return client as unknown as SupabaseClient<FinanceDatabase>;
}
