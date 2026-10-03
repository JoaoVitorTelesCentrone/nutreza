import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = "demo@nutreza.local";
const DEMO_PASSWORD = "DemoNutreza2026!";
const DEMO_NAME = "Dra. Marina Alves";
const PATIENT_EMAIL = "paciente@nutreza.local";
const PATIENT_PASSWORD = "PacienteNutreza2026!";

function loadEnv(path) {
  const values = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function assertResult(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function nextWeekday(targetDay, hour) {
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  let add = (targetDay - local.getDay() + 7) % 7;
  if (add === 0 || add < 2) add += 7;
  local.setDate(local.getDate() + add);
  const day = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
  return new Date(`${day}T${String(hour).padStart(2, "0")}:00:00-03:00`);
}

async function findOrInsert(client, table, filters, payload, label) {
  let query = client.from(table).select("*");
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
  const existing = assertResult(await query.limit(1).maybeSingle(), `${label} (consulta)`);
  if (existing) return existing;
  return assertResult(await client.from(table).insert(payload).select("*").single(), `${label} (criação)`);
}

const envPath = existsSync("apps/web/.env.local") ? "apps/web/.env.local" : ".env.local";
const env = loadEnv(envPath);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = env.SUPABASE_SECRET_KEY;
if (!url || !publicKey || !secretKey) throw new Error(`${envPath} não contém as credenciais locais do Supabase.`);

const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const userClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });

const listedUsers = assertResult(await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }), "listar usuários");
let user = listedUsers.users.find((candidate) => candidate.email === DEMO_EMAIL);
if (!user) {
  const created = assertResult(
    await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: DEMO_NAME },
    }),
    "criar usuário demo",
  );
  user = created.user;
} else {
  const updated = assertResult(
    await admin.auth.admin.updateUserById(user.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { ...user.user_metadata, nome: DEMO_NAME },
    }),
    "atualizar usuário demo",
  );
  user = updated.user;
}

const signedIn = assertResult(
  await userClient.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  "autenticar conta demo",
);
if (!signedIn.user) throw new Error("A conta demo não retornou uma sessão autenticada.");

let clinic = assertResult(
  await userClient.from("clinica").select("*").eq("created_by", user.id).maybeSingle(),
  "consultar clínica demo",
);
if (!clinic) {
  clinic = assertResult(
    await userClient.from("clinica").insert({ nome: "Clínica Nutreza Jardins", created_by: user.id }).select("*").single(),
    "criar clínica demo",
  );
}

const existingProfile = assertResult(
  await userClient.from("perfil").select("user_id").eq("user_id", user.id).maybeSingle(),
  "consultar perfil demo",
);
if (!existingProfile) {
  assertResult(
    await userClient.from("perfil").insert({
      user_id: user.id,
      clinica_id: clinic.id,
      nome: DEMO_NAME,
      papel: "admin",
      crn: "CRN-3 12345",
    }),
    "configurar perfil demo",
  );
}

const professionalPlan = assertResult(
  await admin.from("saas_plano").select("id").eq("slug", "profissional").single(),
  "consultar plano profissional",
);
const now = new Date();
const periodEnd = new Date(now);
periodEnd.setDate(periodEnd.getDate() + 30);
assertResult(
  await admin.from("saas_assinatura").upsert(
    {
      clinica_id: clinic.id,
      plano_id: professionalPlan.id,
      status: "ativa",
      provedor: "simulado",
      periodo_inicio: now.toISOString(),
      periodo_fim: periodEnd.toISOString(),
      cancelar_ao_fim: false,
    },
    { onConflict: "clinica_id" },
  ),
  "ativar assinatura demo",
);

assertResult(
  await userClient.from("agenda_config").upsert(
    {
      clinica_id: clinic.id,
      slug: "nutreza-demo",
      timezone: "America/Sao_Paulo",
      antecedencia_horas: 2,
      horizonte_dias: 90,
      cancelamento_horas: 12,
      ativa: true,
    },
    { onConflict: "clinica_id" },
  ),
  "configurar agenda",
);

const inPersonService = await findOrInsert(
  userClient,
  "agenda_servico",
  { clinica_id: clinic.id, nome: "Consulta nutricional" },
  {
    clinica_id: clinic.id,
    profissional_id: user.id,
    nome: "Consulta nutricional",
    tipo: "presencial",
    modalidade: "presencial",
    duracao_minutos: 60,
    intervalo_minutos: 10,
    ativo: true,
  },
  "serviço presencial",
);
const onlineService = await findOrInsert(
  userClient,
  "agenda_servico",
  { clinica_id: clinic.id, nome: "Teleconsulta de acompanhamento" },
  {
    clinica_id: clinic.id,
    profissional_id: user.id,
    nome: "Teleconsulta de acompanhamento",
    tipo: "online",
    modalidade: "online",
    duracao_minutos: 45,
    intervalo_minutos: 10,
    ativo: true,
  },
  "serviço online",
);

