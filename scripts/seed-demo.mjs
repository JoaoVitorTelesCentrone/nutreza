import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = "demo@nutreza.local";
const DEMO_PASSWORD = "DemoNutreza2026!";
const DEMO_NAME = "Dra. Marina Alves";

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

const env = loadEnv(".env.local");
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = env.SUPABASE_SECRET_KEY;
if (!url || !publicKey || !secretKey) throw new Error(".env.local não contém as credenciais locais do Supabase.");

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
  const meal = assertResult(
    await userClient.from("plano_refeicao").insert({
      plano_id: plan.id,
      clinica_id: clinic.id,
      paciente_id: ana.id,
      nome: "Café da manhã",
      horario: "07:30",
      ordem: 1,
    }).select("*").single(),
    "criar refeição do plano",
  );
  const food = assertResult(await admin.from("alimento").select("id,nome").limit(1).single(), "consultar alimento-base");
  assertResult(
    await userClient.from("plano_item").insert({
      plano_id: plan.id,
      refeicao_id: meal.id,
      clinica_id: clinic.id,
      paciente_id: ana.id,
      ordem: 1,
      alimento_id: food.id,
      gramas: 100,
      observacao: "Combinar com uma fruta e café sem açúcar.",
    }),
    "adicionar alimento ao plano",
  );
  plan = assertResult(
    await userClient.from("plano_alimentar").update({
      status: "aprovado",
      alergias_revisadas: true,
      aprovado_por: user.id,
    }).eq("id", plan.id).select("*").single(),
    "aprovar plano alimentar",
  );
}

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
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD,
  clinic: clinic.nome,
  patients: patients.length,
  appointments: appointments.length,
  publicSchedule: "/agendar/nutreza-demo",
}, null, 2));
