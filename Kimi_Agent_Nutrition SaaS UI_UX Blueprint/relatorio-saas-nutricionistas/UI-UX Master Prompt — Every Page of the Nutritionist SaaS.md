# UI/UX Master Prompt — SaaS para Nutricionistas com Agente de IA

> **How to use this document:** This is a complete design-and-build prompt. Feed it whole (or section by section) to any AI builder, designer, or developer. It specifies the design system, global UX patterns, and **every page of the product**, from the public landing page to the deepest settings screen, including empty, loading, and error states.
>
> **Product context:** A Brazilian SaaS for nutritionists (nutricionistas) with an embedded AI agent. Three surfaces: (1) public marketing site, (2) the nutritionist's web app, (3) the patient's mobile PWA + WhatsApp agent. All user-facing copy is in **Brazilian Portuguese (PT-BR)**; interface text examples below are given in PT-BR with English explanations. The nutritionist is the paying user; the patient is the engagement surface. The AI is always a **supervised copilot** — it drafts, the professional approves.
>
> **Design goal:** A busy nutritionist should complete a full consultation cycle (see patient → document → prescribe → charge) without ever leaving the product, and a patient should log a meal in under 30 seconds.

---

## Part 0 — Evidence Base (why these decisions)

Key research behind the choices in this document:

- High-converting SaaS landing pages pass a **5-second test**: clear headline, who it's for, product UI visible in the hero, one repeated CTA, and micro-proof near the CTA ([SmartClick](https://smartclick.agency/blog/saas-landing-page-best-practices/), [Flighted](https://www.flighted.co/blog/10-saas-landing-page-best-practices-that-actually-convert)).
- SaaS dashboards win with **progressive disclosure**: most critical metrics top-left, secondary detail behind drill-downs, max ~7–8 visuals per view, and every KPI carrying three layers of context — previous-period comparison, target, and trend ([UXPin](https://www.uxpin.com/studio/blog/dashboard-design-principles/), [Aufait UX](https://www.aufaitux.com/blog/dashboard-design-examples-inspiration-best-practices/)).
- Median B2B SaaS activation is ~38%; improving activation 25% correlates with +34% MRR. Best-practice onboarding: setup wizard under 5 steps, one CTA per screen, interactive walkthroughs (not linear tours), checklists of 3–5 items, and empty states with example data ([SaaSHero](https://www.saashero.net/design/saas-onboarding-ux-best-practices/), [Arcade](https://www.arcade.software/post/saas-onboarding-complete-playbook), [Userpilot](https://userpilot.com/blog/best-user-onboarding-experience/)).
- Pricing pages: 3–4 tiers maximum, highlight a "most popular" plan (badges can lift conversions meaningfully), annual/monthly toggle with visible savings, stack cards vertically on mobile (≈58% of pricing-page traffic is mobile), and put an FAQ on the page ([Figma](https://www.figma.com/resource-library/pricing-page-best-practices/), [InfluenceFlow](https://influenceflow.io/resources/saas-pricing-page-best-practices-complete-guide-for-2026/)).
- AI UX: for copilot-style AI the human stays the executor — trust is built through suggestion quality, transparency about what the AI did, and an always-visible approve/edit/reject path ([Institute of Product Management](https://www.institutepm.com/knowledge-hub/agentic-ai-ux-patterns)).
- Healthcare UX: readable font sizes, strong contrast, plain language for patients, redundant cues (icon + text label, never color alone), gamified progress (streaks, milestones), and reassuring microinteractions around every wait state ([ProCreator](https://procreator.design/blog/healthcare-ux-design-strategies-practices/), [Eleken](https://www.eleken.co/blog-posts/user-interface-design-for-healthcare-applications), [Orangesoft](https://orangesoft.co/blog/guide-to-designing-healthcare-apps-for-seniors)).
- Mobile: bottom tab bars with 3–5 destinations, primary actions in the bottom thumb zone, tap targets ≥44×44 px, safe-area padding for iOS ([Parachute Design](https://parachutedesign.ca/blog/thumb-zone-ux/), [Phone Simulator](https://phone-simulator.com/blog/mobile-navigation-patterns-in-2026)).
- Empty states: never a dead end — every empty screen gets context ("why it's empty"), one next action, and templates/sample data instead of a blank canvas ([Kompassify](https://kompassify.com/blog/empty-states-guide), [Eleken](https://www.eleken.co/blog-posts/empty-state-ux)).
- Accessibility baseline: **WCAG 2.2 AA** — focus not obscured, 24×24 px minimum targets (we use 44), no drag-only interactions, no redundant re-entry of data, accessible authentication, consistent help placement ([Aufait UX](https://www.aufaitux.com/blog/wcag-2-2-compliance-saas-government-platforms/), [PopArt](https://www.popwebdesign.net/popart_blog/en/2026/06/wcag-2-2-checklist/)).

---

## Part 1 — Design System Foundations

### 1.1 Brand personality

Clinical but warm. The product sits between a medical record and a consumer wellness app: it must look **trustworthy enough for health data** and **friendly enough that a patient opens it daily**. Avoid: sterile hospital-blue-only palettes, playful cartoon styles, and generic "AI purple gradient" aesthetics.

Voice: professional, encouraging, plain-language. For patients, 8th-grade reading level PT-BR, no jargon ("Plano alimentar", not "Prescrição dietética"). For nutritionists, technical terms are fine (antropometria, bioimpedância, TMB).

### 1.2 Color palette

Green/teal core (nutrition, health, growth) with one warm accent. Same palette across marketing site, app, patient PWA, charts, and the AI agent's visual identity.

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#2E7D5B` | Primary buttons, active nav, links, brand |
| `primary-soft` | `#7CB58A` | Hover states, secondary fills, chart series 2 |
| `accent` | `#F4A259` | One accent only: key highlights, streak/progress rewards, "AI" sparkle markers |
| `teal` | `#5B8E7D` | Secondary data, tags |
| `danger` | `#BC4B51` | Guardrail alerts, destructive actions, allergy warnings |
| `info` | `#4A90A4` | Informational banners, tips |
| `neutral-900` | `#1F2937` | Body text |
| `neutral-500` | `#6B7280` | Secondary text |
| `neutral-100` | `#F3F4F6` | Card backgrounds, dividers |
| `surface` | `#FFFFFF` | Base background (light mode) |
| `success` | `#3D9970` | Confirmations, goal reached |

Rules: never communicate status by color alone — pair with icon + text label ("⚠ Contém alergênico"). Charts reuse this palette in fixed order so the same entity keeps the same color product-wide. Dark mode: optional for the nutritionist app (dashboard-heavy use), required palette tokens defined from day one; patient PWA ships light-first with dark support in phase 3.

### 1.3 Typography

- **Font:** one family only — Inter (or system stack fallback). Numerals use tabular lining for tables/metrics.
- **Scale:** Display 32/40 bold (page titles), H2 24/32 semibold, H3 18/26 semibold, Body 16/24 regular, Small 14/20, Caption 12/16.
- **Patient PWA minimums:** body 16 px+, line-height ≥1.5, no text over images, bold (never italic) for emphasis.
- **Clinical numbers** (kcal, macros, weight) always in tabular numerals with unit labels, never unitless.

### 1.4 Spacing, layout, components

- 8-pt spacing grid (4, 8, 12, 16, 24, 32, 48, 64). Card radius 12 px, button radius 8 px. Max content width 1200 px (app), 720 px (reading surfaces), 480 px (patient PWA column).
- **Breakpoints:** mobile <640, tablet 640–1024, desktop >1024. Nutritionist app is desktop-first but fully usable on tablet; patient PWA is mobile-first, installable (manifest, offline shell).
- **Component library** (build once, reuse everywhere): button (primary/secondary/ghost/destructive), input (with label, hint, error text, prefix/suffix), select, date/time picker, textarea with counter, card, stat card, badge/tag, avatar, modal, drawer (right-side, for quick views), toast, tooltip, tabs, accordion, table (sortable, paginated), empty state, skeleton loader, progress bar, stepper, chip/multi-select, toggle, alert banner, chart wrappers (line, bar, donut), AI message bubble, AI suggestion card.
- **Iconography:** outline icons (Lucide-style), always with text labels in navigation and in clinical contexts. No emoji as UI icons.

### 1.5 Motion & microinteractions

Subtle only: 150–250 ms ease-out transitions, skeletons (not spinners) for content loads, success checkmark animation on save/payment, confetti-free but warm celebrations for patient milestones (streak badge + message). Every wait >1 s shows progress feedback — critical in health contexts where waiting creates anxiety.

---

## Part 2 — Global UX Patterns (apply to every page)

### 2.1 Navigation model

- **Nutritionist app (desktop):** fixed left sidebar (240 px, collapsible to 64 px icons+tooltip). Items, top to bottom: Início, Agenda, Pacientes, Planos alimentares, Financeiro, Relatórios, Biblioteca, Agente IA (WhatsApp), Configurações. Top bar: global search (patients, plans, foods — ⌘K), "+ Novo" quick-create button (agendamento / paciente / plano / cobrança), notifications bell, avatar menu.
- **Nutritionist app (mobile/tablet):** sidebar becomes bottom bar with 4 items + "Mais": Início, Agenda, Pacientes, + , Mais.
- **Patient PWA:** bottom tab bar, exactly 5 tabs: Hoje, Plano, Diário (center, emphasized camera FAB), Progresso, Perfil. Primary actions always in the bottom 45% of the screen; sticky CTAs anchored above the tab bar.
- **Marketing site:** sticky top nav (Logo, Funcionalidades, Preços, Blog/Conteúdo, Entrar, CTA "Teste grátis").

### 2.2 AI UX patterns (the product's differentiator — treat as first-class design)

1. **Always labeled:** every AI-generated artifact carries a consistent marker: ✨ sparkle icon + "Sugerido pela IA" chip. Never blend AI output into human-authored content silently.
2. **Draft, never final:** AI output renders in a visually distinct "draft" treatment (dashed border / soft accent background) until the nutritionist clicks **Aprovar**. The approve action is the hero CTA wherever AI content exists; Edit and Discard are always adjacent.
3. **Show the why:** AI suggestions include a one-line rationale + source ("Baseado na anamnese de 12/09 e na TBCA-USP"). Expandable "Ver raciocínio" for detail.
4. **Guardrail alerts are loud and specific:** safety-layer blocks (allergen, contraindication, macro range violation) render as `danger` banners naming the exact problem ("Plano contém amendoim — paciente tem alergia registrada") and **cannot be approved without editing or explicit override with justification** (logged for audit).
5. **Low-confidence humility:** photo food-recognition results show a confidence hint and always open as an editable draft ("Identifiquei frango grelhado e arroz — confirme as porções").
6. **Escalation visible:** in the patient-facing agent, out-of-scope questions get a graceful handoff ("Essa pergunta é importante — encaminhei para sua nutricionista, que responde até amanhã") and create a task in the nutritionist's inbox.
7. **AI unavailable ≠ product unavailable:** if the LLM is down, all manual flows work identically; AI buttons show a disabled state with tooltip, never an error page.

### 2.3 LGPD / privacy-by-design UX

- Consent is **granular and visible**: separate toggles for clinical care (tutela da saúde), marketing messages, before/after photo usage, WhatsApp contact. Collected during onboarding and patient invite; reviewable anytime in Settings → Privacidade.
- Patient PWA has a **"Meus dados"** screen: view, export (portability), revoke consents, request deletion — self-serve, no support ticket needed.
- Session hygiene: auto-logout after 30 min idle in the nutritionist app (configurable), MFA enrollment nudged at onboarding, login alerts by e-mail.
- WhatsApp flows never expose other patients' data; clinical content in WhatsApp is limited to what the nutritionist pre-approved (plans, substitutions), never full records.

### 2.4 Global states

- **Loading:** skeleton screens matching the final layout; >8 s shows an encouraging message; >20 s offers retry.
- **Errors:** plain-language message + what happened + what to do + retry button. Never raw codes. Destructive errors (payment failure, sync loss) also trigger a toast + notification-center entry.
- **Empty states:** every list/table/chart has a designed empty state with (a) why it's empty, (b) one primary CTA, (c) template/sample-data option where sensible. Full inventory in Part 6.
- **Offline (PWA):** patient diary queues entries locally and syncs; a subtle banner states "Sem conexão — seus registros serão enviados automaticamente".

### 2.5 Notifications

In-app notification center (bell) + channels: e-mail (transactional), WhatsApp (patient-facing, template-approved), push (PWA). Notification preferences per channel in Settings. Digest, never spam: patient agent batches check-ins; nutritionist gets a morning summary ("Hoje: 6 consultas, 2 planos aguardando sua aprovação, 1 paciente sem registrar há 5 dias").

---

## Part 3 — Public Marketing Site (pages P0–P4)

### P0 — Landing page `/`

**Goal:** convert a visiting nutritionist into a free-trial signup. Must pass the 5-second test.

**Section-by-section (in scroll order):**

1. **Sticky nav** — logo left; links center (Funcionalidades, Como funciona, Preços, Para pacientes, Blog); right: "Entrar" (ghost) + "Teste grátis por 14 dias" (primary). Mobile: hamburger bottom-right, full-screen overlay menu with large stacked links.
2. **Hero** — two-column on desktop. Left: H1 outcome-led ("Seu consultório de nutrição com um copiloto de IA" / headline pattern: outcome + who it's for), subheading naming the pain ("Menos tempo montando plano e cobrando paciente. Mais tempo atendendo."), primary CTA "Começar teste grátis" + microcopy "Sem cartão de crédito · Cancele quando quiser", micro-proof line ("Feito para nutricionistas brasileiros · LGPD · TBCA"). Right: **real product screenshot** (dashboard with AI draft visible), not stock art. Optional 60-second muted demo video/GIF loop.
3. **Social proof bar** — logos/numbers ("+X nutricionistas", CRN-friendly wording, ratings when available).
4. **Problem → agitation** — 3 pain cards with relatable scenes: horas montando plano no Excel, no-show de paciente, paciente que some entre consultas.
5. **How it works** — 3 steps with mini-screenshots: ① Atenda (IA escreve a nota) ② Prescreva (IA rascunha, você aprova) ③ Acompanhe (agente segue o paciente no WhatsApp).
6. **Feature highlights** — alternating rows (image/text), max 4: Copiloto de IA, Agenda com lembretes e Pix, App do paciente com diário por foto, Financeiro com pacotes. Each: benefit headline, 2-sentence copy, screenshot, "Saiba mais" link.
7. **The AI trust section** (differentiator) — "IA que rascunha. Você que decide." Explain HITL, safety guardrails, and LGPD handling of AI data. This section de-risks the product's boldest claim.
8. **Pricing teaser** — 3 cards linking to full pricing page.
9. **Testimonials** — 2–3 with photo, name, CRN region, and **quantified outcome** ("economizo 6h por semana").
10. **FAQ** — 6–8 accordion items (LGPD, telenutrição CFN, migração de dados, funciona no celular, IA e responsabilidade técnica, cancelamento).
11. **Final CTA** — same hero CTA repeated verbatim + lighter secondary path ("Ver demonstração de 2 min").
12. **Footer** — product/company/legal columns, LGPD & privacy links, terms, contact, CNPJ.

**States/criteria:** CTA buttons ≥44 px, page <2.5 s LCP on 4G mobile, all images lazy-loaded below fold, cookie-consent banner (LGPD) non-blocking, analytics events on every CTA.

### P1 — Pricing page `/precos`

- H1 + one-line value anchor ("Menos que o valor de uma consulta por mês").
- **Monthly/annual toggle** with savings badge ("2 meses grátis no anual"), defaulting to annual.
- **3 paid tiers + free student plan** as cards: Estudante (grátis, marca d'água, 5 pacientes), Essencial (R$ 49–59), **Profissional (R$ 99–119 — "Mais popular" badge, accent border, slightly elevated)**, Clínica (R$ 189–249). Cards ordered low→high; 4–6 decision-driving features each, "Tudo do plano anterior, mais…" phrasing; one CTA per card.
- Below cards: **feature comparison table** grouped by category (Clínica, IA, Paciente, Financeiro, Suporte), sticky header, collapsible on mobile.
- Trust row near CTAs (LGPD, dados no Brasil, cancele quando quiser) + **on-page FAQ** (accordions: trial, downgrade sem perder dados, nota fiscal, migração da Dietbox/Nutrium).
- Mobile: cards stacked vertically, toggle sticks to top on scroll, comparison table behind "Comparar planos" expander.

### P2 — Signup `/cadastro`

- Single-column centered card. Fields: nome, e-mail, senha (with strength meter), CREF/CRN number (optional at this step — don't gate signup on it), one branching question: "Você já atende pacientes?" (Sim / Ainda sou estudante) → routes plan and onboarding copy.
- Social login (Google) above the fold; LGPD consent checkbox (terms + privacy) with plain-language summary.
- Post-submit: verify-email screen with resend timer and "não chegou?" help. Clarify what happens next ("Você receberá o acesso em instantes").
- **Criteria:** inline validation, no unnecessary fields, password manager compatible, error messages that teach the fix ("Digite o CRN no formato 12345/P").

### P3 — Login `/entrar`

Minimal card: e-mail, senha, "Lembrar de mim", "Esqueci a senha", Google login, MFA challenge screen (6-digit code, large inputs, "não recebeu o código?" fallback). Lockout messaging is calm and specific.

### P4 — Password reset

Request → confirmation ("Se o e-mail existir, enviamos o link") → new password with strength meter → success with auto-redirect. All states designed; links expire gracefully with a re-request path.

---

## Part 4 — Nutritionist App (pages A0–A12)

### A0 — Onboarding wizard (post-signup, first session)

**Goal: activation = first patient registered + first plan drafted, in under 15 minutes.**

- **Stepper, max 5 steps, one CTA per screen, skippable steps clearly marked:**
  1. **Perfil profissional** — CRN, specialty, photo, clinic name. Progress bar shown ("Passo 1 de 5").
  2. **Marca** — upload logo, pick accent color → live preview of the patient PDF/app. Instant delight moment.
  3. **Primeiro paciente** — add manually OR import (CSV/WhatsApp contact) OR skip with sample patient "Maria (exemplo)" auto-created. Sample data preferred over blank state.
  4. **WhatsApp/conectividade** — optional connect (mark "pode fazer depois"), else skip.
  5. **Primeiro plano com IA** — interactive walkthrough: the AI drafts a plan for the sample patient; the nutritionist edits one item and clicks **Aprovar**. This is the aha moment — make it unavoidable but fast.
- Ends on the dashboard with an **onboarding checklist card** (4 items: convidar paciente real, configurar agenda, criar pacote, conectar WhatsApp) that persists until completed and celebrates completion.
- Rules: no linear feature tours; contextual tooltips appear on first encounter of each area; checklist dismissible but re-openable from the avatar menu.

### A1 — Dashboard / Início `/app`

**Goal: answer in 5 seconds — "what do I need to do today?"**

- **Top row — 4 stat cards** (each with value, previous-period delta, and trend sparkline): Consultas hoje, Pacientes ativos, Planos aguardando aprovação (accent badge if >0), Recebido este mês.
- **Left column (2/3):** "Agenda de hoje" timeline (next appointment highlighted with patient avatar, time, type, join-teleconsult button), then "Pendências da IA" queue — AI drafts awaiting approval, patient questions escalated by the agent, guardrail flags. Each item is an actionable card with Approve/Review buttons (batch-approve allowed only for low-risk items).
- **Right column (1/3):** "Saúde dos pacientes" — adherence alerts ("3 pacientes sem registrar refeições há 4+ dias") with one-click action (enviar check-in via WhatsApp); mini revenue chart; product tips.
- **Empty state (new account):** checklist card occupies main area; stat cards show sample data ghosted with tooltip "Seus números aparecerão aqui".
- **Mobile:** cards stack; agenda first, pendências second.

### A2 — Agenda `/app/agenda`

- Week view default (day/month toggle), time grid 7h–21h, appointment cards colored by type (presencial/online/retorno) with patient name + avatar; drag-to-reschedule **plus** a non-drag alternative (click → "Remarcar" dialog) for accessibility.
- Left mini-panel: day picker calendar, filters (status: confirmada/pendente/falta), "Disponibilidade" quick link.
- Appointment detail opens in right drawer: patient info, confirm/cancel/no-show actions, Pix payment status badge, "Abrir prontuário" and "Iniciar consulta" buttons.
- **New appointment modal:** patient autocomplete, type, duration (smart default 50 min), recurrence, auto-options: send WhatsApp confirmation + reminder toggles (default on), Pix charge link optional.
- No-show action: one click marks falta → offers "Enviar mensagem de remarcação" (AI-drafted, editable).
- **Empty day:** "Nenhuma consulta — compartilhe seu link de agendamento" + copy-link button.
- Public booking page `/agendar/:nutri` (patient-facing, branded): service picker → time slots → name/WhatsApp → (optional) Pix pre-payment → confirmation screen with add-to-calendar. Mobile-first, thumb-zone CTA.

### A3 — Patients list `/app/pacientes`

- Search-first header (name, phone, tag), filter chips (ativos, sem plano vigente, risco de abandono, pacote ativo), sortable table: avatar+name, última consulta, adesão (7-day streak indicator), plano vigente, status financeiro, próxima consulta.
- Row click → patient record (A4). Bulk actions: send check-in, export (with LGPD audit log entry).
- "Novo paciente" primary button top-right; import CSV secondary.
- **Empty state:** illustrated, "Cadastre seu primeiro paciente" + "Importar planilha" + sample-data link.

### A4 — Patient record (prontuário) `/app/pacientes/:id`

**The clinical heart. Information-dense but tab-organized; never one endless scroll.**

- **Header card (always visible):** avatar, name, age, contact, tags/conditions (allergies in `danger` chips — visible on every screen of this patient), objective ("Emagrecimento · -5 kg meta"), quick actions (Iniciar consulta, Novo plano, Cobrar, WhatsApp).
- **Tabs:** Visão geral | Anamnese | Antropometria | Planos | Diário do paciente | Documentos | Financeiro | Histórico.
  - **Visão geral:** AI-generated patient summary card (✨ labeled, "Atualizado em", refresh button), key charts (weight trend, adherence heatmap), latest notes, next appointment.
  - **Anamnese:** structured multi-section form (dados clínicos, histórico familiar, rotina, hábitos, preferências, restrições) — **multi-step with step labels**, autosave every field, low-effort inputs (toggles, chips, sliders over free text), "IA: preencher a partir da última consulta" assist button with review-before-save.
  - **Antropometria:** measurements table + line charts (peso, % gordura, massa magra, circunferências) with consulta markers on the timeline; add-measurement modal with proper numeric inputs and unit toggles.
  - **Planos:** list of plans (vigente highlighted), each with version history (AI drafts and professional edits both in audit trail), duplicate-as-template, PDF preview.
  - **Diário do paciente:** reverse-chronological feed of the patient's photo logs (photo, AI-identified items, confirmed portions, computed macros), adherence calendar.
  - **Documentos/Financeiro/Histórico:** uploads, charges/receipts, full audit timeline.
- All edits logged (quem, quando, o quê) — LGPD/CFN prontuário requirement surfaced as a feature ("Histórico completo").

### A5 — Consultation workspace `/app/consulta/:id`

**Layout: 3 zones.**

- **Left rail (25%):** patient snapshot — allergies chips, current plan summary, last measurements, adherence since last visit, AI pre-consult summary card (✨, generated from diary + last notes: "Paciente manteve 5/7 dias de registro; relata compulsão no fim de semana").
- **Center (50%):** consultation note editor with **AI ambient mode**: "Gravar consulta" button → live transcription indicator → at end, AI drafts structured note (SOAP-like: queixa, avaliação, conduta) as editable sections; each section has Regenerate/Edit/Accept. Consent banner required before recording ("Paciente informado e de acordo").
- **Right rail (25%):** action panel — "Rascunhar novo plano com IA" (uses this consult's data), quick prescriptions, schedule return (date picker), create charge.
- **Footer bar:** finalize consultation button → runs checklist (note approved? plan? next appointment? charge?) then closes with summary toast.
- Guardrails: nothing clinical leaves this screen without the nutritionist pressing Aprovar; the audit log records AI involvement transparently.

### A6 — Meal plan builder `/app/planos/novo`

**The flagship screen. Split layout:**

- **Left (55%):** plan structure — days/meals accordion (Café da manhã, Lanche, Almoço…). Each item: food, portion (household measures first — "1 colher de sopa", grams secondary), substitutions list. Inline food search combobox querying TBCA/TACO with verified-source badge; favorites and "frequent with this patient" surfaced first.
- **Right (45%):** live calculation panel — kcal + macros vs. target (progress bars with tolerance ranges), micronutrient highlights, cost estimate optional. Updates instantly on any edit (deterministic engine, never LLM).
- **AI draft flow:** "Gerar rascunho com IA" opens modal: objective, kcal target (suggested from anthropometry), exclusions (pre-filled from allergies), preferences, number of days → generates → renders in **draft treatment** with ✨ labels.
- **Guardrail layer:** violations pinned as `danger` banners at top + inline red underline on offending items; plan cannot be approved until resolved or overridden with typed justification.
- **Approve & send bar (sticky bottom):** Aprovar plano → choose delivery (app + PDF branded + WhatsApp) → confirmation toast + logged.
- Versioning: every save is a version; "restaurar versão" available; AI vs. human edits distinguished in history.

### A7 — AI Copilot (global) — ⌘J / floating button

- Right-side assistant drawer available on every app screen. Context-aware: on a patient page it knows the patient; on finance it knows the numbers.
- Capabilities by tier: answer questions about the professional's own data ("Quantos pacientes sem retorno este mês?"), draft messages/plans/summaries, explain features.
- UI: chat thread with streaming responses, suggestion chips ("Resumir paciente", "Criar cobrança"), source citations inline, feedback (👍/👎) on each answer, and clear scope note ("Não prescrevo — rascunho para sua aprovação").
- Never blocks the workspace; close/minimize freely. All conversations logged per LGPD.

### A8 — WhatsApp agent configuration `/app/agente`

- **Status card:** connected number, conversations this month vs. quota, template approvals.
- **Behavior settings (plain language, toggles + previews):** which check-ins the agent sends (lembretes de consulta, check-in pós-consulta, cobrança de registro, dúvidas frequentes), tone slider (formal ↔ descontraído), active hours, escalation rules ("encaminhar para mim quando…").
- **Live preview pane:** simulated WhatsApp conversation showing exactly what patients receive; test-send to own number.
- **Scope guardrails UI:** the patient-facing agent only serves pre-approved content (plan, substitutions, education library) — the screen makes this boundary explicit with a visual "o agente pode / não pode" two-column list. Clinical questions → automatic escalation task.
- Consent management: patients opt in on activation; opt-out ("parar") honored instantly and visibly.

### A9 — Financeiro `/app/financeiro`

- **Top stat cards:** Recebido no mês, A receber, Inadimplência, Ticket médio (each with delta vs. previous month).
- **Tabs:** Cobranças | Pacotes | Recibos | Relatórios.
  - Cobranças table: patient, description, value, method (Pix/boleto/cartão), status (paga/pendente/vencida), actions (reenviar lembrete WhatsApp — AI-drafted editable, marcar paga, estornar).
  - "Nova cobrança" modal: patient, value, Pix Automático recurrence toggle, due date, auto-receipt toggle.
  - Pacotes: create package (ex.: 4 consultas/mês, R$ X), assign to patients, track usage (2/4 used) — usage visible on the patient header too.
- Dunning: failed-payment automation settings (retry schedule, WhatsApp reminder cadence) — designed as a simple timeline editor.
- **Empty state:** "Emita sua primeira cobrança por Pix" + sample package templates ("Pacote mensal de acompanhamento").

### A10 — Relatórios `/app/relatorios`

- Three report cards: **Clínico** (evolução de pacientes, adesão média, taxa de retorno), **Operacional** (consultas, no-show %, ocupação da agenda), **Financeiro** (MRR do consultório, inadimplência, pacotes ativos).
- Each opens a dedicated view with date filter, export PDF/CSV (branded), and plain-language insight line under each chart ("Seu no-show caiu de 18% para 11% após ativar lembretes").
- Max 7–8 visuals per view; drill-down on click; all charts from the standard palette.

### A11 — Biblioteca `/app/biblioteca`

- Tabs: Modelos de plano | Receitas | Materiais educativos | Meus documentos.
- Card grid with previews; "Usar como base" button feeds the plan builder; AI can generate new templates from a prompt ("Cardápio low FODMAP para iniciantes") — always draft-labeled and editable.
- Share/public page option per material (marketing for the nutritionist).

### A12 — Configurações `/app/configuracoes`

Left sub-nav, right content; sections:

1. **Perfil profissional** (CRN, specialties, photo, bio, public page toggle).
2. **Consultório & marca** (logo, colors, PDF template preview, custom domain for booking page).
3. **Agenda & disponibilidade** (working hours per weekday, buffer between consults, blocked dates, teleconsult defaults).
4. **Equipe** (invite secretary/colleagues; roles: admin, profissional, recepção — with clear permission matrix; LGPD access log visible to admin).
5. **Privacidade & LGPD** (consent templates, TCLE editor for telenutrição, data-retention policy info — 20-year record keeping, export clinic data, DPAs with subprocessors listed transparently).
6. **Notificações** (per channel, per event matrix with checkboxes).
7. **Integrações** (WhatsApp, Google Calendar, payment provider, future wearables).
8. **Assinatura** (current plan card, usage vs. limits, upgrade/downgrade with proration explanation, payment method — Pix/boleto/cartão, invoices with NF, cancel flow that offers pause + export instead of dark patterns).
9. **Segurança** (MFA, active sessions, login history, session timeout setting).

---

## Part 5 — Patient PWA (pages B0–B7)

Design mantra: **a tired patient at 22h must be able to log dinner in under 30 seconds with one thumb.**

### B0 — Invite & activation (deep link from WhatsApp)

- Nutritionist sends invite → patient taps WhatsApp link → branded welcome screen ("Dra. Ana te convidou para acompanhar seu plano por aqui") → minimal signup (name, WhatsApp number, birth date) → **consent screen** (plain-language, granular toggles: plano e mensagens / lembretes / receber conteúdo educativo) → "Adicionar à tela inicial" prompt → lands on B1.
- No app-store download required; keep total activation under 90 seconds.

### B1 — Hoje (home) `/paciente`

- Greeting + streak chip ("🔥 6 dias registrando" — reward, not pressure; reset copy is kind).
- **Card 1 — Próxima refeição do plano:** what's next ("Almoço — ver opções"), tap to view.
- **Card 2 — Registrar agora:** big camera button (FAB also always available).
- **Card 3 — Progresso rápido:** mini weight chart + last check-in.
- **Card 4 — Agenda:** next appointment with confirm button.
- Pull-to-refresh; offline banner pattern; everything readable at 16 px+.

### B2 — Plano alimentar `/paciente/plano`

- Day selector (pills) → meals accordion; each item shows portion in household measures + photo thumbnail of the food when available.
- **Substituições:** "Trocar este alimento" opens the nutritionist-approved substitution list (no free-form AI here — only approved equivalents), tap-to-swap updates the day.
- Offline-cached; "Baixar PDF" with the nutritionist's branding; plan version date shown ("Atualizado pela sua nutricionista em 20/09").

### B3 — Diário & photo logging `/paciente/diario`

- **Capture flow (the critical path):** FAB → camera opens immediately (or gallery) → photo taken → AI processes with friendly skeleton ("Analisando seu prato…") → **draft card**: detected items as editable chips + portion steppers ("1 porção média — ajustar") → "Confirmar" (big, thumb-zone) or "Adicionar item".
- Low-confidence results say so honestly ("Não reconheci tudo — complete os itens") and never block logging; manual search fallback always one tap away.
- After confirm: instant positive feedback (checkmark + "Registrado! Sua nutricionista acompanha sua evolução") and day-timeline update.
- Diary view: day timeline with photos; week calendar strip with adherence dots; **no calorie-shaming UI** — patient sees targets as gentle progress rings, not red alarms (nutritionist controls whether numbers are visible at all).

### B4 — Progresso `/paciente/progresso`

- Weight chart (line, consulta markers), measurements history, optional photo comparison (private by default; explicit consent to share), milestones/badges (unobtrusive), "registrar peso" quick action with large numeric keypad.
- Framing is motivational and judgment-free; trend-focused ("-2,3 kg em 6 semanas"), never daily-fluctuation anxiety.

### B5 — Assistente / Chat `/paciente/chat`

- Chat with the practice agent (mirrors WhatsApp behavior for app users): suggestion chips ("O que posso comer no lugar de…?", "Tenho consulta quando?"), quick actions, typing indicator.
- Hard boundaries visible: chip at top states "Assistente do consultório — questões clínicas são encaminhadas à sua nutricionista". Out-of-scope → graceful escalation with promised timeframe + creates task for the professional.
- The agent speaks only from approved content (plan, substitutions, education library) — never free-form clinical advice.

### B6 — Teleconsulta & TCLE `/paciente/consulta/:id`

- Pre-join screen: TCLE presentation (first time only) with readable summary + "Li e aceito" (logged with timestamp/version — CFN 760/2023), device check (camera/mic), join button.
- In-call: simple video UI (patient needs zero controls beyond mute/camera/end), chat side panel, post-call screen with summary ("Sua nutricionista atualizará seu plano") and satisfaction prompt (optional).

### B7 — Perfil & Meus dados `/paciente/perfil`

- Personal info, notification preferences (WhatsApp/push toggles), consent management (view/revoke each consent with clear consequences), **data rights**: export my data, delete my account (explains 20-year clinical record retention obligation vs. account deletion honestly), linked nutritionist info, help/support.

---

## Part 6 — System-wide states inventory (design every one)

**Empty states (first-use):** dashboard, agenda (day/week), patients list, patient record tabs, plans list, financeiro (each tab), relatórios, biblioteca, agente (not connected), patient diary, patient progress. Each: why empty + one CTA + template/sample option.

**No-results states:** patient search, food search ("Não encontramos 'X' na TBCA — tente outro termo ou cadastre alimento personalizado"), filters. Always restate query + offer fix.

**Error states:** offline (PWA queue banner), payment failed (patient + nutritionist variants), WhatsApp disconnected (with reconnect CTA), AI unavailable (graceful degradation, Part 2.2 #7), 403 (permission — who to ask), 404 (friendly, link home), 500 (calm, "dados seguros", retry).

**Loading:** skeletons everywhere; AI generation states with progress narration ("Consultando a TBCA…", "Verificando restrições alimentares…") — doubles as trust-building.

**Success/celebration:** plan approved, charge paid (Pix confetti-subtle), streak milestones, checklist completion.

**Notifications catalog (copy included in build):** appointment confirmations/reminders, no-show follow-up, plan approved, escalated patient question, payment received/failed, adherence alerts, weekly digest (patient), morning summary (nutritionist).

---

## Part 7 — Acceptance checklists (run per page)

**Every page must pass:**
- [ ] One obvious primary action; no competing CTAs
- [ ] Loading, empty, error, and success states designed and implemented
- [ ] WCAG 2.2 AA: contrast ≥4.5:1, focus visible and unobscured, full keyboard operability, targets ≥44 px, no color-only meaning, labels on all inputs and icons
- [ ] Mobile layout verified on a real 360 px device; primary actions in thumb zone
- [ ] PT-BR copy reviewed: plain language for patients, no jargon; clinical terms only for professionals
- [ ] LGPD: no sensitive data in URLs/analytics payloads; audit log entry for record access
- [ ] AI content: ✨ labeled, draft-until-approved, source shown, guardrail path tested with an allergen test-case
- [ ] Analytics events instrumented (view, primary action, drop-off)

**North-star UX metrics to instrument:** time-to-first-plan (onboarding), consultation cycle time (start → approved plan), patient logging streaks and 30-day adherence, guardrail catch rate, AI draft acceptance rate, no-show rate, activation rate (target >50% vs. ~38% median), TTV < 15 min.

---

*Documento de especificação de design — conteúdo informativo para orientar produto e engenharia; decisões clínicas e regulatórias permanecem com o nutricionista responsável e assessoria jurídica.*