for (const weekday of [1, 2, 3, 4, 5]) {
  await findOrInsert(
    userClient,
    "agenda_disponibilidade",
    { clinica_id: clinic.id, profissional_id: user.id, dia_semana: weekday },
    {
      clinica_id: clinic.id,
      profissional_id: user.id,
      dia_semana: weekday,
      inicio_hora: "08:00",
      fim_hora: "18:00",
      ativo: true,
    },
    `disponibilidade ${weekday}`,
  );
}

const patientDefinitions = [
  { nome: "Ana Carolina Souza", nascimento: "1992-04-18", sexo: "feminino", email: "ana.souza@example.test", telefone: "+5511991112233" },
  { nome: "Bruno Martins Lima", nascimento: "1987-09-03", sexo: "masculino", email: "bruno.lima@example.test", telefone: "+5511982223344" },
  { nome: "Camila Ferreira Rocha", nascimento: "1998-01-22", sexo: "feminino", email: "camila.rocha@example.test", telefone: "+5511973334455" },
];
const patients = [];
for (const definition of patientDefinitions) {
  const patient = await findOrInsert(
    userClient,
    "paciente",
    { clinica_id: clinic.id, email: definition.email },
    { ...definition, clinica_id: clinic.id, cadastrado_por: user.id, status: "ativo" },
    `paciente ${definition.nome}`,
  );
  patients.push(patient);
}
const [ana, bruno, camila] = patients;

const refreshedUsers = assertResult(await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }), "listar contas de paciente");
let patientUser = refreshedUsers.users.find((candidate) => candidate.email === PATIENT_EMAIL);
if (!patientUser) {
  const created = assertResult(
    await admin.auth.admin.createUser({
      email: PATIENT_EMAIL,
      password: PATIENT_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: ana.nome, tipo: "paciente" },
    }),
    "criar conta demo do paciente",
  );
  patientUser = created.user;
} else {
  const updated = assertResult(
    await admin.auth.admin.updateUserById(patientUser.id, {
      password: PATIENT_PASSWORD,
      email_confirm: true,
      user_metadata: { ...patientUser.user_metadata, nome: ana.nome, tipo: "paciente" },
    }),
    "atualizar conta demo do paciente",
  );
  patientUser = updated.user;
}

await findOrInsert(
  admin,
  "paciente_acesso",
  { paciente_id: ana.id, user_id: patientUser.id },
  { paciente_id: ana.id, clinica_id: clinic.id, user_id: patientUser.id, vinculado_por: user.id },
  "vincular conta demo ao paciente",
);

await findOrInsert(
  userClient,
  "alergia",
  { paciente_id: ana.id, substancia: "Lactose" },
  {
    clinica_id: clinic.id,
    paciente_id: ana.id,
    substancia: "Lactose",
    gravidade: "moderada",
    observacao: "Desconforto gastrointestinal; priorizar opções sem lactose.",
    registrado_por: user.id,
  },
  "alergia da paciente",
);
await findOrInsert(
  userClient,
  "anamnese",
  { paciente_id: ana.id, versao: 1 },
  {
    clinica_id: clinic.id,
    paciente_id: ana.id,
    versao: 1,
    dados: {
      objetivo: "Melhorar composição corporal e energia ao longo do dia",
      rotina: "Trabalho em escritório, treina musculação três vezes por semana",
      sono: "7 horas por noite",
      hidratacao: "Aproximadamente 2 litros por dia",
    },
    registrado_por: user.id,
  },
  "anamnese da paciente",
);
const measureDate = new Date();
measureDate.setDate(measureDate.getDate() - 8);
const existingMeasurement = assertResult(
  await userClient.from("antropometria").select("id,paciente_id,medida_em").eq("paciente_id", ana.id).eq("medida_em", isoDate(measureDate)).maybeSingle(),
  "consultar antropometria da paciente",
);
if (!existingMeasurement) {
  assertResult(await userClient.from("antropometria").insert({
    clinica_id: clinic.id,
    paciente_id: ana.id,
    medida_em: isoDate(measureDate),
    peso_kg: 68.4,
    altura_cm: 165,
    cintura_cm: 78,
    gordura_pct: 29.1,
    massa_magra_kg: 48.5,
    observacao: "Avaliação inicial da jornada demonstrativa.",
    registrado_por: user.id,
  }), "criar antropometria da paciente");
}

