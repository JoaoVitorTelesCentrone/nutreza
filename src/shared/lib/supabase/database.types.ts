
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "agenda_bloqueio": {
                  Row: {
                    "ativo": boolean,"clinica_id": string,"created_at": string,"created_by": string,"fim": string,"id": string,"inicio": string,"motivo": string | null,"profissional_id": string
                  }
                  Insert: {
                    "ativo"?: boolean,"clinica_id": string,"created_at"?: string,"created_by": string,"fim": string,"id"?: string,"inicio": string,"motivo"?: string | null,"profissional_id": string
                  }
                  Update: {
                    "ativo"?: boolean,"clinica_id"?: string,"created_at"?: string,"created_by"?: string,"fim"?: string,"id"?: string,"inicio"?: string,"motivo"?: string | null,"profissional_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agenda_bloqueio_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agenda_bloqueio_profissional_id_clinica_id_fkey"
      columns: ["profissional_id","clinica_id"]
isOneToOne: false
      referencedRelation: "perfil"
      referencedColumns: ["user_id","clinica_id"]
    }
                  ]
                },"agenda_config": {
                  Row: {
                    "antecedencia_horas": number,"ativa": boolean,"cancelamento_horas": number,"clinica_id": string,"horizonte_dias": number,"slug": string,"timezone": string,"updated_at": string
                  }
                  Insert: {
                    "antecedencia_horas"?: number,"ativa"?: boolean,"cancelamento_horas"?: number,"clinica_id": string,"horizonte_dias"?: number,"slug": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "antecedencia_horas"?: number,"ativa"?: boolean,"cancelamento_horas"?: number,"clinica_id"?: string,"horizonte_dias"?: number,"slug"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agenda_config_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: true
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"agenda_disponibilidade": {
                  Row: {
                    "ativo": boolean,"clinica_id": string,"dia_semana": number,"fim_hora": string,"id": string,"inicio_hora": string,"profissional_id": string
                  }
                  Insert: {
                    "ativo"?: boolean,"clinica_id": string,"dia_semana": number,"fim_hora": string,"id"?: string,"inicio_hora": string,"profissional_id": string
                  }
                  Update: {
                    "ativo"?: boolean,"clinica_id"?: string,"dia_semana"?: number,"fim_hora"?: string,"id"?: string,"inicio_hora"?: string,"profissional_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agenda_disponibilidade_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agenda_disponibilidade_profissional_id_clinica_id_fkey"
      columns: ["profissional_id","clinica_id"]
isOneToOne: false
      referencedRelation: "perfil"
      referencedColumns: ["user_id","clinica_id"]
    }
                  ]
                },"agenda_notificacao": {
                  Row: {
                    "agendada_em": string,"agendamento_id": string,"bloqueada_em": string | null,"clinica_id": string,"created_at": string,"destinatario_email": string,"enviada_em": string | null,"erro_resumo": string | null,"id": string,"proxima_tentativa_em": string,"status": string,"tentativas": number,"tipo": string
                  }
                  Insert: {
                    "agendada_em": string,"agendamento_id": string,"bloqueada_em"?: string | null,"clinica_id": string,"created_at"?: string,"destinatario_email": string,"enviada_em"?: string | null,"erro_resumo"?: string | null,"id"?: string,"proxima_tentativa_em"?: string,"status"?: string,"tentativas"?: number,"tipo": string
                  }
                  Update: {
                    "agendada_em"?: string,"agendamento_id"?: string,"bloqueada_em"?: string | null,"clinica_id"?: string,"created_at"?: string,"destinatario_email"?: string,"enviada_em"?: string | null,"erro_resumo"?: string | null,"id"?: string,"proxima_tentativa_em"?: string,"status"?: string,"tentativas"?: number,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agenda_notificacao_agendamento_id_fkey"
      columns: ["agendamento_id"]
isOneToOne: false
      referencedRelation: "agendamento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agenda_notificacao_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"agenda_servico": {
                  Row: {
                    "ativo": boolean,"clinica_id": string,"created_at": string,"duracao_minutos": number,"id": string,"intervalo_minutos": number,"nome": string,"profissional_id": string,"tipo": string
                  }
                  Insert: {
                    "ativo"?: boolean,"clinica_id": string,"created_at"?: string,"duracao_minutos"?: number,"id"?: string,"intervalo_minutos"?: number,"nome": string,"profissional_id": string,"tipo": string
                  }
                  Update: {
                    "ativo"?: boolean,"clinica_id"?: string,"created_at"?: string,"duracao_minutos"?: number,"id"?: string,"intervalo_minutos"?: number,"nome"?: string,"profissional_id"?: string,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agenda_servico_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agenda_servico_profissional_id_clinica_id_fkey"
      columns: ["profissional_id","clinica_id"]
isOneToOne: false
      referencedRelation: "perfil"
      referencedColumns: ["user_id","clinica_id"]
    }
                  ]
                },"agendamento": {
                  Row: {
                    "clinica_id": string,"created_at": string,"created_by": string | null,"email_contato": string | null,"fim": string,"id": string,"inicio": string,"intervalo_minutos": number,"lembretes_email": boolean,"nome_contato": string,"observacao": string | null,"ocupado_ate": string,"origem": string,"paciente_id": string | null,"profissional_id": string,"servico_id": string,"status": string,"telefone_contato": string | null,"token_hash": string | null,"updated_at": string
                  }
                  Insert: {
                    "clinica_id": string,"created_at"?: string,"created_by"?: string | null,"email_contato"?: string | null,"fim": string,"id"?: string,"inicio": string,"intervalo_minutos": number,"lembretes_email"?: boolean,"nome_contato": string,"observacao"?: string | null,"ocupado_ate"?: string,"origem": string,"paciente_id"?: string | null,"profissional_id": string,"servico_id": string,"status": string,"telefone_contato"?: string | null,"token_hash"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "clinica_id"?: string,"created_at"?: string,"created_by"?: string | null,"email_contato"?: string | null,"fim"?: string,"id"?: string,"inicio"?: string,"intervalo_minutos"?: number,"lembretes_email"?: boolean,"nome_contato"?: string,"observacao"?: string | null,"ocupado_ate"?: string,"origem"?: string,"paciente_id"?: string | null,"profissional_id"?: string,"servico_id"?: string,"status"?: string,"telefone_contato"?: string | null,"token_hash"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agendamento_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agendamento_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "agendamento_profissional_id_clinica_id_fkey"
      columns: ["profissional_id","clinica_id"]
isOneToOne: false
      referencedRelation: "perfil"
      referencedColumns: ["user_id","clinica_id"]
    },{
      foreignKeyName: "agendamento_servico_id_clinica_id_fkey"
      columns: ["servico_id","clinica_id"]
isOneToOne: false
      referencedRelation: "agenda_servico"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"alergia": {
                  Row: {
                    "ativo": boolean,"clinica_id": string,"created_at": string,"gravidade": string,"id": string,"observacao": string | null,"paciente_id": string,"registrado_por": string,"substancia": string,"updated_at": string
                  }
                  Insert: {
                    "ativo"?: boolean,"clinica_id": string,"created_at"?: string,"gravidade"?: string,"id"?: string,"observacao"?: string | null,"paciente_id": string,"registrado_por": string,"substancia": string,"updated_at"?: string
                  }
                  Update: {
                    "ativo"?: boolean,"clinica_id"?: string,"created_at"?: string,"gravidade"?: string,"id"?: string,"observacao"?: string | null,"paciente_id"?: string,"registrado_por"?: string,"substancia"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alergia_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"alimento": {
                  Row: {
                    "alergenicos": (string)[],"carboidrato_g_100g": number | null,"clinica_id": string | null,"codigo": string | null,"created_at": string,"created_by": string | null,"dados_ausentes": (string)[],"energia_kcal_100g": number | null,"fibra_g_100g": number | null,"fonte_id": string | null,"grupo": string | null,"id": string,"lipidios_g_100g": number | null,"nome": string,"proteina_g_100g": number | null,"sodio_mg_100g": number | null
                  }
                  Insert: {
                    "alergenicos"?: (string)[],"carboidrato_g_100g"?: number | null,"clinica_id"?: string | null,"codigo"?: string | null,"created_at"?: string,"created_by"?: string | null,"dados_ausentes"?: (string)[],"energia_kcal_100g"?: number | null,"fibra_g_100g"?: number | null,"fonte_id"?: string | null,"grupo"?: string | null,"id"?: string,"lipidios_g_100g"?: number | null,"nome": string,"proteina_g_100g"?: number | null,"sodio_mg_100g"?: number | null
                  }
                  Update: {
                    "alergenicos"?: (string)[],"carboidrato_g_100g"?: number | null,"clinica_id"?: string | null,"codigo"?: string | null,"created_at"?: string,"created_by"?: string | null,"dados_ausentes"?: (string)[],"energia_kcal_100g"?: number | null,"fibra_g_100g"?: number | null,"fonte_id"?: string | null,"grupo"?: string | null,"id"?: string,"lipidios_g_100g"?: number | null,"nome"?: string,"proteina_g_100g"?: number | null,"sodio_mg_100g"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "alimento_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alimento_fonte_id_fkey"
      columns: ["fonte_id"]
isOneToOne: false
      referencedRelation: "alimento_fonte"
      referencedColumns: ["id"]
    }
                  ]
                },"alimento_fonte": {
                  Row: {
                    "arquivo_sha256": string,"atribuicao": string,"autorizacao_ref": string | null,"id": string,"importado_em": string,"licenca": string,"medidas_sha256": string | null,"nome": string,"normalizado_sha256": string,"referencia_url": string,"versao": string
                  }
                  Insert: {
                    "arquivo_sha256": string,"atribuicao": string,"autorizacao_ref"?: string | null,"id"?: string,"importado_em"?: string,"licenca": string,"medidas_sha256"?: string | null,"nome": string,"normalizado_sha256": string,"referencia_url": string,"versao": string
                  }
                  Update: {
                    "arquivo_sha256"?: string,"atribuicao"?: string,"autorizacao_ref"?: string | null,"id"?: string,"importado_em"?: string,"licenca"?: string,"medidas_sha256"?: string | null,"nome"?: string,"normalizado_sha256"?: string,"referencia_url"?: string,"versao"?: string
                  }
                  Relationships: [
                    
                  ]
                },"alimento_medida": {
                  Row: {
                    "alimento_id": string,"clinica_id": string | null,"created_by": string | null,"gramas": number,"id": string,"nome": string,"origem": string
                  }
                  Insert: {
                    "alimento_id": string,"clinica_id"?: string | null,"created_by"?: string | null,"gramas": number,"id"?: string,"nome": string,"origem": string
                  }
                  Update: {
                    "alimento_id"?: string,"clinica_id"?: string | null,"created_by"?: string | null,"gramas"?: number,"id"?: string,"nome"?: string,"origem"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alimento_medida_alimento_id_fkey"
      columns: ["alimento_id"]
isOneToOne: false
      referencedRelation: "alimento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alimento_medida_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"anamnese": {
                  Row: {
                    "clinica_id": string,"created_at": string,"dados": NonNullable<Json>,"id": string,"paciente_id": string,"registrado_por": string,"versao": number
                  }
                  Insert: {
                    "clinica_id": string,"created_at"?: string,"dados": NonNullable<Json>,"id"?: string,"paciente_id": string,"registrado_por": string,"versao": number
                  }
                  Update: {
                    "clinica_id"?: string,"created_at"?: string,"dados"?: NonNullable<Json>,"id"?: string,"paciente_id"?: string,"registrado_por"?: string,"versao"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "anamnese_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"antropometria": {
                  Row: {
                    "altura_cm": number | null,"cintura_cm": number | null,"clinica_id": string,"created_at": string,"gordura_pct": number | null,"id": string,"massa_magra_kg": number | null,"medida_em": string,"observacao": string | null,"paciente_id": string,"peso_kg": number | null,"registrado_por": string
                  }
                  Insert: {
                    "altura_cm"?: number | null,"cintura_cm"?: number | null,"clinica_id": string,"created_at"?: string,"gordura_pct"?: number | null,"id"?: string,"massa_magra_kg"?: number | null,"medida_em": string,"observacao"?: string | null,"paciente_id": string,"peso_kg"?: number | null,"registrado_por": string
                  }
                  Update: {
                    "altura_cm"?: number | null,"cintura_cm"?: number | null,"clinica_id"?: string,"created_at"?: string,"gordura_pct"?: number | null,"id"?: string,"massa_magra_kg"?: number | null,"medida_em"?: string,"observacao"?: string | null,"paciente_id"?: string,"peso_kg"?: number | null,"registrado_por"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "antropometria_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "acao": string,"ator_id": string | null,"campos_alterados": (string)[],"clinica_id": string,"created_at": string,"entidade": string,"entidade_id": string,"id": string,"paciente_id": string | null
                  }
                  Insert: {
                    "acao": string,"ator_id"?: string | null,"campos_alterados"?: (string)[],"clinica_id": string,"created_at"?: string,"entidade": string,"entidade_id": string,"id"?: string,"paciente_id"?: string | null
                  }
                  Update: {
                    "acao"?: string,"ator_id"?: string | null,"campos_alterados"?: (string)[],"clinica_id"?: string,"created_at"?: string,"entidade"?: string,"entidade_id"?: string,"id"?: string,"paciente_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"clinica": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"nome": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"nome": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                },"documento": {
                  Row: {
                    "clinica_id": string,"created_at": string,"enviado_por": string,"id": string,"mime_type": string,"nome_original": string,"paciente_id": string,"status": string,"storage_path": string,"tamanho_bytes": number
                  }
                  Insert: {
                    "clinica_id": string,"created_at"?: string,"enviado_por": string,"id"?: string,"mime_type": string,"nome_original": string,"paciente_id": string,"status"?: string,"storage_path": string,"tamanho_bytes": number
                  }
                  Update: {
                    "clinica_id"?: string,"created_at"?: string,"enviado_por"?: string,"id"?: string,"mime_type"?: string,"nome_original"?: string,"paciente_id"?: string,"status"?: string,"storage_path"?: string,"tamanho_bytes"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "documento_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"evolucao": {
                  Row: {
                    "agendamento_id": string | null,"avaliacao": string,"clinica_id": string,"conduta": string,"consulta_em": string,"created_at": string,"id": string,"paciente_id": string,"queixa": string,"registrado_por": string,"serie_id": string,"versao": number
                  }
                  Insert: {
                    "agendamento_id"?: string | null,"avaliacao"?: string,"clinica_id": string,"conduta"?: string,"consulta_em": string,"created_at"?: string,"id"?: string,"paciente_id": string,"queixa"?: string,"registrado_por": string,"serie_id"?: string,"versao"?: number
                  }
                  Update: {
                    "agendamento_id"?: string | null,"avaliacao"?: string,"clinica_id"?: string,"conduta"?: string,"consulta_em"?: string,"created_at"?: string,"id"?: string,"paciente_id"?: string,"queixa"?: string,"registrado_por"?: string,"serie_id"?: string,"versao"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "evolucao_agendamento_id_fkey"
      columns: ["agendamento_id"]
isOneToOne: false
      referencedRelation: "agendamento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evolucao_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"paciente": {
                  Row: {
                    "cadastrado_por": string,"clinica_id": string,"created_at": string,"email": string | null,"id": string,"nascimento": string | null,"nome": string,"sexo": string | null,"status": string,"telefone": string | null,"updated_at": string
                  }
                  Insert: {
                    "cadastrado_por": string,"clinica_id": string,"created_at"?: string,"email"?: string | null,"id"?: string,"nascimento"?: string | null,"nome": string,"sexo"?: string | null,"status"?: string,"telefone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "cadastrado_por"?: string,"clinica_id"?: string,"created_at"?: string,"email"?: string | null,"id"?: string,"nascimento"?: string | null,"nome"?: string,"sexo"?: string | null,"status"?: string,"telefone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "paciente_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"paciente_acesso": {
                  Row: {
                    "clinica_id": string,"created_at": string,"paciente_id": string,"user_id": string,"vinculado_por": string
                  }
                  Insert: {
                    "clinica_id": string,"created_at"?: string,"paciente_id": string,"user_id": string,"vinculado_por": string
                  }
                  Update: {
                    "clinica_id"?: string,"created_at"?: string,"paciente_id"?: string,"user_id"?: string,"vinculado_por"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "paciente_acesso_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"patient_invite": {
                  Row: { "accepted_at": string | null,"accepted_by": string | null,"clinica_id": string,"created_at": string,"created_by": string,"email_normalizado": string,"expires_at": string,"id": string,"paciente_id": string,"revoked_at": string | null,"token_hash": string }
                  Insert: { "accepted_at"?: string | null,"accepted_by"?: string | null,"clinica_id": string,"created_at"?: string,"created_by": string,"email_normalizado": string,"expires_at": string,"id"?: string,"paciente_id": string,"revoked_at"?: string | null,"token_hash": string }
                  Update: { "accepted_at"?: string | null,"accepted_by"?: string | null,"clinica_id"?: string,"created_at"?: string,"created_by"?: string,"email_normalizado"?: string,"expires_at"?: string,"id"?: string,"paciente_id"?: string,"revoked_at"?: string | null,"token_hash"?: string }
                  Relationships: []
                },"patient_pwa_config": {
                  Row: { "clinica_id": string,"photo_ai_enabled": boolean,"updated_at": string,"updated_by": string | null }
                  Insert: { "clinica_id": string,"photo_ai_enabled"?: boolean,"updated_at"?: string,"updated_by"?: string | null }
                  Update: { "clinica_id"?: string,"photo_ai_enabled"?: boolean,"updated_at"?: string,"updated_by"?: string | null }
                  Relationships: []
                },"patient_consent_event": {
                  Row: { "aceito": boolean,"clinica_id": string,"created_at": string,"finalidade": string,"id": string,"paciente_id": string,"user_id": string,"versao_termo": string }
                  Insert: { "aceito": boolean,"clinica_id": string,"created_at"?: string,"finalidade": string,"id"?: string,"paciente_id": string,"user_id": string,"versao_termo": string }
                  Update: { "aceito"?: boolean,"clinica_id"?: string,"created_at"?: string,"finalidade"?: string,"id"?: string,"paciente_id"?: string,"user_id"?: string,"versao_termo"?: string }
                  Relationships: []
                },"patient_consent_term": {
                  Row: { "conteudo": string,"finalidade": string,"publicado_em": string,"versao": string }
                  Insert: { "conteudo": string,"finalidade": string,"publicado_em"?: string,"versao": string }
                  Update: { "conteudo"?: string,"finalidade"?: string,"publicado_em"?: string,"versao"?: string }
                  Relationships: []
                },"patient_progress": {
                  Row: { "client_entry_id": string,"clinica_id": string,"created_at": string,"id": string,"medida_em": string,"nota": string,"paciente_id": string,"peso_kg": number | null,"cintura_cm": number | null,"registrado_por": string,"updated_at": string,"versao": number }
                  Insert: { "client_entry_id": string,"clinica_id": string,"created_at"?: string,"id"?: string,"medida_em": string,"nota"?: string,"paciente_id": string,"peso_kg"?: number | null,"cintura_cm"?: number | null,"registrado_por": string,"updated_at"?: string,"versao"?: number }
                  Update: { "client_entry_id"?: string,"clinica_id"?: string,"created_at"?: string,"id"?: string,"medida_em"?: string,"nota"?: string,"paciente_id"?: string,"peso_kg"?: number | null,"cintura_cm"?: number | null,"registrado_por"?: string,"updated_at"?: string,"versao"?: number }
                  Relationships: []
                },"patient_diary_entry": {
                  Row: { "client_entry_id": string,"clinica_id": string,"compartilhado_com_profissional": boolean,"consumido_em": string,"created_at": string,"descricao": string,"excluido_em": string | null,"foto_path": string | null,"id": string,"itens": Json,"origem": string,"paciente_id": string,"refeicao": string,"registrado_por": string,"updated_at": string,"versao": number }
                  Insert: { "client_entry_id": string,"clinica_id": string,"compartilhado_com_profissional"?: boolean,"consumido_em": string,"created_at"?: string,"descricao"?: string,"excluido_em"?: string | null,"foto_path"?: string | null,"id"?: string,"itens"?: Json,"origem"?: string,"paciente_id": string,"refeicao": string,"registrado_por": string,"updated_at"?: string,"versao"?: number }
                  Update: { "client_entry_id"?: string,"clinica_id"?: string,"compartilhado_com_profissional"?: boolean,"consumido_em"?: string,"created_at"?: string,"descricao"?: string,"excluido_em"?: string | null,"foto_path"?: string | null,"id"?: string,"itens"?: Json,"origem"?: string,"paciente_id"?: string,"refeicao"?: string,"registrado_por"?: string,"updated_at"?: string,"versao"?: number }
                  Relationships: []
                },"patient_progress_photo": {
                  Row: { "client_entry_id": string,"clinica_id": string,"compartilhado_com_profissional": boolean,"created_at": string,"foto_path": string,"id": string,"paciente_id": string,"registrado_por": string,"tirada_em": string }
                  Insert: { "client_entry_id": string,"clinica_id": string,"compartilhado_com_profissional"?: boolean,"created_at"?: string,"foto_path": string,"id"?: string,"paciente_id": string,"registrado_por": string,"tirada_em": string }
                  Update: { "client_entry_id"?: string,"clinica_id"?: string,"compartilhado_com_profissional"?: boolean,"created_at"?: string,"foto_path"?: string,"id"?: string,"paciente_id"?: string,"registrado_por"?: string,"tirada_em"?: string }
                  Relationships: []
                },"patient_data_request": {
                  Row: { "clinica_id": string,"created_at": string,"id": string,"observacao": string,"paciente_id": string,"status": string,"tipo": string,"user_id": string }
                  Insert: { "clinica_id": string,"created_at"?: string,"id"?: string,"observacao"?: string,"paciente_id": string,"status"?: string,"tipo": string,"user_id": string }
                  Update: { "clinica_id"?: string,"created_at"?: string,"id"?: string,"observacao"?: string,"paciente_id"?: string,"status"?: string,"tipo"?: string,"user_id"?: string }
                  Relationships: []
                },"perfil": {
                  Row: {
                    "clinica_id": string,"created_at": string,"crn": string | null,"nome": string,"papel": string,"user_id": string
                  }
                  Insert: {
                    "clinica_id": string,"created_at"?: string,"crn"?: string | null,"nome": string,"papel"?: string,"user_id": string
                  }
                  Update: {
                    "clinica_id"?: string,"created_at"?: string,"crn"?: string | null,"nome"?: string,"papel"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "perfil_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"plano_alimentar": {
                  Row: {
                    "alergias_revisadas": boolean,"aprovado_em": string | null,"aprovado_por": string | null,"clinica_id": string,"created_at": string,"created_by": string,"id": string,"meta_carboidrato_g": number | null,"meta_energia_kcal": number | null,"meta_lipidios_g": number | null,"meta_proteina_g": number | null,"objetivo": string,"paciente_id": string,"serie_id": string,"status": string,"titulo": string,"updated_at": string,"versao": number
                  }
                  Insert: {
                    "alergias_revisadas"?: boolean,"aprovado_em"?: string | null,"aprovado_por"?: string | null,"clinica_id": string,"created_at"?: string,"created_by": string,"id"?: string,"meta_carboidrato_g"?: number | null,"meta_energia_kcal"?: number | null,"meta_lipidios_g"?: number | null,"meta_proteina_g"?: number | null,"objetivo"?: string,"paciente_id": string,"serie_id"?: string,"status"?: string,"titulo": string,"updated_at"?: string,"versao"?: number
                  }
                  Update: {
                    "alergias_revisadas"?: boolean,"aprovado_em"?: string | null,"aprovado_por"?: string | null,"clinica_id"?: string,"created_at"?: string,"created_by"?: string,"id"?: string,"meta_carboidrato_g"?: number | null,"meta_energia_kcal"?: number | null,"meta_lipidios_g"?: number | null,"meta_proteina_g"?: number | null,"objetivo"?: string,"paciente_id"?: string,"serie_id"?: string,"status"?: string,"titulo"?: string,"updated_at"?: string,"versao"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "plano_alimentar_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"plano_item": {
                  Row: {
                    "alimento_id": string | null,"clinica_id": string,"composicao_snapshot": NonNullable<Json>,"fonte_snapshot": NonNullable<Json>,"gramas": number,"id": string,"medida_id": string | null,"nome_snapshot": string,"nutrientes_snapshot": NonNullable<Json>,"observacao": string,"ordem": number,"paciente_id": string,"plano_id": string,"quantidade_medida": number | null,"receita_id": string | null,"refeicao_id": string,"substitui_item_id": string | null
                  }
                  Insert: {
                    "alimento_id"?: string | null,"clinica_id": string,"composicao_snapshot"?: NonNullable<Json>,"fonte_snapshot"?: NonNullable<Json>,"gramas": number,"id"?: string,"medida_id"?: string | null,"nome_snapshot"?: string,"nutrientes_snapshot"?: NonNullable<Json>,"observacao"?: string,"ordem": number,"paciente_id": string,"plano_id": string,"quantidade_medida"?: number | null,"receita_id"?: string | null,"refeicao_id": string,"substitui_item_id"?: string | null
                  }
                  Update: {
                    "alimento_id"?: string | null,"clinica_id"?: string,"composicao_snapshot"?: NonNullable<Json>,"fonte_snapshot"?: NonNullable<Json>,"gramas"?: number,"id"?: string,"medida_id"?: string | null,"nome_snapshot"?: string,"nutrientes_snapshot"?: NonNullable<Json>,"observacao"?: string,"ordem"?: number,"paciente_id"?: string,"plano_id"?: string,"quantidade_medida"?: number | null,"receita_id"?: string | null,"refeicao_id"?: string,"substitui_item_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "plano_item_alimento_id_fkey"
      columns: ["alimento_id"]
isOneToOne: false
      referencedRelation: "alimento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plano_item_medida_id_fkey"
      columns: ["medida_id"]
isOneToOne: false
      referencedRelation: "alimento_medida"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plano_item_receita_id_fkey"
      columns: ["receita_id"]
isOneToOne: false
      referencedRelation: "receita"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plano_item_refeicao_id_plano_id_clinica_id_paciente_id_fkey"
      columns: ["refeicao_id","plano_id","clinica_id","paciente_id"]
isOneToOne: false
      referencedRelation: "plano_refeicao"
      referencedColumns: ["id","plano_id","clinica_id","paciente_id"]
    },{
      foreignKeyName: "plano_item_substitui_item_id_fkey"
      columns: ["substitui_item_id"]
isOneToOne: false
      referencedRelation: "plano_item"
      referencedColumns: ["id"]
    }
                  ]
                },"plano_refeicao": {
                  Row: {
                    "clinica_id": string,"horario": string | null,"id": string,"nome": string,"ordem": number,"paciente_id": string,"plano_id": string
                  }
                  Insert: {
                    "clinica_id": string,"horario"?: string | null,"id"?: string,"nome": string,"ordem": number,"paciente_id": string,"plano_id": string
                  }
                  Update: {
                    "clinica_id"?: string,"horario"?: string | null,"id"?: string,"nome"?: string,"ordem"?: number,"paciente_id"?: string,"plano_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plano_refeicao_plano_id_clinica_id_paciente_id_fkey"
      columns: ["plano_id","clinica_id","paciente_id"]
isOneToOne: false
      referencedRelation: "plano_alimentar"
      referencedColumns: ["id","clinica_id","paciente_id"]
    }
                  ]
                },"receita": {
                  Row: {
                    "clinica_id": string,"created_at": string,"created_by": string,"id": string,"nome": string,"preparo": string,"rendimento_g": number
                  }
                  Insert: {
                    "clinica_id": string,"created_at"?: string,"created_by": string,"id"?: string,"nome": string,"preparo"?: string,"rendimento_g": number
                  }
                  Update: {
                    "clinica_id"?: string,"created_at"?: string,"created_by"?: string,"id"?: string,"nome"?: string,"preparo"?: string,"rendimento_g"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "receita_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"receita_ingrediente": {
                  Row: {
                    "alimento_id": string,"clinica_id": string,"gramas": number,"id": string,"ordem": number,"receita_id": string
                  }
                  Insert: {
                    "alimento_id": string,"clinica_id": string,"gramas": number,"id"?: string,"ordem"?: number,"receita_id": string
                  }
                  Update: {
                    "alimento_id"?: string,"clinica_id"?: string,"gramas"?: number,"id"?: string,"ordem"?: number,"receita_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "receita_ingrediente_alimento_id_fkey"
      columns: ["alimento_id"]
isOneToOne: false
      referencedRelation: "alimento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "receita_ingrediente_receita_id_clinica_id_fkey"
      columns: ["receita_id","clinica_id"]
isOneToOne: false
      referencedRelation: "receita"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "agenda_horarios":
{ Args: { "p_dia": string,"p_servico": string,"p_slug": string }; Returns: {
              "fim": string,"inicio": string
            }[]
                           },
"agenda_horarios_internos":
{ Args: { "p_dia": string,"p_servico": string }; Returns: {
              "fim": string,"inicio": string
            }[]
                           },
"agenda_info":
{ Args: { "p_slug": string }; Returns: Json
                           },
"agendamento_publico":
{ Args: { "p_token": string }; Returns: Json
                           },
"agendar_publico":
{ Args: { "p_email": string,"p_inicio": string,"p_lembretes": boolean,"p_nome": string,"p_servico": string,"p_slug": string,"p_telefone": string }; Returns: Json
                           },
"alterar_agendamento_publico":
{ Args: { "p_action": string,"p_inicio"?: string,"p_token": string }; Returns: Json
                           },
"claim_agenda_notifications":
{ Args: { "p_limit"?: number }; Returns: {
              "agendada_em": string,
"agendamento_id": string,
"bloqueada_em": string | null,
"clinica_id": string,
"created_at": string,
"destinatario_email": string,
"enviada_em": string | null,
"erro_resumo": string | null,
"id": string,
"proxima_tentativa_em": string,
"status": string,
"tentativas": number,
"tipo": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "agenda_notificacao"
        isOneToOne: false
        isSetofReturn: true
      } },
"clone_plan_revision":
{ Args: { "p_source": string }; Returns: string
                           },
"confirmar_agendamento":
{ Args: { "p_booking": string,"p_patient"?: string }; Returns: string
                           }
,
"accept_patient_invite":
{ Args: { "p_token_hash": string }; Returns: string
                           }
,
"consume_patient_photo_ai_call":
{ Args: { "p_paciente_id": string }; Returns: boolean
                           }
,
"patient_next_appointment":
{ Args: { "p_paciente_id": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
