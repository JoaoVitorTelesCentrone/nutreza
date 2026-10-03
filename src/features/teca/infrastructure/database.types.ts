import type { Database } from "@/shared/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Table<Row extends Record<string, unknown>> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
export type TecaTask = "resumo" | "nota" | "plano";
export type Guard = { codigo: string; severidade: "critica" | "alerta"; mensagem: string; item?: string; resolvida?: boolean };
export type TecaConfig = { clinica_id: string; habilitada: boolean; provedor: "openai" | "simulado"; modelo: string; limite_geracoes_dia: number; limite_tokens: number; orcamento_centavos_mes: number; criado_por: string | null; atualizado_por: string | null; created_at: string; updated_at: string };
export type TecaSource = { id: string; clinica_id: string | null; titulo: string; origem: string; versao: string; conteudo: string; hash_conteudo: string; licenca: string | null; status: "rascunho" | "aprovada" | "revogada"; aprovado_por: string | null; aprovado_em: string | null; created_by: string; created_at: string; updated_at: string };
export type TecaChunk = { id: string; fonte_id: string; clinica_id: string | null; ordem: number; texto: string; created_at: string };
export type TecaExecution = { id: string; clinica_id: string; paciente_id: string; agendamento_id: string | null; plano_id: string | null; tarefa: TecaTask; estado: string; provedor: string; modelo: string; prompt_versao: string; contexto_hash: string; contexto_versao: unknown; resultado: unknown; erro_resumo: string | null; tokens_entrada: number | null; tokens_saida: number | null; custo_centavos: number; criado_por: string; created_at: string; completed_at: string | null };
export type TecaArtifact = { id: string; execucao_id: string; clinica_id: string; paciente_id: string; tipo: TecaTask; conteudo: Record<string, unknown>; fontes: unknown; guardas: Guard[]; estado: "rascunho" | "bloqueado" | "aprovado" | "descartado"; editado_em: string | null; aprovado_por: string | null; aprovado_em: string | null; created_at: string };
export type TecaDecision = { id: string; artefato_id: string; execucao_id: string; clinica_id: string; paciente_id: string; acao: string; justificativa: string | null; guardas: unknown; valor_antes: unknown; valor_depois: unknown; decidido_por: string; created_at: string };
export type TecaUsage = { id: string; clinica_id: string; usuario_id: string; execucao_id: string | null; tarefa: string; tokens_entrada: number; tokens_saida: number; custo_centavos: number; created_at: string };

type ExtraTables = {
  teca_config: Table<TecaConfig>;
  teca_fonte: Table<TecaSource>;
  teca_trecho: Table<TecaChunk>;
  teca_execucao: Table<TecaExecution>;
  teca_artefato: Table<TecaArtifact>;
  teca_decisao: Table<TecaDecision>;
  teca_uso: Table<TecaUsage>;
};

export type TecaDatabase = Omit<Database, "public"> & { public: Omit<Database["public"], "Tables"> & { Tables: Database["public"]["Tables"] & ExtraTables } };
export function withTecaTables(client: SupabaseClient<Database>) { return client as unknown as SupabaseClient<TecaDatabase>; }