const appointments = [
  { patient: ana, service: onlineService, start: nextWeekday(1, 14), status: "confirmado", note: "Retorno para revisar adesão ao plano." },
  { patient: bruno, service: inPersonService, start: nextWeekday(3, 10), status: "confirmado", note: "Primeira consulta nutricional." },
  { patient: camila, service: inPersonService, start: nextWeekday(5, 16), status: "solicitado", note: "Avaliação de rotina e esportes." },
];
for (const item of appointments) {
  const duration = item.service.duracao_minutos;
  const end = new Date(item.start.getTime() + duration * 60_000);
  const occupiedUntil = new Date(end.getTime() + item.service.intervalo_minutos * 60_000);
  await findOrInsert(
    userClient,
    "agendamento",
    { clinica_id: clinic.id, paciente_id: item.patient.id, inicio: item.start.toISOString() },
    {
      clinica_id: clinic.id,
      servico_id: item.service.id,
      profissional_id: user.id,
      paciente_id: item.patient.id,
      nome_contato: item.patient.nome,
      email_contato: item.patient.email,
      telefone_contato: item.patient.telefone,
      inicio: item.start.toISOString(),
      fim: end.toISOString(),
      ocupado_ate: occupiedUntil.toISOString(),
      intervalo_minutos: item.service.intervalo_minutos,
      modalidade: item.service.modalidade,
      status: item.status,
      origem: "interno",
      lembretes_email: true,
      observacao: item.note,
      created_by: user.id,
    },
    `agendamento de ${item.patient.nome}`,
  );
}

let plan = assertResult(
  await userClient.from("plano_alimentar").select("*").eq("paciente_id", ana.id).eq("titulo", "Plano Equilíbrio e Energia").limit(1).maybeSingle(),
  "consultar plano alimentar",
);
if (!plan) {
  plan = assertResult(
    await userClient.from("plano_alimentar").insert({
      clinica_id: clinic.id,
      paciente_id: ana.id,
      titulo: "Plano Equilíbrio e Energia",
      objetivo: "Organizar a rotina alimentar, aumentar saciedade e apoiar os treinos.",
      meta_energia_kcal: 1850,
      meta_proteina_g: 115,
      meta_carboidrato_g: 210,
      meta_lipidios_g: 60,
      created_by: user.id,
    }).select("*").single(),
    "criar plano alimentar",
  );
}
const meal = await findOrInsert(
  userClient,
  "plano_refeicao",
  { plano_id: plan.id, ordem: 1 },
  { plano_id: plan.id, clinica_id: clinic.id, paciente_id: ana.id, nome: "Café da manhã", horario: "07:30", ordem: 1 },
  "criar refeição do plano",
);
let food = assertResult(await userClient.from("alimento").select("id,nome").limit(1).maybeSingle(), "consultar alimento-base");
if (!food) {
  food = assertResult(
    await userClient.from("alimento").insert({
      clinica_id: clinic.id,
      nome: "Aveia em flocos",
      grupo: "Cereais",
      energia_kcal_100g: 394,
      proteina_g_100g: 13.9,
      carboidrato_g_100g: 66.6,
      lipidios_g_100g: 8.5,
      fibra_g_100g: 9.1,
      sodio_mg_100g: 5,
      dados_ausentes: [],
      alergenicos: [],
      created_by: user.id,
    }).select("id,nome").single(),
    "criar alimento-base demo",
  );
}
await findOrInsert(
  userClient,
  "plano_item",
  { plano_id: plan.id, refeicao_id: meal.id, ordem: 1 },
  {
    plano_id: plan.id,
    refeicao_id: meal.id,
    clinica_id: clinic.id,
    paciente_id: ana.id,
    ordem: 1,
    alimento_id: food.id,
    gramas: 100,
    observacao: "Combinar com uma fruta e café sem açúcar.",
  },
  "adicionar alimento ao plano",
);
if (plan.status !== "aprovado") {
  plan = assertResult(
    await userClient.from("plano_alimentar").update({
      status: "aprovado",
      alergias_revisadas: true,
      aprovado_por: user.id,
    }).eq("id", plan.id).select("*").single(),
    "aprovar plano alimentar",
  );
}

