import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { notFound } from "next/navigation";
import { requireStaff } from "@/features/pacientes/application/context";
import { createFinanceAdmin } from "@/features/financeiro/infrastructure/admin-client";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, profile, userId } = await requireStaff();
  const admin = createFinanceAdmin();
  const { data: charge } = await admin.from("financeiro_cobranca").select("*").eq("id", id).eq("clinica_id", profile.clinica_id)
    .in("status", ["recebida", "devolvida_parcial", "devolvida_total"]).single();
  if (!charge?.recibo_numero || !charge.recebida_em) notFound();
  const [{ data: clinic }, { data: patient }] = await Promise.all([
    supabase.from("clinica").select("nome").eq("id", profile.clinica_id).single(),
    supabase.from("paciente").select("nome").eq("id", charge.paciente_id).eq("clinica_id", profile.clinica_id).single(),
  ]);
  if (!clinic || !patient) notFound();
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.18, 0.49, 0.36);
  page.drawText("NUTREZA · COMPROVANTE DE RECEBIMENTO", { x: 48, y: 780, size: 15, font: bold, color: green });
  page.drawText(`Recibo nº ${String(charge.recibo_numero).padStart(6, "0")}`, { x: 48, y: 742, size: 13, font: bold });
  const lines = [
    `Recebedor: ${clinic.nome}`,
    `Paciente: ${patient.nome}`,
    `Descrição: ${charge.descricao}`,
    `Valor recebido: R$ ${(charge.valor_centavos / 100).toFixed(2).replace(".", ",")}`,
    `Data do recebimento: ${new Date(charge.recebida_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
    "Forma de pagamento: Pix",
    `Cobrança: ${charge.id}`,
  ];
  let y = 690;
  for (const line of lines) { page.drawText(line, { x: 48, y, size: 12, font: regular }); y -= 30; }
  page.drawLine({ start: { x: 48, y: y - 4 }, end: { x: 547, y: y - 4 }, thickness: 1, color: rgb(0.85, 0.89, 0.86) });
  page.drawText("Este documento comprova o recebimento informado pelo provedor de pagamento.", { x: 48, y: y - 32, size: 9, font: regular, color: rgb(0.36, 0.43, 0.39) });
  page.drawText("Não substitui documento fiscal quando exigido.", { x: 48, y: y - 48, size: 9, font: regular, color: rgb(0.36, 0.43, 0.39) });
  if (charge.devolvido_centavos > 0) page.drawText(`Estornado: R$ ${(charge.devolvido_centavos / 100).toFixed(2).replace(".", ",")}`, { x: 48, y: y - 78, size: 11, font: bold, color: rgb(0.72, 0.29, 0.31) });
  const bytes = await pdf.save();
  await supabase.from("audit_log").insert({ clinica_id: profile.clinica_id, paciente_id: charge.paciente_id, ator_id: userId, acao: "download", entidade: "financeiro_recibo", entidade_id: charge.id });
  return new Response(Buffer.from(bytes), { headers: {
    "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="recibo-${String(charge.recibo_numero).padStart(6, "0")}.pdf"`,
    "Cache-Control": "private, no-store",
  } });
}
