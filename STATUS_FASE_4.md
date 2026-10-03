# Fase 4 — implementação local em 2 de outubro de 2026

A etapa de alimentos e plano manual do `PLANO_IMPLEMENTACAO.md` foi implementada e validada localmente. A base TBCA ainda não foi carregada: o uso comercial exige autorização dos coordenadores e o arquivo autorizado não foi fornecido. O importador já aceita sua estrutura normalizada e exige uma referência de autorização.

## Entrega

- Catálogo TACO da 4ª edição com 597 alimentos, versão, atribuição e hashes do arquivo original e dos dados normalizados. Quinze registros têm macronutrientes ausentes e são recusados pelo editor até haver fonte corrigida.
- Importador versionado para TACO/TBCA, busca por alimento e fonte, cadastro clínico de alimentos e medidas caseiras, receitas com ingredientes e cálculo decimal determinístico.
- Editor de plano com refeições, porções, substituições, metas, alergias visíveis e aprovação manual. Itens guardam nutrientes, fontes, composição e medidas usadas no cálculo. Uma versão aprovada é imutável; a revisão copia o plano em transação para novo rascunho.
- PDF com marca, refeições, substituições, metas e atribuição de fonte; visão móvel instalável do paciente vinculado. Ambos usam os mesmos registros da versão aprovada. O paciente não vê rascunhos.
- RLS por papel, clínica e vínculo do paciente; auditoria de alterações clínicas; fontes importadas imutáveis por versão.

## Validação

| Verificação | Resultado |
|---|---|
| `pnpm lint` e `pnpm typecheck` | passaram |
| `pnpm test` | 25 testes passaram |
| `pnpm test:e2e` | 11 cenários passaram, inclusive plano, PDF, paciente e revisão |
| `supabase test db` | 92 testes SQL passaram |
| `supabase db advisors --local` | nenhum problema |
| `pnpm build` | passou |
| Reimportação TACO | 597 registros, sem alteração de versão |

Os testes de navegador criaram dados fictícios no Supabase local. Não houve deploy nem commit. A ativação e o convite de contas de paciente, consentimentos, diário e sincronização offline continuam na fase 7.

## Dependência externa para TBCA

Para carregar a TBCA, são necessários a autorização de uso comercial, a referência documental dessa autorização e o arquivo de dados legítimo. Após recebê-los, normalizar os campos para o contrato JSONL descrito no `README.md`, validar a licença e importar como nova versão. Não reutilizar dados copiados do site sem autorização.