let questionnaire = assertResult(
  await userClient.from("questionario").select("id").eq("clinica_id", clinic.id).eq("titulo", "Check-in semanal").maybeSingle(),
  "consultar questionário demo",
);
if (!questionnaire) {
  const questionnaireId = assertResult(
    await userClient.rpc("create_questionnaire_draft", {
      p_title: "Check-in semanal",
      p_description: "Um acompanhamento rápido sobre energia, adesão e dificuldades da semana.",
    }),
    "criar questionário demo",
  );
  questionnaire = { id: questionnaireId };
}
let questionnaireVersion = assertResult(
  await userClient.from("questionario_versao").select("id,status").eq("questionario_id", questionnaire.id).order("numero", { ascending: false }).limit(1).single(),
  "consultar versão do questionário demo",
);
const existingQuestions = assertResult(
  await userClient.from("questionario_questao").select("id").eq("versao_id", questionnaireVersion.id),
  "consultar perguntas do questionário demo",
);
if (existingQuestions.length === 0) {
  assertResult(
    await userClient.from("questionario_questao").insert([
      { versao_id: questionnaireVersion.id, clinica_id: clinic.id, ordem: 1, enunciado: "Como esteve sua energia nesta semana?", tipo: "escala", obrigatoria: true, configuracao: { minimo: 1, maximo: 5 } },
      { versao_id: questionnaireVersion.id, clinica_id: clinic.id, ordem: 2, enunciado: "Qual foi sua maior dificuldade com o plano?", tipo: "texto_longo", obrigatoria: false, configuracao: {} },
    ]),
    "adicionar perguntas ao questionário demo",
  );
}
if (questionnaireVersion.status !== "publicada") {
  const publishedId = assertResult(
    await userClient.rpc("publish_questionnaire", { p_questionnaire_id: questionnaire.id }),
    "publicar questionário demo",
  );
  questionnaireVersion = { id: publishedId, status: "publicada" };
}

await findOrInsert(
  userClient,
  "questionario_atribuicao",
  { paciente_id: ana.id, versao_id: questionnaireVersion.id },
  { clinica_id: clinic.id, paciente_id: ana.id, versao_id: questionnaireVersion.id, atribuida_por: user.id },
  "atribuir questionário demo",
);

const charges = [
  { patient: ana, reference: `demo-${clinic.id}-ana`, value: 28000, status: "recebida", description: "Consulta nutricional e plano alimentar" },
  { patient: bruno, reference: `demo-${clinic.id}-bruno`, value: 22000, status: "recebida", description: "Consulta nutricional presencial" },
  { patient: camila, reference: `demo-${clinic.id}-camila`, value: 22000, status: "pendente", description: "Avaliação nutricional esportiva" },
];
for (const charge of charges) {
  const due = new Date();
  due.setDate(due.getDate() + (charge.status === "pendente" ? 5 : -2));
  await findOrInsert(
    admin,
    "financeiro_cobranca",
    { referencia_externa: charge.reference },
    {
      clinica_id: clinic.id,
      paciente_id: charge.patient.id,
      valor_centavos: charge.value,
      descricao: charge.description,
      referencia_externa: charge.reference,
      status: charge.status,
      vencimento: isoDate(due),
      pagamento_provedor_id: charge.status === "recebida" ? `pay-${charge.reference}` : null,
      recibo_numero: charge.status === "recebida" ? Math.floor(charge.value / 100) + 1000 : null,
      recebida_em: charge.status === "recebida" ? new Date(Date.now() - 2 * 86_400_000).toISOString() : null,
      criada_por: user.id,
    },
    `cobrança de ${charge.patient.nome}`,
  );
}

await findOrInsert(
  admin,
  "biblioteca_item",
  { clinica_id: clinic.id, titulo: "Guia prático de organização alimentar" },
  {
    clinica_id: clinic.id,
    titulo: "Guia prático de organização alimentar",
    categoria: "orientacao",
    conteudo: "Planeje as refeições principais da semana, mantenha opções simples disponíveis e ajuste as porções conforme as orientações do plano individual.",
    status: "publicado",
    criado_por: user.id,
    publicado_por: user.id,
    publicado_em: now.toISOString(),
  },
  "item da biblioteca",
);
assertResult(
  await admin.from("whatsapp_config").upsert(
    {
      clinica_id: clinic.id,
      provedor: "simulado",
      ativo: true,
      graph_api_version: "v24\\.0",
      telefone_exibicao: "+55 11 4000-2026",
      fuso_horario: "America/Sao_Paulo",
      janela_inicio: "08:00",
      janela_fim: "19:00",
      limite_diario: 100,
      updated_by: user.id,
    },
    { onConflict: "clinica_id" },
  ),
  "configurar WhatsApp simulado",
);
await findOrInsert(
  admin,
  "teleconsulta_termo",
  { clinica_id: clinic.id, versao: "demo-v1" },
  {
    clinica_id: clinic.id,
    versao: "demo-v1",
    conteudo: "Autorizo a realização da teleconsulta nutricional por videoconferência e declaro estar ciente das orientações de privacidade e atendimento remoto.",
    status: "publicado",
    criado_por: user.id,
    publicado_por: user.id,
    publicado_em: now.toISOString(),
  },
  "termo de teleconsulta",
);

await userClient.auth.signOut();
console.log(JSON.stringify({
  ok: true,
  web: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  mobile: { email: PATIENT_EMAIL, password: PATIENT_PASSWORD },
  clinic: clinic.nome,
  patients: patients.length,
  appointments: appointments.length,
  publicSchedule: "/agendar/nutreza-demo",
}, null, 2));
