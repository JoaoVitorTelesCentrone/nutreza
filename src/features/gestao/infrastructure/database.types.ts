import type { Database } from "@/shared/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Table<Row extends Record<string, unknown>> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
type Base = { id: string; clinica_id: string; created_at: string };
type Tables = {
  saas_plano: Table<{ id: string; slug: string; nome: string; preco_mensal_centavos: number; limite_pacientes: number; limite_membros: number; limite_teca_mes: number; ativo: boolean; created_at: string }>;
  saas_assinatura: Table<Base & { plano_id: string; status: string; provedor: string; cliente_provedor_id: string | null; assinatura_provedor_id: string | null; periodo_inicio: string; periodo_fim: string; cancelar_ao_fim: boolean; updated_at: string }>;
  saas_evento_cobranca: Table<Base & { assinatura_id: string | null; provedor: string; evento_provedor_id: string; tipo: string; estado: string; payload_hash: string; erro_codigo: string | null }>;
  equipe_convite: Table<Base & { email: string; papel: string; nome: string; token_hash: string; criado_por: string; expira_em: string; aceito_em: string | null; revogado_em: string | null }>;
  biblioteca_item: Table<Base & { titulo: string; categoria: string; conteudo: string; status: string; versao: number; criado_por: string; publicado_por: string | null; publicado_em: string | null; updated_at: string }>;
  suporte_ticket: Table<Base & { aberto_por: string; assunto: string; descricao: string; prioridade: string; status: string; resolvido_em: string | null; updated_at: string }>;
  clinica_exportacao: Table<Base & { solicitado_por: string; status: string; arquivo_path: string | null; erro_codigo: string | null; expira_em: string | null; concluida_em: string | null }>;
};
export type ManagementDatabase = Omit<Database,"public"> & { public: Omit<Database["public"],"Tables"|"Functions"> & {
  Tables: Database["public"]["Tables"] & Tables;
  Functions: Database["public"]["Functions"] & { saas_usage_snapshot: { Args: { p_clinica_id: string }; Returns: { pacientes: number; membros: number; teca_mes: number; consultas_mes: number; receita_mes_centavos: number } } };
} };
export const withManagementTables = (client: SupabaseClient<Database>) => client as unknown as SupabaseClient<ManagementDatabase>;
