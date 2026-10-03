# Nutreza — Build Prompt (Next.js + Supabase + shadcn/ui · Clean Code · TDD/BDD)

> **How to use:** Feed this document to an AI coding agent or dev team as the single source of technical truth. It defines the stack, architecture, testing discipline, and build order for **Nutreza** — the SaaS for Brazilian nutritionists with the AI copilot **Teca**. Design and copy decisions live in the companion documents (`Manual de Marca — Nutreza.md` and `UI-UX Master Prompt`); this file governs **how the software is built**.
>
> **Guiding constraint:** simple on purpose. One Next.js app, one Supabase project, no microservices, no Kubernetes, no premature abstractions. Boring technology, excellent tests.

---

## 1. Tech Stack (locked)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript (strict)** | One codebase for marketing site, nutritionist app, patient PWA; server components where they help |
| Language | TypeScript `strict: true`, no `any` without `// eslint-disable` comment + reason | Types are the first test suite |
| Backend | **Supabase** (managed Postgres, Auth, Storage, Realtime, Edge Functions, pgvector) | Simplest possible backend; SQL portability; RLS = security at the data layer |
| UI | **shadcn/ui** (Radix primitives) + **Tailwind CSS** | Accessible by default, fully owned code (components live in the repo, not node_modules) |
| Extra libs | TanStack Query (client cache), react-hook-form + Zod (forms/validation), date-fns (dates, `ptBR` locale), Lucide (icons), Recharts (charts), nuqs (URL state) | Standard, boring, proven |
| AI | LLM calls via provider SDKs **inside Edge Functions only** (never from the browser); provider-agnostic wrapper | Keys never ship to client; swappable models |
| Payments | PSP abstraction (start with Pix via Asaas/Stripe BR) behind a `BillingGateway` interface | Swap without touching domain code |
| WhatsApp | Meta Cloud API via a single Edge Function adapter | One integration point |
| Package manager / runtime | pnpm + Node LTS | Fast, deterministic |
| CI | GitHub Actions: lint → typecheck → unit → e2e → build | Quality gate on every PR |

**Explicitly NOT in the stack (for now):** GraphQL, tRPC, Redux/Zustand (TanStack Query + URL state covers it), microservices, custom auth, self-hosted Postgres, React Native (PWA first).

---

## 2. Clean Architecture (feature-sliced, pragmatic)

Clean code here means: **domain logic is pure TypeScript, testable in milliseconds, with zero imports from Next.js or Supabase.** Infrastructure lives at the edges.

```
src/
├── app/                        # Next.js routes (thin! rendering + wiring only)
│   ├── (marketing)/            # landing, preços, blog
│   ├── (app)/                  # nutritionist app (auth required)
│   │   ├── inicio/ agenda/ pacientes/ planos/ financeiro/ ...
│   ├── (paciente)/             # patient PWA
│   └── api/                    # route handlers (webhooks only)
├── features/                   # ONE FOLDER PER FEATURE — the heart of the app
│   ├── pacientes/
│   │   ├── domain/             # pure functions & types (no I/O, no framework)
│   │   │   ├── paciente.ts     # entities, invariants
│   │   │   └── *.test.ts       # unit tests NEXT TO the code
│   │   ├── application/        # use cases: cadastrarPaciente.ts (orchestrates domain + ports)
│   │   ├── infrastructure/     # supabasePacienteRepository.ts (implements ports)
│   │   └── ui/                 # feature components (PacienteForm.tsx, PacienteTable.tsx)
│   ├── agenda/  planos/  financeiro/  teca/  auth/  consentimentos/ ...
├── shared/
│   ├── ui/                     # shadcn components (button, dialog, table...)
│   ├── lib/                    # result.ts, money.ts, dates.ts
│   └── config/                 # env validation (Zod), constants
└── supabase/
    ├── migrations/             # SQL migrations, versioned, reviewed like code
    ├── functions/              # Edge Functions (teca-agent, whatsapp-webhook, billing-webhook)
    └── seed.sql                # deterministic dev seed (incl. TBCA sample)
```

**Rules that keep it clean:**
1. `app/` pages contain no logic — they call `application/` use cases and render `ui/`.
2. `domain/` never imports from `infrastructure/`, Next.js, or Supabase. It speaks Portuguese domain language: `PlanoAlimentar`, `Consulta`, `Paciente`, `Alergia`.
3. Dependencies point inward: `ui → application → domain`. Infrastructure implements interfaces defined in application (ports & adapters, kept light — interfaces only where substitution is real: billing, LLM, WhatsApp, storage).
4. Errors as values: use cases return `Result<T, DomainError>` — no throwing across boundaries.
5. One file, one responsibility; a component over ~150 lines gets split; a function over ~40 lines gets decomposed.

---

## 3. TDD + BDD Workflow (non-negotiable)

### 3.1 Test pyramid

