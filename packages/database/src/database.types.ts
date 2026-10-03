
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "public": {
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
                    "ativo": boolean,"clinica_id": string,"created_at": string,"duracao_minutos": number,"id": string,"intervalo_minutos": number,"modalidade": string,"nome": string,"profissional_id": string,"tipo": string
                  }
                  Insert: {
                    "ativo"?: boolean,"clinica_id": string,"created_at"?: string,"duracao_minutos"?: number,"id"?: string,"intervalo_minutos"?: number,"modalidade"?: string,"nome": string,"profissional_id": string,"tipo": string
                  }
                  Update: {
                    "ativo"?: boolean,"clinica_id"?: string,"created_at"?: string,"duracao_minutos"?: number,"id"?: string,"intervalo_minutos"?: number,"modalidade"?: string,"nome"?: string,"profissional_id"?: string,"tipo"?: string
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
                    "clinica_id": string,"created_at": string,"created_by": string | null,"email_contato": string | null,"fim": string,"id": string,"inicio": string,"intervalo_minutos": number,"lembretes_email": boolean,"modalidade": string,"nome_contato": string,"observacao": string | null,"ocupado_ate": string,"origem": string,"paciente_id": string | null,"pacote_compra_id": string | null,"profissional_id": string,"servico_id": string,"status": string,"telefone_contato": string | null,"token_hash": string | null,"updated_at": string
                  }
                  Insert: {
                    "clinica_id": string,"created_at"?: string,"created_by"?: string | null,"email_contato"?: string | null,"fim": string,"id"?: string,"inicio": string,"intervalo_minutos": number,"lembretes_email"?: boolean,"modalidade"?: string,"nome_contato": string,"observacao"?: string | null,"ocupado_ate"?: string,"origem": string,"paciente_id"?: string | null,"pacote_compra_id"?: string | null,"profissional_id": string,"servico_id": string,"status": string,"telefone_contato"?: string | null,"token_hash"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "clinica_id"?: string,"created_at"?: string,"created_by"?: string | null,"email_contato"?: string | null,"fim"?: string,"id"?: string,"inicio"?: string,"intervalo_minutos"?: number,"lembretes_email"?: boolean,"modalidade"?: string,"nome_contato"?: string,"observacao"?: string | null,"ocupado_ate"?: string,"origem"?: string,"paciente_id"?: string | null,"pacote_compra_id"?: string | null,"profissional_id"?: string,"servico_id"?: string,"status"?: string,"telefone_contato"?: string | null,"token_hash"?: string | null,"updated_at"?: string
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
      foreignKeyName: "agendamento_pacote_compra_fk"
      columns: ["pacote_compra_id","clinica_id"]
isOneToOne: false
      referencedRelation: "financeiro_compra_pacote"
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
                },"biblioteca_item": {
                  Row: {
                    "categoria": string,"clinica_id": string,"conteudo": string,"created_at": string,"criado_por": string,"id": string,"publicado_em": string | null,"publicado_por": string | null,"status": string,"titulo": string,"updated_at": string,"versao": number
                  }
                  Insert: {
                    "categoria": string,"clinica_id": string,"conteudo": string,"created_at"?: string,"criado_por": string,"id"?: string,"publicado_em"?: string | null,"publicado_por"?: string | null,"status"?: string,"titulo": string,"updated_at"?: string,"versao"?: number
                  }
                  Update: {
                    "categoria"?: string,"clinica_id"?: string,"conteudo"?: string,"created_at"?: string,"criado_por"?: string,"id"?: string,"publicado_em"?: string | null,"publicado_por"?: string | null,"status"?: string,"titulo"?: string,"updated_at"?: string,"versao"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "biblioteca_item_clinica_id_fkey"
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
                },"clinica_exportacao": {
                  Row: {
                    "arquivo_path": string | null,"clinica_id": string,"concluida_em": string | null,"created_at": string,"erro_codigo": string | null,"expira_em": string | null,"id": string,"solicitado_por": string,"status": string
                  }
                  Insert: {
                    "arquivo_path"?: string | null,"clinica_id": string,"concluida_em"?: string | null,"created_at"?: string,"erro_codigo"?: string | null,"expira_em"?: string | null,"id"?: string,"solicitado_por": string,"status"?: string
                  }
                  Update: {
                    "arquivo_path"?: string | null,"clinica_id"?: string,"concluida_em"?: string | null,"created_at"?: string,"erro_codigo"?: string | null,"expira_em"?: string | null,"id"?: string,"solicitado_por"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clinica_exportacao_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
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
                },"equipe_convite": {
                  Row: {
                    "aceito_em": string | null,"clinica_id": string,"created_at": string,"criado_por": string,"email": string,"expira_em": string,"id": string,"nome": string,"papel": string,"revogado_em": string | null,"token_hash": string
                  }
                  Insert: {
                    "aceito_em"?: string | null,"clinica_id": string,"created_at"?: string,"criado_por": string,"email": string,"expira_em": string,"id"?: string,"nome": string,"papel": string,"revogado_em"?: string | null,"token_hash": string
                  }
                  Update: {
                    "aceito_em"?: string | null,"clinica_id"?: string,"created_at"?: string,"criado_por"?: string,"email"?: string,"expira_em"?: string,"id"?: string,"nome"?: string,"papel"?: string,"revogado_em"?: string | null,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "equipe_convite_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
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
                },"financeiro_cliente_psp": {
                  Row: {
                    "cliente_provedor_id": string,"clinica_id": string,"created_at": string,"paciente_id": string
                  }
                  Insert: {
                    "cliente_provedor_id": string,"clinica_id": string,"created_at"?: string,"paciente_id": string
                  }
                  Update: {
                    "cliente_provedor_id"?: string,"clinica_id"?: string,"created_at"?: string,"paciente_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "financeiro_cliente_psp_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"financeiro_cobranca": {
                  Row: {
                    "agendamento_id": string | null,"clinica_id": string,"created_at": string,"criada_por": string,"descricao": string,"devolvido_centavos": number,"id": string,"moeda": string,"paciente_id": string,"pacote_id": string | null,"pagamento_provedor_id": string | null,"pix_copia_cola": string | null,"pix_qr_base64": string | null,"provedor": string,"recebida_em": string | null,"recibo_numero": number | null,"referencia_externa": string,"status": string,"updated_at": string,"valor_centavos": number,"vencimento": string
                  }
                  Insert: {
                    "agendamento_id"?: string | null,"clinica_id": string,"created_at"?: string,"criada_por": string,"descricao": string,"devolvido_centavos"?: number,"id"?: string,"moeda"?: string,"paciente_id": string,"pacote_id"?: string | null,"pagamento_provedor_id"?: string | null,"pix_copia_cola"?: string | null,"pix_qr_base64"?: string | null,"provedor"?: string,"recebida_em"?: string | null,"recibo_numero"?: number | null,"referencia_externa": string,"status"?: string,"updated_at"?: string,"valor_centavos": number,"vencimento": string
                  }
                  Update: {
                    "agendamento_id"?: string | null,"clinica_id"?: string,"created_at"?: string,"criada_por"?: string,"descricao"?: string,"devolvido_centavos"?: number,"id"?: string,"moeda"?: string,"paciente_id"?: string,"pacote_id"?: string | null,"pagamento_provedor_id"?: string | null,"pix_copia_cola"?: string | null,"pix_qr_base64"?: string | null,"provedor"?: string,"recebida_em"?: string | null,"recibo_numero"?: number | null,"referencia_externa"?: string,"status"?: string,"updated_at"?: string,"valor_centavos"?: number,"vencimento"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "financeiro_cobranca_agendamento_id_clinica_id_fkey"
      columns: ["agendamento_id","clinica_id"]
isOneToOne: false
      referencedRelation: "agendamento"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "financeiro_cobranca_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financeiro_cobranca_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "financeiro_cobranca_pacote_id_clinica_id_fkey"
      columns: ["pacote_id","clinica_id"]
isOneToOne: false
      referencedRelation: "financeiro_pacote"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"financeiro_compra_pacote": {
                  Row: {
                    "clinica_id": string,"cobranca_id": string,"created_at": string,"creditos": number,"expira_em": string | null,"id": string,"paciente_id": string,"pacote_id": string,"validade_dias": number | null
                  }
                  Insert: {
                    "clinica_id": string,"cobranca_id": string,"created_at"?: string,"creditos": number,"expira_em"?: string | null,"id"?: string,"paciente_id": string,"pacote_id": string,"validade_dias"?: number | null
                  }
                  Update: {
                    "clinica_id"?: string,"cobranca_id"?: string,"created_at"?: string,"creditos"?: number,"expira_em"?: string | null,"id"?: string,"paciente_id"?: string,"pacote_id"?: string,"validade_dias"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "financeiro_compra_pacote_cobranca_id_clinica_id_fkey"
      columns: ["cobranca_id","clinica_id"]
isOneToOne: false
      referencedRelation: "financeiro_cobranca"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "financeiro_compra_pacote_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "financeiro_compra_pacote_pacote_id_clinica_id_fkey"
      columns: ["pacote_id","clinica_id"]
isOneToOne: false
      referencedRelation: "financeiro_pacote"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"financeiro_config": {
                  Row: {
                    "ambiente": string,"api_key_cifrada": string,"ativa": boolean,"clinica_id": string,"provedor": string,"updated_at": string,"webhook_token_hash": string
                  }
                  Insert: {
                    "ambiente"?: string,"api_key_cifrada": string,"ativa"?: boolean,"clinica_id": string,"provedor"?: string,"updated_at"?: string,"webhook_token_hash": string
                  }
                  Update: {
                    "ambiente"?: string,"api_key_cifrada"?: string,"ativa"?: boolean,"clinica_id"?: string,"provedor"?: string,"updated_at"?: string,"webhook_token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "financeiro_config_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: true
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"financeiro_credito": {
                  Row: {
                    "agendamento_id": string | null,"ator_id": string | null,"chave_idempotencia": string,"clinica_id": string,"compra_id": string,"created_at": string,"delta": number,"id": string,"paciente_id": string,"tipo": string
                  }
                  Insert: {
                    "agendamento_id"?: string | null,"ator_id"?: string | null,"chave_idempotencia": string,"clinica_id": string,"compra_id": string,"created_at"?: string,"delta": number,"id"?: string,"paciente_id": string,"tipo": string
                  }
                  Update: {
                    "agendamento_id"?: string | null,"ator_id"?: string | null,"chave_idempotencia"?: string,"clinica_id"?: string,"compra_id"?: string,"created_at"?: string,"delta"?: number,"id"?: string,"paciente_id"?: string,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "financeiro_credito_agendamento_id_clinica_id_fkey"
      columns: ["agendamento_id","clinica_id"]
isOneToOne: false
      referencedRelation: "agendamento"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "financeiro_credito_compra_id_clinica_id_fkey"
      columns: ["compra_id","clinica_id"]
isOneToOne: false
      referencedRelation: "financeiro_compra_pacote"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "financeiro_credito_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"financeiro_estorno": {
                  Row: {
                    "clinica_id": string,"cobranca_id": string,"concluido_em": string | null,"created_at": string,"id": string,"motivo": string,"referencia_provedor": string | null,"solicitado_por": string,"status": string,"valor_centavos": number
                  }
                  Insert: {
                    "clinica_id": string,"cobranca_id": string,"concluido_em"?: string | null,"created_at"?: string,"id"?: string,"motivo": string,"referencia_provedor"?: string | null,"solicitado_por": string,"status"?: string,"valor_centavos": number
                  }
                  Update: {
                    "clinica_id"?: string,"cobranca_id"?: string,"concluido_em"?: string | null,"created_at"?: string,"id"?: string,"motivo"?: string,"referencia_provedor"?: string | null,"solicitado_por"?: string,"status"?: string,"valor_centavos"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "financeiro_estorno_cobranca_id_clinica_id_fkey"
      columns: ["cobranca_id","clinica_id"]
isOneToOne: false
      referencedRelation: "financeiro_cobranca"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"financeiro_evento_psp": {
                  Row: {
                    "clinica_id": string,"erro_resumo": string | null,"estado": string,"evento_provedor_id": string,"id": string,"pagamento_provedor_id": string | null,"payload": NonNullable<Json>,"processado_em": string | null,"recebido_em": string,"tipo": string
                  }
                  Insert: {
                    "clinica_id": string,"erro_resumo"?: string | null,"estado"?: string,"evento_provedor_id": string,"id"?: string,"pagamento_provedor_id"?: string | null,"payload": NonNullable<Json>,"processado_em"?: string | null,"recebido_em"?: string,"tipo": string
                  }
                  Update: {
                    "clinica_id"?: string,"erro_resumo"?: string | null,"estado"?: string,"evento_provedor_id"?: string,"id"?: string,"pagamento_provedor_id"?: string | null,"payload"?: NonNullable<Json>,"processado_em"?: string | null,"recebido_em"?: string,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "financeiro_evento_psp_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"financeiro_pacote": {
                  Row: {
                    "ativo": boolean,"clinica_id": string,"created_at": string,"created_by": string,"creditos": number,"descricao": string | null,"id": string,"nome": string,"validade_dias": number | null,"valor_centavos": number
                  }
                  Insert: {
                    "ativo"?: boolean,"clinica_id": string,"created_at"?: string,"created_by": string,"creditos": number,"descricao"?: string | null,"id"?: string,"nome": string,"validade_dias"?: number | null,"valor_centavos": number
                  }
                  Update: {
                    "ativo"?: boolean,"clinica_id"?: string,"created_at"?: string,"created_by"?: string,"creditos"?: number,"descricao"?: string | null,"id"?: string,"nome"?: string,"validade_dias"?: number | null,"valor_centavos"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "financeiro_pacote_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"financeiro_recibo_contador": {
                  Row: {
                    "clinica_id": string,"ultimo_numero": number
                  }
                  Insert: {
                    "clinica_id": string,"ultimo_numero"?: number
                  }
                  Update: {
                    "clinica_id"?: string,"ultimo_numero"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "financeiro_recibo_contador_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: true
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"operational_incident": {
                  Row: {
                    "categoria": string,"clinica_id": string | null,"created_at": string,"id": string,"reportado_por": string,"resolvido_em": string | null,"responsavel": string | null,"resumo": string,"severidade": string,"status": string,"titulo": string,"updated_at": string
                  }
                  Insert: {
                    "categoria": string,"clinica_id"?: string | null,"created_at"?: string,"id"?: string,"reportado_por": string,"resolvido_em"?: string | null,"responsavel"?: string | null,"resumo": string,"severidade": string,"status"?: string,"titulo": string,"updated_at"?: string
                  }
                  Update: {
                    "categoria"?: string,"clinica_id"?: string | null,"created_at"?: string,"id"?: string,"reportado_por"?: string,"resolvido_em"?: string | null,"responsavel"?: string | null,"resumo"?: string,"severidade"?: string,"status"?: string,"titulo"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "operational_incident_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
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
                },"paciente_profissional": {
                  Row: {
                    "ativo": boolean,"clinica_id": string,"created_at": string,"paciente_id": string,"principal": boolean,"profissional_id": string,"vinculado_por": string
                  }
                  Insert: {
                    "ativo"?: boolean,"clinica_id": string,"created_at"?: string,"paciente_id": string,"principal"?: boolean,"profissional_id": string,"vinculado_por": string
                  }
                  Update: {
                    "ativo"?: boolean,"clinica_id"?: string,"created_at"?: string,"paciente_id"?: string,"principal"?: boolean,"profissional_id"?: string,"vinculado_por"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "paciente_profissional_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"patient_consent_event": {
                  Row: {
                    "aceito": boolean,"clinica_id": string,"created_at": string,"finalidade": string,"id": string,"paciente_id": string,"user_id": string,"versao_termo": string
                  }
                  Insert: {
                    "aceito": boolean,"clinica_id": string,"created_at"?: string,"finalidade": string,"id"?: string,"paciente_id": string,"user_id": string,"versao_termo": string
                  }
                  Update: {
                    "aceito"?: boolean,"clinica_id"?: string,"created_at"?: string,"finalidade"?: string,"id"?: string,"paciente_id"?: string,"user_id"?: string,"versao_termo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "patient_consent_event_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"patient_consent_term": {
                  Row: {
                    "conteudo": string,"finalidade": string,"publicado_em": string,"versao": string
                  }
                  Insert: {
                    "conteudo": string,"finalidade": string,"publicado_em"?: string,"versao": string
                  }
                  Update: {
                    "conteudo"?: string,"finalidade"?: string,"publicado_em"?: string,"versao"?: string
                  }
                  Relationships: [

                  ]
                },"patient_data_request": {
                  Row: {
                    "clinica_id": string,"created_at": string,"id": string,"observacao": string,"paciente_id": string,"status": string,"tipo": string,"user_id": string
                  }
                  Insert: {
                    "clinica_id": string,"created_at"?: string,"id"?: string,"observacao"?: string,"paciente_id": string,"status"?: string,"tipo": string,"user_id": string
                  }
                  Update: {
                    "clinica_id"?: string,"created_at"?: string,"id"?: string,"observacao"?: string,"paciente_id"?: string,"status"?: string,"tipo"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "patient_data_request_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"patient_diary_entry": {
                  Row: {
                    "client_entry_id": string,"clinica_id": string,"compartilhado_com_profissional": boolean,"consumido_em": string,"created_at": string,"descricao": string,"excluido_em": string | null,"foto_path": string | null,"id": string,"itens": NonNullable<Json>,"origem": string,"paciente_id": string,"refeicao": string,"registrado_por": string,"updated_at": string,"versao": number
                  }
                  Insert: {
                    "client_entry_id": string,"clinica_id": string,"compartilhado_com_profissional"?: boolean,"consumido_em": string,"created_at"?: string,"descricao"?: string,"excluido_em"?: string | null,"foto_path"?: string | null,"id"?: string,"itens"?: NonNullable<Json>,"origem"?: string,"paciente_id": string,"refeicao": string,"registrado_por": string,"updated_at"?: string,"versao"?: number
                  }
                  Update: {
                    "client_entry_id"?: string,"clinica_id"?: string,"compartilhado_com_profissional"?: boolean,"consumido_em"?: string,"created_at"?: string,"descricao"?: string,"excluido_em"?: string | null,"foto_path"?: string | null,"id"?: string,"itens"?: NonNullable<Json>,"origem"?: string,"paciente_id"?: string,"refeicao"?: string,"registrado_por"?: string,"updated_at"?: string,"versao"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "patient_diary_entry_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"patient_invite": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"clinica_id": string,"created_at": string,"created_by": string,"email_normalizado": string,"expires_at": string,"id": string,"paciente_id": string,"revoked_at": string | null,"token_hash": string
                  }
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"clinica_id": string,"created_at"?: string,"created_by": string,"email_normalizado": string,"expires_at": string,"id"?: string,"paciente_id": string,"revoked_at"?: string | null,"token_hash": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"clinica_id"?: string,"created_at"?: string,"created_by"?: string,"email_normalizado"?: string,"expires_at"?: string,"id"?: string,"paciente_id"?: string,"revoked_at"?: string | null,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "patient_invite_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"patient_photo_ai_usage": {
                  Row: {
                    "calls": number,"usage_day": string,"user_id": string
                  }
                  Insert: {
                    "calls"?: number,"usage_day"?: string,"user_id": string
                  }
                  Update: {
                    "calls"?: number,"usage_day"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"patient_progress": {
                  Row: {
                    "cintura_cm": number | null,"client_entry_id": string,"clinica_id": string,"created_at": string,"id": string,"medida_em": string,"nota": string,"paciente_id": string,"peso_kg": number | null,"registrado_por": string,"updated_at": string,"versao": number
                  }
                  Insert: {
                    "cintura_cm"?: number | null,"client_entry_id": string,"clinica_id": string,"created_at"?: string,"id"?: string,"medida_em": string,"nota"?: string,"paciente_id": string,"peso_kg"?: number | null,"registrado_por": string,"updated_at"?: string,"versao"?: number
                  }
                  Update: {
                    "cintura_cm"?: number | null,"client_entry_id"?: string,"clinica_id"?: string,"created_at"?: string,"id"?: string,"medida_em"?: string,"nota"?: string,"paciente_id"?: string,"peso_kg"?: number | null,"registrado_por"?: string,"updated_at"?: string,"versao"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "patient_progress_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"patient_progress_photo": {
                  Row: {
                    "client_entry_id": string,"clinica_id": string,"compartilhado_com_profissional": boolean,"created_at": string,"foto_path": string,"id": string,"paciente_id": string,"registrado_por": string,"tirada_em": string
                  }
                  Insert: {
                    "client_entry_id": string,"clinica_id": string,"compartilhado_com_profissional"?: boolean,"created_at"?: string,"foto_path": string,"id"?: string,"paciente_id": string,"registrado_por": string,"tirada_em": string
                  }
                  Update: {
                    "client_entry_id"?: string,"clinica_id"?: string,"compartilhado_com_profissional"?: boolean,"created_at"?: string,"foto_path"?: string,"id"?: string,"paciente_id"?: string,"registrado_por"?: string,"tirada_em"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "patient_progress_photo_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"patient_pwa_config": {
                  Row: {
                    "clinica_id": string,"photo_ai_enabled": boolean,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "clinica_id": string,"photo_ai_enabled"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "clinica_id"?: string,"photo_ai_enabled"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "patient_pwa_config_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: true
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
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
                },"platform_feature_flag": {
                  Row: {
                    "chave": string,"clinica_id": string,"configuracao": NonNullable<Json>,"habilitada": boolean,"id": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "chave": string,"clinica_id": string,"configuracao"?: NonNullable<Json>,"habilitada"?: boolean,"id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "chave"?: string,"clinica_id"?: string,"configuracao"?: NonNullable<Json>,"habilitada"?: boolean,"id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "platform_feature_flag_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"questionario": {
                  Row: {
                    "clinica_id": string,"created_at": string,"criado_por": string,"descricao": string,"id": string,"status": string,"titulo": string,"updated_at": string
                  }
                  Insert: {
                    "clinica_id": string,"created_at"?: string,"criado_por": string,"descricao"?: string,"id"?: string,"status"?: string,"titulo": string,"updated_at"?: string
                  }
                  Update: {
                    "clinica_id"?: string,"created_at"?: string,"criado_por"?: string,"descricao"?: string,"id"?: string,"status"?: string,"titulo"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questionario_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"questionario_atribuicao": {
                  Row: {
                    "atribuida_por": string,"clinica_id": string,"created_at": string,"id": string,"iniciada_em": string | null,"paciente_id": string,"prazo_em": string | null,"respondida_em": string | null,"status": string,"versao_id": string
                  }
                  Insert: {
                    "atribuida_por": string,"clinica_id": string,"created_at"?: string,"id"?: string,"iniciada_em"?: string | null,"paciente_id": string,"prazo_em"?: string | null,"respondida_em"?: string | null,"status"?: string,"versao_id": string
                  }
                  Update: {
                    "atribuida_por"?: string,"clinica_id"?: string,"created_at"?: string,"id"?: string,"iniciada_em"?: string | null,"paciente_id"?: string,"prazo_em"?: string | null,"respondida_em"?: string | null,"status"?: string,"versao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questionario_atribuicao_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "questionario_atribuicao_versao_id_clinica_id_fkey"
      columns: ["versao_id","clinica_id"]
isOneToOne: false
      referencedRelation: "questionario_versao"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"questionario_opcao": {
                  Row: {
                    "clinica_id": string,"created_at": string,"id": string,"ordem": number,"questao_id": string,"rotulo": string,"valor": string
                  }
                  Insert: {
                    "clinica_id": string,"created_at"?: string,"id"?: string,"ordem": number,"questao_id": string,"rotulo": string,"valor": string
                  }
                  Update: {
                    "clinica_id"?: string,"created_at"?: string,"id"?: string,"ordem"?: number,"questao_id"?: string,"rotulo"?: string,"valor"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questionario_opcao_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questionario_opcao_questao_id_clinica_id_fkey"
      columns: ["questao_id","clinica_id"]
isOneToOne: false
      referencedRelation: "questionario_questao"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"questionario_questao": {
                  Row: {
                    "clinica_id": string,"configuracao": NonNullable<Json>,"created_at": string,"enunciado": string,"id": string,"obrigatoria": boolean,"ordem": number,"texto_ajuda": string | null,"tipo": string,"versao_id": string
                  }
                  Insert: {
                    "clinica_id": string,"configuracao"?: NonNullable<Json>,"created_at"?: string,"enunciado": string,"id"?: string,"obrigatoria"?: boolean,"ordem": number,"texto_ajuda"?: string | null,"tipo": string,"versao_id": string
                  }
                  Update: {
                    "clinica_id"?: string,"configuracao"?: NonNullable<Json>,"created_at"?: string,"enunciado"?: string,"id"?: string,"obrigatoria"?: boolean,"ordem"?: number,"texto_ajuda"?: string | null,"tipo"?: string,"versao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questionario_questao_versao_id_clinica_id_fkey"
      columns: ["versao_id","clinica_id"]
isOneToOne: false
      referencedRelation: "questionario_versao"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"questionario_resposta": {
                  Row: {
                    "atribuicao_id": string,"clinica_id": string,"created_at": string,"enviada_em": string | null,"id": string,"paciente_id": string,"respondida_por": string,"status": string,"updated_at": string,"versao_id": string
                  }
                  Insert: {
                    "atribuicao_id": string,"clinica_id": string,"created_at"?: string,"enviada_em"?: string | null,"id"?: string,"paciente_id": string,"respondida_por": string,"status"?: string,"updated_at"?: string,"versao_id": string
                  }
                  Update: {
                    "atribuicao_id"?: string,"clinica_id"?: string,"created_at"?: string,"enviada_em"?: string | null,"id"?: string,"paciente_id"?: string,"respondida_por"?: string,"status"?: string,"updated_at"?: string,"versao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questionario_resposta_atribuicao_id_versao_id_paciente_id__fkey"
      columns: ["atribuicao_id","versao_id","paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "questionario_atribuicao"
      referencedColumns: ["id","versao_id","paciente_id","clinica_id"]
    }
                  ]
                },"questionario_resposta_item": {
                  Row: {
                    "clinica_id": string,"created_at": string,"id": string,"opcao_ids": (string)[],"paciente_id": string,"questao_id": string,"resposta_id": string,"updated_at": string,"valor_data": string | null,"valor_numero": number | null,"valor_texto": string | null,"versao_id": string
                  }
                  Insert: {
                    "clinica_id": string,"created_at"?: string,"id"?: string,"opcao_ids"?: (string)[],"paciente_id": string,"questao_id": string,"resposta_id": string,"updated_at"?: string,"valor_data"?: string | null,"valor_numero"?: number | null,"valor_texto"?: string | null,"versao_id": string
                  }
                  Update: {
                    "clinica_id"?: string,"created_at"?: string,"id"?: string,"opcao_ids"?: (string)[],"paciente_id"?: string,"questao_id"?: string,"resposta_id"?: string,"updated_at"?: string,"valor_data"?: string | null,"valor_numero"?: number | null,"valor_texto"?: string | null,"versao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questionario_resposta_item_questao_id_versao_id_clinica_id_fkey"
      columns: ["questao_id","versao_id","clinica_id"]
isOneToOne: false
      referencedRelation: "questionario_questao"
      referencedColumns: ["id","versao_id","clinica_id"]
    },{
      foreignKeyName: "questionario_resposta_item_resposta_id_versao_id_paciente__fkey"
      columns: ["resposta_id","versao_id","paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "questionario_resposta"
      referencedColumns: ["id","versao_id","paciente_id","clinica_id"]
    }
                  ]
                },"questionario_versao": {
                  Row: {
                    "clinica_id": string,"created_at": string,"id": string,"numero": number,"publicada_em": string | null,"publicada_por": string | null,"questionario_id": string,"status": string
                  }
                  Insert: {
                    "clinica_id": string,"created_at"?: string,"id"?: string,"numero": number,"publicada_em"?: string | null,"publicada_por"?: string | null,"questionario_id": string,"status"?: string
                  }
                  Update: {
                    "clinica_id"?: string,"created_at"?: string,"id"?: string,"numero"?: number,"publicada_em"?: string | null,"publicada_por"?: string | null,"questionario_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questionario_versao_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questionario_versao_questionario_id_clinica_id_fkey"
      columns: ["questionario_id","clinica_id"]
isOneToOne: false
      referencedRelation: "questionario"
      referencedColumns: ["id","clinica_id"]
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
                },"saas_assinatura": {
                  Row: {
                    "assinatura_provedor_id": string | null,"cancelar_ao_fim": boolean,"cliente_provedor_id": string | null,"clinica_id": string,"created_at": string,"id": string,"periodo_fim": string,"periodo_inicio": string,"plano_id": string,"provedor": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "assinatura_provedor_id"?: string | null,"cancelar_ao_fim"?: boolean,"cliente_provedor_id"?: string | null,"clinica_id": string,"created_at"?: string,"id"?: string,"periodo_fim"?: string,"periodo_inicio"?: string,"plano_id": string,"provedor"?: string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "assinatura_provedor_id"?: string | null,"cancelar_ao_fim"?: boolean,"cliente_provedor_id"?: string | null,"clinica_id"?: string,"created_at"?: string,"id"?: string,"periodo_fim"?: string,"periodo_inicio"?: string,"plano_id"?: string,"provedor"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saas_assinatura_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: true
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saas_assinatura_plano_id_fkey"
      columns: ["plano_id"]
isOneToOne: false
      referencedRelation: "saas_plano"
      referencedColumns: ["id"]
    }
                  ]
                },"saas_evento_cobranca": {
                  Row: {
                    "assinatura_id": string | null,"clinica_id": string,"created_at": string,"erro_codigo": string | null,"estado": string,"evento_provedor_id": string,"id": string,"payload_hash": string,"provedor": string,"tipo": string
                  }
                  Insert: {
                    "assinatura_id"?: string | null,"clinica_id": string,"created_at"?: string,"erro_codigo"?: string | null,"estado"?: string,"evento_provedor_id": string,"id"?: string,"payload_hash": string,"provedor": string,"tipo": string
                  }
                  Update: {
                    "assinatura_id"?: string | null,"clinica_id"?: string,"created_at"?: string,"erro_codigo"?: string | null,"estado"?: string,"evento_provedor_id"?: string,"id"?: string,"payload_hash"?: string,"provedor"?: string,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saas_evento_cobranca_assinatura_id_fkey"
      columns: ["assinatura_id"]
isOneToOne: false
      referencedRelation: "saas_assinatura"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saas_evento_cobranca_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"saas_plano": {
                  Row: {
                    "ativo": boolean,"created_at": string,"id": string,"limite_membros": number,"limite_pacientes": number,"limite_teca_mes": number,"nome": string,"preco_mensal_centavos": number,"slug": string
                  }
                  Insert: {
                    "ativo"?: boolean,"created_at"?: string,"id"?: string,"limite_membros": number,"limite_pacientes": number,"limite_teca_mes": number,"nome": string,"preco_mensal_centavos": number,"slug": string
                  }
                  Update: {
                    "ativo"?: boolean,"created_at"?: string,"id"?: string,"limite_membros"?: number,"limite_pacientes"?: number,"limite_teca_mes"?: number,"nome"?: string,"preco_mensal_centavos"?: number,"slug"?: string
                  }
                  Relationships: [

                  ]
                },"suporte_ticket": {
                  Row: {
                    "aberto_por": string,"assunto": string,"clinica_id": string,"created_at": string,"descricao": string,"id": string,"prioridade": string,"resolvido_em": string | null,"status": string,"updated_at": string
                  }
                  Insert: {
                    "aberto_por": string,"assunto": string,"clinica_id": string,"created_at"?: string,"descricao": string,"id"?: string,"prioridade"?: string,"resolvido_em"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "aberto_por"?: string,"assunto"?: string,"clinica_id"?: string,"created_at"?: string,"descricao"?: string,"id"?: string,"prioridade"?: string,"resolvido_em"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "suporte_ticket_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"teca_artefato": {
                  Row: {
                    "aprovado_em": string | null,"aprovado_por": string | null,"clinica_id": string,"conteudo": NonNullable<Json>,"created_at": string,"editado_em": string | null,"estado": string,"execucao_id": string,"fontes": NonNullable<Json>,"guardas": NonNullable<Json>,"id": string,"paciente_id": string,"tipo": string
                  }
                  Insert: {
                    "aprovado_em"?: string | null,"aprovado_por"?: string | null,"clinica_id": string,"conteudo": NonNullable<Json>,"created_at"?: string,"editado_em"?: string | null,"estado"?: string,"execucao_id": string,"fontes"?: NonNullable<Json>,"guardas"?: NonNullable<Json>,"id"?: string,"paciente_id": string,"tipo": string
                  }
                  Update: {
                    "aprovado_em"?: string | null,"aprovado_por"?: string | null,"clinica_id"?: string,"conteudo"?: NonNullable<Json>,"created_at"?: string,"editado_em"?: string | null,"estado"?: string,"execucao_id"?: string,"fontes"?: NonNullable<Json>,"guardas"?: NonNullable<Json>,"id"?: string,"paciente_id"?: string,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teca_artefato_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teca_artefato_execucao_id_fkey"
      columns: ["execucao_id"]
isOneToOne: false
      referencedRelation: "teca_execucao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teca_artefato_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"teca_config": {
                  Row: {
                    "atualizado_por": string | null,"clinica_id": string,"created_at": string,"criado_por": string | null,"habilitada": boolean,"limite_geracoes_dia": number,"limite_tokens": number,"modelo": string,"orcamento_centavos_mes": number,"provedor": string,"updated_at": string
                  }
                  Insert: {
                    "atualizado_por"?: string | null,"clinica_id": string,"created_at"?: string,"criado_por"?: string | null,"habilitada"?: boolean,"limite_geracoes_dia"?: number,"limite_tokens"?: number,"modelo"?: string,"orcamento_centavos_mes"?: number,"provedor"?: string,"updated_at"?: string
                  }
                  Update: {
                    "atualizado_por"?: string | null,"clinica_id"?: string,"created_at"?: string,"criado_por"?: string | null,"habilitada"?: boolean,"limite_geracoes_dia"?: number,"limite_tokens"?: number,"modelo"?: string,"orcamento_centavos_mes"?: number,"provedor"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teca_config_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: true
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"teca_decisao": {
                  Row: {
                    "acao": string,"artefato_id": string,"clinica_id": string,"created_at": string,"decidido_por": string,"execucao_id": string,"guardas": NonNullable<Json>,"id": string,"justificativa": string | null,"paciente_id": string,"valor_antes": Json | null,"valor_depois": Json | null
                  }
                  Insert: {
                    "acao": string,"artefato_id": string,"clinica_id": string,"created_at"?: string,"decidido_por": string,"execucao_id": string,"guardas"?: NonNullable<Json>,"id"?: string,"justificativa"?: string | null,"paciente_id": string,"valor_antes"?: Json | null,"valor_depois"?: Json | null
                  }
                  Update: {
                    "acao"?: string,"artefato_id"?: string,"clinica_id"?: string,"created_at"?: string,"decidido_por"?: string,"execucao_id"?: string,"guardas"?: NonNullable<Json>,"id"?: string,"justificativa"?: string | null,"paciente_id"?: string,"valor_antes"?: Json | null,"valor_depois"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "teca_decisao_artefato_id_fkey"
      columns: ["artefato_id"]
isOneToOne: false
      referencedRelation: "teca_artefato"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teca_decisao_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teca_decisao_execucao_id_fkey"
      columns: ["execucao_id"]
isOneToOne: false
      referencedRelation: "teca_execucao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teca_decisao_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"teca_execucao": {
                  Row: {
                    "agendamento_id": string | null,"clinica_id": string,"completed_at": string | null,"contexto_hash": string,"contexto_versao": NonNullable<Json>,"created_at": string,"criado_por": string,"custo_centavos": number,"erro_resumo": string | null,"estado": string,"id": string,"modelo": string,"paciente_id": string,"plano_id": string | null,"prompt_versao": string,"provedor": string,"resultado": NonNullable<Json>,"tarefa": string,"tokens_entrada": number | null,"tokens_saida": number | null
                  }
                  Insert: {
                    "agendamento_id"?: string | null,"clinica_id": string,"completed_at"?: string | null,"contexto_hash": string,"contexto_versao"?: NonNullable<Json>,"created_at"?: string,"criado_por": string,"custo_centavos"?: number,"erro_resumo"?: string | null,"estado"?: string,"id"?: string,"modelo": string,"paciente_id": string,"plano_id"?: string | null,"prompt_versao": string,"provedor": string,"resultado"?: NonNullable<Json>,"tarefa": string,"tokens_entrada"?: number | null,"tokens_saida"?: number | null
                  }
                  Update: {
                    "agendamento_id"?: string | null,"clinica_id"?: string,"completed_at"?: string | null,"contexto_hash"?: string,"contexto_versao"?: NonNullable<Json>,"created_at"?: string,"criado_por"?: string,"custo_centavos"?: number,"erro_resumo"?: string | null,"estado"?: string,"id"?: string,"modelo"?: string,"paciente_id"?: string,"plano_id"?: string | null,"prompt_versao"?: string,"provedor"?: string,"resultado"?: NonNullable<Json>,"tarefa"?: string,"tokens_entrada"?: number | null,"tokens_saida"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "teca_execucao_agendamento_id_clinica_id_fkey"
      columns: ["agendamento_id","clinica_id"]
isOneToOne: false
      referencedRelation: "agendamento"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "teca_execucao_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teca_execucao_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "teca_execucao_plano_id_clinica_id_paciente_id_fkey"
      columns: ["plano_id","clinica_id","paciente_id"]
isOneToOne: false
      referencedRelation: "plano_alimentar"
      referencedColumns: ["id","clinica_id","paciente_id"]
    }
                  ]
                },"teca_fonte": {
                  Row: {
                    "aprovado_em": string | null,"aprovado_por": string | null,"clinica_id": string | null,"conteudo": string,"created_at": string,"created_by": string,"hash_conteudo": string,"id": string,"licenca": string | null,"origem": string,"status": string,"titulo": string,"updated_at": string,"versao": string
                  }
                  Insert: {
                    "aprovado_em"?: string | null,"aprovado_por"?: string | null,"clinica_id"?: string | null,"conteudo": string,"created_at"?: string,"created_by": string,"hash_conteudo": string,"id"?: string,"licenca"?: string | null,"origem": string,"status"?: string,"titulo": string,"updated_at"?: string,"versao"?: string
                  }
                  Update: {
                    "aprovado_em"?: string | null,"aprovado_por"?: string | null,"clinica_id"?: string | null,"conteudo"?: string,"created_at"?: string,"created_by"?: string,"hash_conteudo"?: string,"id"?: string,"licenca"?: string | null,"origem"?: string,"status"?: string,"titulo"?: string,"updated_at"?: string,"versao"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teca_fonte_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"teca_trecho": {
                  Row: {
                    "clinica_id": string | null,"created_at": string,"fonte_id": string,"id": string,"ordem": number,"texto": string
                  }
                  Insert: {
                    "clinica_id"?: string | null,"created_at"?: string,"fonte_id": string,"id"?: string,"ordem": number,"texto": string
                  }
                  Update: {
                    "clinica_id"?: string | null,"created_at"?: string,"fonte_id"?: string,"id"?: string,"ordem"?: number,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teca_trecho_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teca_trecho_fonte_id_fkey"
      columns: ["fonte_id"]
isOneToOne: false
      referencedRelation: "teca_fonte"
      referencedColumns: ["id"]
    }
                  ]
                },"teca_uso": {
                  Row: {
                    "clinica_id": string,"created_at": string,"custo_centavos": number,"execucao_id": string | null,"id": string,"tarefa": string,"tokens_entrada": number,"tokens_saida": number,"usuario_id": string
                  }
                  Insert: {
                    "clinica_id": string,"created_at"?: string,"custo_centavos"?: number,"execucao_id"?: string | null,"id"?: string,"tarefa": string,"tokens_entrada"?: number,"tokens_saida"?: number,"usuario_id": string
                  }
                  Update: {
                    "clinica_id"?: string,"created_at"?: string,"custo_centavos"?: number,"execucao_id"?: string | null,"id"?: string,"tarefa"?: string,"tokens_entrada"?: number,"tokens_saida"?: number,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teca_uso_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teca_uso_execucao_id_fkey"
      columns: ["execucao_id"]
isOneToOne: false
      referencedRelation: "teca_execucao"
      referencedColumns: ["id"]
    }
                  ]
                },"teleconsulta_aceite": {
                  Row: {
                    "aceito": boolean,"aceito_em": string,"agendamento_id": string,"clinica_id": string,"id": string,"paciente_id": string,"sessao_id": string,"termo_id": string,"user_id": string
                  }
                  Insert: {
                    "aceito": boolean,"aceito_em"?: string,"agendamento_id": string,"clinica_id": string,"id"?: string,"paciente_id": string,"sessao_id": string,"termo_id": string,"user_id": string
                  }
                  Update: {
                    "aceito"?: boolean,"aceito_em"?: string,"agendamento_id"?: string,"clinica_id"?: string,"id"?: string,"paciente_id"?: string,"sessao_id"?: string,"termo_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teleconsulta_aceite_agendamento_id_clinica_id_fkey"
      columns: ["agendamento_id","clinica_id"]
isOneToOne: false
      referencedRelation: "agendamento"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "teleconsulta_aceite_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teleconsulta_aceite_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "teleconsulta_aceite_sessao_id_fkey"
      columns: ["sessao_id"]
isOneToOne: false
      referencedRelation: "teleconsulta_sessao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teleconsulta_aceite_termo_id_fkey"
      columns: ["termo_id"]
isOneToOne: false
      referencedRelation: "teleconsulta_termo"
      referencedColumns: ["id"]
    }
                  ]
                },"teleconsulta_sessao": {
                  Row: {
                    "abre_em": string,"agendamento_id": string,"clinica_id": string,"created_at": string,"criada_por": string,"encerra_em": string,"encerrada_em": string | null,"erro_codigo": string | null,"estado": string,"id": string,"iniciada_em": string | null,"paciente_id": string,"profissional_id": string,"provedor": string,"sala_ref": string,"updated_at": string
                  }
                  Insert: {
                    "abre_em": string,"agendamento_id": string,"clinica_id": string,"created_at"?: string,"criada_por": string,"encerra_em": string,"encerrada_em"?: string | null,"erro_codigo"?: string | null,"estado"?: string,"id"?: string,"iniciada_em"?: string | null,"paciente_id": string,"profissional_id": string,"provedor": string,"sala_ref": string,"updated_at"?: string
                  }
                  Update: {
                    "abre_em"?: string,"agendamento_id"?: string,"clinica_id"?: string,"created_at"?: string,"criada_por"?: string,"encerra_em"?: string,"encerrada_em"?: string | null,"erro_codigo"?: string | null,"estado"?: string,"id"?: string,"iniciada_em"?: string | null,"paciente_id"?: string,"profissional_id"?: string,"provedor"?: string,"sala_ref"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teleconsulta_sessao_agendamento_id_clinica_id_fkey"
      columns: ["agendamento_id","clinica_id"]
isOneToOne: false
      referencedRelation: "agendamento"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "teleconsulta_sessao_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teleconsulta_sessao_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "teleconsulta_sessao_profissional_id_clinica_id_fkey"
      columns: ["profissional_id","clinica_id"]
isOneToOne: false
      referencedRelation: "perfil"
      referencedColumns: ["user_id","clinica_id"]
    }
                  ]
                },"teleconsulta_termo": {
                  Row: {
                    "clinica_id": string | null,"conteudo": string,"created_at": string,"criado_por": string | null,"id": string,"publicado_em": string | null,"publicado_por": string | null,"status": string,"versao": string
                  }
                  Insert: {
                    "clinica_id"?: string | null,"conteudo": string,"created_at"?: string,"criado_por"?: string | null,"id"?: string,"publicado_em"?: string | null,"publicado_por"?: string | null,"status"?: string,"versao": string
                  }
                  Update: {
                    "clinica_id"?: string | null,"conteudo"?: string,"created_at"?: string,"criado_por"?: string | null,"id"?: string,"publicado_em"?: string | null,"publicado_por"?: string | null,"status"?: string,"versao"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teleconsulta_termo_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"usuario": {
                  Row: {
                    "ativo": boolean,"avatar_path": string | null,"created_at": string,"id": string,"nome": string,"telefone": string | null,"tipo": string,"updated_at": string
                  }
                  Insert: {
                    "ativo"?: boolean,"avatar_path"?: string | null,"created_at"?: string,"id": string,"nome": string,"telefone"?: string | null,"tipo": string,"updated_at"?: string
                  }
                  Update: {
                    "ativo"?: boolean,"avatar_path"?: string | null,"created_at"?: string,"id"?: string,"nome"?: string,"telefone"?: string | null,"tipo"?: string,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"whatsapp_checkin": {
                  Row: {
                    "agendamento_id": string | null,"chave_ocorrencia": string,"clinica_id": string,"criada_em": string,"finalidade": string,"id": string,"mensagem_id": string | null,"paciente_id": string,"respondida_em": string | null,"resposta_codigo": string | null
                  }
                  Insert: {
                    "agendamento_id"?: string | null,"chave_ocorrencia": string,"clinica_id": string,"criada_em"?: string,"finalidade": string,"id"?: string,"mensagem_id"?: string | null,"paciente_id": string,"respondida_em"?: string | null,"resposta_codigo"?: string | null
                  }
                  Update: {
                    "agendamento_id"?: string | null,"chave_ocorrencia"?: string,"clinica_id"?: string,"criada_em"?: string,"finalidade"?: string,"id"?: string,"mensagem_id"?: string | null,"paciente_id"?: string,"respondida_em"?: string | null,"resposta_codigo"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_checkin_agendamento_id_clinica_id_fkey"
      columns: ["agendamento_id","clinica_id"]
isOneToOne: false
      referencedRelation: "agendamento"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "whatsapp_checkin_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_checkin_mensagem_id_fkey"
      columns: ["mensagem_id"]
isOneToOne: false
      referencedRelation: "whatsapp_mensagem"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_checkin_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"whatsapp_config": {
                  Row: {
                    "ativo": boolean,"business_account_id": string | null,"clinica_id": string,"created_at": string,"fuso_horario": string,"graph_api_version": string,"janela_fim": string,"janela_inicio": string,"limite_diario": number,"phone_number_id": string | null,"provedor": string,"telefone_exibicao": string | null,"token_cifrado": string | null,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "ativo"?: boolean,"business_account_id"?: string | null,"clinica_id": string,"created_at"?: string,"fuso_horario"?: string,"graph_api_version"?: string,"janela_fim"?: string,"janela_inicio"?: string,"limite_diario"?: number,"phone_number_id"?: string | null,"provedor"?: string,"telefone_exibicao"?: string | null,"token_cifrado"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"business_account_id"?: string | null,"clinica_id"?: string,"created_at"?: string,"fuso_horario"?: string,"graph_api_version"?: string,"janela_fim"?: string,"janela_inicio"?: string,"limite_diario"?: number,"phone_number_id"?: string | null,"provedor"?: string,"telefone_exibicao"?: string | null,"token_cifrado"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_config_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: true
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"whatsapp_consent_event": {
                  Row: {
                    "aceito": boolean,"clinica_id": string,"created_at": string,"finalidade": string,"id": string,"origem": string,"paciente_id": string,"source_event_id": string | null,"telefone_e164": string,"termo_id": string | null,"user_id": string | null,"versao_termo": string
                  }
                  Insert: {
                    "aceito": boolean,"clinica_id": string,"created_at"?: string,"finalidade": string,"id"?: string,"origem": string,"paciente_id": string,"source_event_id"?: string | null,"telefone_e164": string,"termo_id"?: string | null,"user_id"?: string | null,"versao_termo": string
                  }
                  Update: {
                    "aceito"?: boolean,"clinica_id"?: string,"created_at"?: string,"finalidade"?: string,"id"?: string,"origem"?: string,"paciente_id"?: string,"source_event_id"?: string | null,"telefone_e164"?: string,"termo_id"?: string | null,"user_id"?: string | null,"versao_termo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_consent_event_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_consent_event_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "whatsapp_consent_event_termo_id_fkey"
      columns: ["termo_id"]
isOneToOne: false
      referencedRelation: "whatsapp_termo"
      referencedColumns: ["id"]
    }
                  ]
                },"whatsapp_conversa": {
                  Row: {
                    "aberta_em": string,"clinica_id": string,"created_at": string,"estado": string,"id": string,"janela_expira_em": string | null,"paciente_id": string,"telefone_e164": string,"ultima_mensagem_em": string | null
                  }
                  Insert: {
                    "aberta_em"?: string,"clinica_id": string,"created_at"?: string,"estado"?: string,"id"?: string,"janela_expira_em"?: string | null,"paciente_id": string,"telefone_e164": string,"ultima_mensagem_em"?: string | null
                  }
                  Update: {
                    "aberta_em"?: string,"clinica_id"?: string,"created_at"?: string,"estado"?: string,"id"?: string,"janela_expira_em"?: string | null,"paciente_id"?: string,"telefone_e164"?: string,"ultima_mensagem_em"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_conversa_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_conversa_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"whatsapp_escalacao": {
                  Row: {
                    "atribuida_a": string | null,"categoria": string,"clinica_id": string,"conversa_id": string,"criada_em": string,"estado": string,"id": string,"mensagem_id": string | null,"paciente_id": string,"prazo_em": string | null,"prioridade": string,"resolucao": string | null,"resolvida_em": string | null,"resolvida_por": string | null,"source_event_id": string | null
                  }
                  Insert: {
                    "atribuida_a"?: string | null,"categoria": string,"clinica_id": string,"conversa_id": string,"criada_em"?: string,"estado"?: string,"id"?: string,"mensagem_id"?: string | null,"paciente_id": string,"prazo_em"?: string | null,"prioridade"?: string,"resolucao"?: string | null,"resolvida_em"?: string | null,"resolvida_por"?: string | null,"source_event_id"?: string | null
                  }
                  Update: {
                    "atribuida_a"?: string | null,"categoria"?: string,"clinica_id"?: string,"conversa_id"?: string,"criada_em"?: string,"estado"?: string,"id"?: string,"mensagem_id"?: string | null,"paciente_id"?: string,"prazo_em"?: string | null,"prioridade"?: string,"resolucao"?: string | null,"resolvida_em"?: string | null,"resolvida_por"?: string | null,"source_event_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_escalacao_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_escalacao_conversa_id_fkey"
      columns: ["conversa_id"]
isOneToOne: false
      referencedRelation: "whatsapp_conversa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_escalacao_mensagem_id_fkey"
      columns: ["mensagem_id"]
isOneToOne: false
      referencedRelation: "whatsapp_mensagem"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_escalacao_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"whatsapp_mensagem": {
                  Row: {
                    "atualizada_em": string,"clinica_id": string,"conteudo": string | null,"conversa_id": string,"criada_em": string,"direcao": string,"erro_codigo": string | null,"finalidade": string | null,"id": string,"paciente_id": string,"parametros_template": NonNullable<Json>,"provedor_message_id": string | null,"status": string,"template_id": string | null,"tipo": string
                  }
                  Insert: {
                    "atualizada_em"?: string,"clinica_id": string,"conteudo"?: string | null,"conversa_id": string,"criada_em"?: string,"direcao": string,"erro_codigo"?: string | null,"finalidade"?: string | null,"id"?: string,"paciente_id": string,"parametros_template"?: NonNullable<Json>,"provedor_message_id"?: string | null,"status": string,"template_id"?: string | null,"tipo": string
                  }
                  Update: {
                    "atualizada_em"?: string,"clinica_id"?: string,"conteudo"?: string | null,"conversa_id"?: string,"criada_em"?: string,"direcao"?: string,"erro_codigo"?: string | null,"finalidade"?: string | null,"id"?: string,"paciente_id"?: string,"parametros_template"?: NonNullable<Json>,"provedor_message_id"?: string | null,"status"?: string,"template_id"?: string | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_mensagem_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_mensagem_conversa_id_fkey"
      columns: ["conversa_id"]
isOneToOne: false
      referencedRelation: "whatsapp_conversa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_mensagem_conversa_id_paciente_id_clinica_id_fkey"
      columns: ["conversa_id","paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "whatsapp_conversa"
      referencedColumns: ["id","paciente_id","clinica_id"]
    },{
      foreignKeyName: "whatsapp_mensagem_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    },{
      foreignKeyName: "whatsapp_mensagem_template_id_clinica_id_fkey"
      columns: ["template_id","clinica_id"]
isOneToOne: false
      referencedRelation: "whatsapp_template"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"whatsapp_outbox": {
                  Row: {
                    "bloqueada_em": string | null,"clinica_id": string,"consent_event_id": string,"conversa_id": string,"created_at": string,"erro_codigo": string | null,"finalidade": string,"id": string,"idempotency_key": string,"mensagem_id": string,"paciente_id": string,"proxima_tentativa_em": string,"status": string,"tentativas": number
                  }
                  Insert: {
                    "bloqueada_em"?: string | null,"clinica_id": string,"consent_event_id": string,"conversa_id": string,"created_at"?: string,"erro_codigo"?: string | null,"finalidade": string,"id"?: string,"idempotency_key": string,"mensagem_id": string,"paciente_id": string,"proxima_tentativa_em"?: string,"status"?: string,"tentativas"?: number
                  }
                  Update: {
                    "bloqueada_em"?: string | null,"clinica_id"?: string,"consent_event_id"?: string,"conversa_id"?: string,"created_at"?: string,"erro_codigo"?: string | null,"finalidade"?: string,"id"?: string,"idempotency_key"?: string,"mensagem_id"?: string,"paciente_id"?: string,"proxima_tentativa_em"?: string,"status"?: string,"tentativas"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_outbox_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_outbox_consent_event_id_fkey"
      columns: ["consent_event_id"]
isOneToOne: false
      referencedRelation: "whatsapp_consent_event"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_outbox_consent_event_id_paciente_id_clinica_id_fkey"
      columns: ["consent_event_id","paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "whatsapp_consent_event"
      referencedColumns: ["id","paciente_id","clinica_id"]
    },{
      foreignKeyName: "whatsapp_outbox_conversa_id_fkey"
      columns: ["conversa_id"]
isOneToOne: false
      referencedRelation: "whatsapp_conversa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_outbox_conversa_id_paciente_id_clinica_id_fkey"
      columns: ["conversa_id","paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "whatsapp_conversa"
      referencedColumns: ["id","paciente_id","clinica_id"]
    },{
      foreignKeyName: "whatsapp_outbox_mensagem_id_fkey"
      columns: ["mensagem_id"]
isOneToOne: true
      referencedRelation: "whatsapp_mensagem"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_outbox_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"whatsapp_paciente_telefone": {
                  Row: {
                    "clinica_id": string,"created_at": string,"id": string,"paciente_id": string,"revogado_em": string | null,"telefone_e164": string,"user_id": string,"verificado_em": string
                  }
                  Insert: {
                    "clinica_id": string,"created_at"?: string,"id"?: string,"paciente_id": string,"revogado_em"?: string | null,"telefone_e164": string,"user_id": string,"verificado_em"?: string
                  }
                  Update: {
                    "clinica_id"?: string,"created_at"?: string,"id"?: string,"paciente_id"?: string,"revogado_em"?: string | null,"telefone_e164"?: string,"user_id"?: string,"verificado_em"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_paciente_telefone_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_paciente_telefone_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"whatsapp_phone_challenge": {
                  Row: {
                    "clinica_id": string,"consumed_at": string | null,"created_at": string,"expires_at": string,"id": string,"paciente_id": string,"token_hash": string,"user_id": string
                  }
                  Insert: {
                    "clinica_id": string,"consumed_at"?: string | null,"created_at"?: string,"expires_at": string,"id"?: string,"paciente_id": string,"token_hash": string,"user_id": string
                  }
                  Update: {
                    "clinica_id"?: string,"consumed_at"?: string | null,"created_at"?: string,"expires_at"?: string,"id"?: string,"paciente_id"?: string,"token_hash"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_phone_challenge_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "whatsapp_phone_challenge_paciente_id_clinica_id_fkey"
      columns: ["paciente_id","clinica_id"]
isOneToOne: false
      referencedRelation: "paciente"
      referencedColumns: ["id","clinica_id"]
    }
                  ]
                },"whatsapp_template": {
                  Row: {
                    "aprovado_em": string | null,"categoria": string,"clinica_id": string,"conteudo": string,"created_at": string,"finalidade": string,"id": string,"idioma": string,"nome": string,"provedor_template_id": string | null,"publicado_por": string | null,"status": string,"updated_at": string
                  }
                  Insert: {
                    "aprovado_em"?: string | null,"categoria": string,"clinica_id": string,"conteudo": string,"created_at"?: string,"finalidade": string,"id"?: string,"idioma"?: string,"nome": string,"provedor_template_id"?: string | null,"publicado_por"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "aprovado_em"?: string | null,"categoria"?: string,"clinica_id"?: string,"conteudo"?: string,"created_at"?: string,"finalidade"?: string,"id"?: string,"idioma"?: string,"nome"?: string,"provedor_template_id"?: string | null,"publicado_por"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_template_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"whatsapp_termo": {
                  Row: {
                    "clinica_id": string | null,"conteudo": string,"created_at": string,"criado_por": string | null,"finalidade": string,"id": string,"publicado_em": string | null,"publicado_por": string | null,"status": string,"versao": string
                  }
                  Insert: {
                    "clinica_id"?: string | null,"conteudo": string,"created_at"?: string,"criado_por"?: string | null,"finalidade": string,"id"?: string,"publicado_em"?: string | null,"publicado_por"?: string | null,"status"?: string,"versao": string
                  }
                  Update: {
                    "clinica_id"?: string | null,"conteudo"?: string,"created_at"?: string,"criado_por"?: string | null,"finalidade"?: string,"id"?: string,"publicado_em"?: string | null,"publicado_por"?: string | null,"status"?: string,"versao"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_termo_clinica_id_fkey"
      columns: ["clinica_id"]
isOneToOne: false
      referencedRelation: "clinica"
      referencedColumns: ["id"]
    }
                  ]
                },"whatsapp_webhook_event": {
                  Row: {
                    "bloqueado_em": string | null,"erro_codigo": string | null,"estado": string,"evento_id": string,"id": string,"payload_hash": string,"phone_number_id": string | null,"processado_em": string | null,"provedor": string,"recebido_em": string,"tipo": string
                  }
                  Insert: {
                    "bloqueado_em"?: string | null,"erro_codigo"?: string | null,"estado"?: string,"evento_id": string,"id"?: string,"payload_hash": string,"phone_number_id"?: string | null,"processado_em"?: string | null,"provedor": string,"recebido_em"?: string,"tipo": string
                  }
                  Update: {
                    "bloqueado_em"?: string | null,"erro_codigo"?: string | null,"estado"?: string,"evento_id"?: string,"id"?: string,"payload_hash"?: string,"phone_number_id"?: string | null,"processado_em"?: string | null,"provedor"?: string,"recebido_em"?: string,"tipo"?: string
                  }
                  Relationships: [

                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_patient_invite":
{ Args: { "p_token_hash": string }; Returns: string
                           },
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
"claim_whatsapp_outbox":
{ Args: { "p_limit"?: number }; Returns: {
              "bloqueada_em": string | null,
"clinica_id": string,
"consent_event_id": string,
"conversa_id": string,
"created_at": string,
"erro_codigo": string | null,
"finalidade": string,
"id": string,
"idempotency_key": string,
"mensagem_id": string,
"paciente_id": string,
"proxima_tentativa_em": string,
"status": string,
"tentativas": number
            }[]
                          SetofOptions: {
        from: "*"
        to: "whatsapp_outbox"
        isOneToOne: false
        isSetofReturn: true
      } },
"claim_whatsapp_webhook":
{ Args: { "p_evento_id": string,"p_payload_hash": string,"p_phone_number_id": string,"p_provedor": string,"p_tipo": string }; Returns: boolean
                           },
"clone_plan_revision":
{ Args: { "p_source": string }; Returns: string
                           },
"confirmar_agendamento":
{ Args: { "p_booking": string,"p_patient"?: string }; Returns: string
                           },
"consume_patient_photo_ai_call":
{ Args: { "p_paciente_id": string }; Returns: boolean
                           },
"consume_whatsapp_phone_challenge":
{ Args: { "p_telefone_e164": string,"p_token_hash": string }; Returns: {
              "clinica_id": string,"paciente_id": string,"user_id": string
            }[]
                           },
"create_questionnaire_draft":
{ Args: { "p_description"?: string,"p_title": string }; Returns: string
                           },
"financeiro_confirmar_recebimento":
{ Args: { "p_clinica": string,"p_evento": string,"p_evento_id": string,"p_pagamento_id": string,"p_payload": Json,"p_referencia": string,"p_refund_centavos"?: number,"p_valor_centavos": number }; Returns: boolean
                           },
"patient_next_appointment":
{ Args: { "p_paciente_id": string }; Returns: Json
                           },
"publish_questionnaire":
{ Args: { "p_questionnaire_id": string }; Returns: string
                           },
"publish_teleconsulta_termo":
{ Args: { "p_clinica_id": string,"p_conteudo": string,"p_user_id": string,"p_versao": string }; Returns: string
                           },
"publish_whatsapp_termo":
{ Args: { "p_clinica_id": string,"p_conteudo": string,"p_finalidade": string,"p_user_id": string,"p_versao": string }; Returns: string
                           },
"queue_whatsapp_template":
{ Args: { "p_clinica_id": string,"p_finalidade": string,"p_idempotency_key": string,"p_paciente_id": string,"p_parametros"?: Json,"p_template_id": string }; Returns: string
                           },
"saas_usage_snapshot":
{ Args: { "p_clinica_id": string }; Returns: Json
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
  "public": {
          Enums: {

          }
        }
} as const
