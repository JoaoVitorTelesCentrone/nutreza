import { requireStaff } from "@/features/pacientes/application/context";
import { createManagementAdmin } from "@/features/gestao/infrastructure/admin-client";
import { createFinanceAdmin } from "@/features/financeiro/infrastructure/admin-client";
import { createPhase8Admin } from "@/features/comunicacao/infrastructure/admin-client";

export const runtime = "nodejs";
export async function GET() {
  const { profile } = await requireStaff(); if (profile.papel !== "admin") return new Response("Não autorizado", { status: 403 });
  const admin = createManagementAdmin(), finance = createFinanceAdmin(), communication = createPhase8Admin(), clinicId = profile.clinica_id;
  const [clinic, members, patients, appointments, plans, charges, packages, consents, waConsents, sessions, acceptances, library, tickets] = await Promise.all([
    admin.from("clinica").select("*").eq("id", clinicId), admin.from("perfil").select("*").eq("clinica_id", clinicId),
    admin.from("paciente").select("*").eq("clinica_id", clinicId), admin.from("agendamento").select("*").eq("clinica_id", clinicId),
    admin.from("plano_alimentar").select("*").eq("clinica_id", clinicId), finance.from("financeiro_cobranca").select("*").eq("clinica_id", clinicId),
    finance.from("financeiro_pacote").select("*").eq("clinica_id", clinicId), admin.from("patient_consent_event").select("*").eq("clinica_id", clinicId),
    communication.from("whatsapp_consent_event").select("*").eq("clinica_id", clinicId), communication.from("teleconsulta_sessao").select("*").eq("clinica_id", clinicId),
    communication.from("teleconsulta_aceite").select("*").eq("clinica_id", clinicId), admin.from("biblioteca_item").select("*").eq("clinica_id", clinicId), admin.from("suporte_ticket").select("*").eq("clinica_id", clinicId),
  ]);
  const payload = { exportado_em: new Date().toISOString(), clinica_id: clinicId, dados: { clinic: clinic.data, members: members.data, patients: patients.data, appointments: appointments.data, plans: plans.data, charges: charges.data, packages: packages.data, consents: consents.data, whatsapp_consents: waConsents.data, telehealth_sessions: sessions.data, telehealth_acceptances: acceptances.data, library: library.data, support: tickets.data } };
  return new Response(JSON.stringify(payload, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="nutreza-export-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" } });
}