| Level | Tool | Scope | Target |
|---|---|---|---|
| **Unit (TDD)** | Vitest | every `domain/` and `application/` function | ≥90% coverage on domain/application |
| **Component** | Vitest + Testing Library | form validation, states (empty/loading/error), accessibility queries | every shared + feature UI component |
| **E2E (BDD)** | Playwright + Gherkin (playwright-bdd) | critical user journeys only | ~20–30 scenarios covering the golden paths |
| **DB/RLS** | pgTAP or Supabase test helpers | every RLS policy, every migration | 100% of policies |

### 3.2 The loop (every feature, no exceptions)

1. **BDD first:** write the Gherkin scenario in PT-BR with the "user" language of the domain, reviewed before code exists.
2. **Red:** write the failing unit test for the domain rule.
3. **Green:** minimal implementation to pass.
4. **Refactor:** clean names, remove duplication, keep tests green.
5. Wire UI → run component tests → run the Playwright scenario end-to-end.
6. PR requires: all checks green, coverage not decreased, migration reversible.

### 3.3 Example — the canonical BDD scenarios (ship these first)

```gherkin
# features/teca/rascunho_plano.feature
Funcionalidade: Rascunho de plano alimentar pela Teca

  Cenário: Guarda de segurança bloqueia alergênico
    Dado uma paciente com alergia registrada a "amendoim"
    Quando a Teca gera um rascunho de plano contendo "pasta de amendoim"
    Então o sistema sinaliza a violação "Contém alergênico: amendoim"
    E o plano permanece em estado "rascunho"
    E o botão "Aprovar plano" fica bloqueado

  Cenário: Nutricionista aprova rascunho sem violações
    Dado um rascunho de plano gerado pela Teca sem violações de guarda
    Quando o nutricionista clica em "Aprovar plano"
    Então o plano muda para estado "vigente"
    E o paciente recebe o plano no app e no WhatsApp
    E o evento é registrado na trilha de auditoria com autor "Teca (rascunho) + Dra. Ana (aprovação)"
```

```gherkin
# features/paciente/diario_foto.feature
Funcionalidade: Registro de refeição por foto

  Cenário: Registro com confirmação em menos de 30 segundos
    Dado que a paciente está na aba "Diário"
    Quando ela fotografa o almoço
    Então a Teca sugere itens e porções como rascunho editável
    Quando ela confirma sem editar
    Então o registro é salvo com nutrientes calculados sobre a TBCA
    E o processo inteiro leva menos de 30 segundos
```

Other mandatory scenario files: `agenda_no_show.feature` (lembrete via WhatsApp reduz falta), `financeiro_pix_recorrente.feature` (cobrança, falha, retentativa), `consentimento_lgpd.feature` (revogação bloqueia mensagens), `prontuario_auditoria.feature` (toda leitura/escrita clínica logada).

---

## 4. Data Model (Supabase/Postgres)

Multi-tenancy by `clinica_id` (a solo nutritionist is a clinic of one). **Every table with patient data has RLS ON — deny by default.**

```sql
-- core entities (abbreviated; full migrations generated in code)
clinica(id, nome, marca_config jsonb, plano_assinatura, created_at)
perfil(id, clinica_id, user_id → auth.users, papel enum(admin,profissional,recepcao), crn, nome)
paciente(id, clinica_id, nome, nascimento, sexo, contato jsonb, objetivo, status)
alergia(paciente_id, substancia, gravidade)            -- guardrail source
anamnese(id, paciente_id, versao, dados jsonb, registrado_por, created_at)
antropometria(id, paciente_id, data, peso, altura, pct_gordura, massa_magra, medidas jsonb)
agendamento(id, clinica_id, paciente_id, inicio, fim, tipo, status enum(confirmada,realizada,falta,cancelada), meet_url)
plano_alimentar(id, paciente_id, versao, estado enum(rascunho,aguardando_aprovacao,vigente,arquivado),
                origem enum(humano,teca), aprovado_por, aprovado_em, conteudo jsonb)
plano_item(id, plano_id, refeicao, alimento_id, porcao, medida_caseira, substituicoes jsonb)
alimento(id, fonte enum(TBCA,TACO,USDA,personalizado), nome, nutrientes jsonb)  -- pgvector embedding col
registro_refeicao(id, paciente_id, foto_url, itens jsonb, origem enum(foto,manual), confirmado bool, created_at)
consentimento(id, paciente_id, tipo enum(atendimento,marketing,fotos,whatsapp), status, versao_termo, registrado_em)
cobranca(id, clinica_id, paciente_id, valor_centavos, metodo enum(pix,boleto,cartao), status, vencimento)
pacote(id, clinica_id, nome, sessoes, preco_centavos) / pacote_uso(pacote_id, agendamento_id)
agente_config(clinica_id, tom, horarios, regras_escalacao jsonb, whatsapp_numero)
mensagem_agente(id, clinica_id, paciente_id, direcao, conteudo, escopo enum(aprovado,escalado), created_at)
audit_log(id, clinica_id, ator, acao, entidade, entidade_id, diff jsonb, ip, created_at)  -- append-only
```

**RLS pattern (apply to every table):** `clinica_id = (select clinica_id from perfil where user_id = auth.uid())` for staff; patients get a separate role with access to *their own* `paciente_id` rows only; `audit_log` is insert-only (no update/delete policies ever).

**LGPD/Legal invariants enforced in the model:** consent before WhatsApp send (checked in the Edge Function, not just UI); prontuário records never hard-deleted (20-year retention — soft delete only, flagged); every AI-generated artifact stores `origem` and approval metadata.

---

## 5. Teca (AI layer) — architecture rules

1. **Deterministic core, LLM at the edges.** The nutrition engine is pure functions in `features/planos/domain/`: `calcularTMB()`, `distribuirMacros()`, `calcularPlanoNutrientes(itens)` — fully unit-tested, no LLM involved. The LLM *proposes items*; the engine *computes numbers*.
2. **Guardrails are code, not prompts.** `verificarGuardas(plano, paciente)` checks allergies, contraindications, energy/macro ranges → returns typed violations → UI blocks approval. Tested with adversarial fixtures (plan with hidden allergen, plan with 3× target calories).
3. **Provider abstraction:** `interface LLMProvider { gerar(prompt, opts): Promise<Result<string>> }` with implementations per vendor; model routing table in config (cheap model for summaries, stronger for plan drafts).
4. **RAG:** pgvector over `alimento` + reviewed clinical content; retrieval always cited (source id stored with the draft).
5. **Full audit:** prompt template version, model, tokens, and output stored per AI action.

---

## 6. UI Conventions (binding to the design docs)

- shadcn/ui components themed with the Nutreza tokens: `primary #2E7D5B`, `accent #F4A259` (Teca only), `danger #BC4B51` (guardrails), background `#FAF7F2` — implemented as CSS variables in `globals.css`, dark mode via `next-themes`.
- Inter font via `next/font`, `font-variant-numeric: tabular-nums` on all clinical numbers.
- Every AI artifact renders with the ✨ "Sugerido pela Teca" chip and draft treatment until approved (see UI/UX master prompt Part 2.2 — it is a hard requirement, not a suggestion).
- All user-facing strings in PT-BR from a single `messages/pt-BR.ts` file (no hardcoded strings in components — future-proofs LATAM expansion).
- TanStack Query keys follow `[feature, entity, id]`; mutations invalidate narrowly.
- Forms: react-hook-form + Zod schemas shared between client validation and Edge Function validation (single source of truth).

---

## 7. Quality Gates & Definition of Done

**Every PR must pass:**
- [ ] `pnpm lint` (ESLint + boundaries rule: domain can't import infrastructure)
- [ ] `pnpm typecheck` (tsc --noEmit, strict)
- [ ] `pnpm test` (Vitest, coverage ≥90% on domain/application, no skipped tests)
- [ ] `pnpm test:e2e` (Playwright Gherkin scenarios green)
- [ ] `pnpm supabase test db` (RLS policies proven)
- [ ] Migration present for any schema change + rollback verified
- [ ] Accessibility spot-check: keyboard pass + axe-core on new screens

**A feature is "done" when:** Gherkin scenario passes end-to-end; unit coverage green; empty/loading/error states implemented (per UI/UX doc Part 6); audit log entry written for clinical actions; copy reviewed in PT-BR.

---

## 8. Build Order (MVP slices — each slice is vertical: DB → domain → UI → e2e)

1. **Slice 0 — Foundation:** repo setup, CI, Supabase project, auth (magic link + Google), theming, base layout, first BDD scenario green in CI.
2. **Slice 1 — Pacientes:** CRUD + anamnese + alergias + RLS + audit log.
3. **Slice 2 — Agenda:** availability, booking, statuses, public booking page.
4. **Slice 3 — Planos:** food database import (TBCA/TACO), plan builder, deterministic engine, PDF.
5. **Slice 4 — Teca draft:** LLM provider abstraction, draft generation, guardrails, approval flow, audit of AI actions.
6. **Slice 5 — Financeiro:** charges, Pix, receipts, dunning.
7. **Slice 6 — Paciente PWA:** invite flow, consent, plan view, diary (photo → Teca draft → confirm).
8. **Slice 7 — Agente WhatsApp:** templates, check-ins, escalation to inbox.

Each slice ships behind a feature flag and is demoable on merge.

---

## 9. Non-goals (explicitly out of scope for now)

Native mobile apps, clinic multi-branch hierarchies, TISS/convênio billing, wearable integrations, marketplace, internationalization beyond PT-BR strings architecture, self-hosted LLMs.

---

*Nutreza build prompt v1.0 — October 2026. Companions: Manual de Marca · UI/UX Master Prompt · Pesquisa Aprofundada de Mercado.*
