import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { createClient } from "@/shared/lib/supabase/server";
import { nutrientsFromSnapshot, sumNutrients } from "@/features/planos/domain/nutrients";

export const runtime = "nodejs";

type Source = { fonte?: string; versao?: string; codigo?: string; atribuicao?: string; referencia_url?: string };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; planId: string }> }) {
  const { id, planId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(planId)) return new Response(null, { status: 404 });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return new Response(null, { status: 401 });
  const userId = String(claims.claims.sub);
  const { data: patientLink } = await supabase.from("paciente_acesso").select("paciente_id")
    .eq("paciente_id", id).eq("user_id", userId).maybeSingle();
  let showNutrition = !patientLink;
  if (patientLink) {
    const { data: nutritionConsent } = await supabase.from("patient_consent_event").select("aceito")
      .eq("paciente_id", id).eq("user_id", userId).eq("finalidade", "exibir_nutrientes")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    showNutrition = nutritionConsent?.aceito === true;
  }
  const [{ data: plan }, { data: patient }] = await Promise.all([
    supabase.from("plano_alimentar").select("*").eq("id", planId).eq("paciente_id", id).eq("status", "aprovado").single(),
    supabase.from("paciente").select("id,nome").eq("id", id).single(),
  ]);
  if (!plan || !patient) return new Response(null, { status: 404 });
  const [{ data: meals }, { data: items }] = await Promise.all([
    supabase.from("plano_refeicao").select("*").eq("plano_id", planId).order("ordem"),
    supabase.from("plano_item").select("*").eq("plano_id", planId).order("ordem"),
  ]);
  if (!meals || !items) return new Response(null, { status: 500 });

  const doc = await PDFDocument.create();
  doc.setTitle(`${plan.titulo} - ${patient.nome} - versao ${plan.versao}`);
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(await readFile(path.join(process.cwd(), "public", "brand", "logo-horizontal.png")));
  const green = rgb(0.18, 0.49, 0.36);
  const ink = rgb(0.09, 0.25, 0.20);
  const muted = rgb(0.37, 0.43, 0.39);
  let page: PDFPage;
  let y = 0;
  const beginPage = () => {
    page = doc.addPage([595.28, 841.89]);
    y = 790;
    page.drawImage(logo, { x: 44, y: 775, width: 126, height: 35 });
    page.drawText(`Plano aprovado | versao ${plan.versao}`, { x: 320, y: 790, size: 9, font: bold, color: green });
    page.drawLine({ start: { x: 44, y: 768 }, end: { x: 551, y: 768 }, thickness: 1, color: green });
    y = 746;
  };
  const safe = (value: string, font: PDFFont) => Array.from(value).map((char) => {
    try { font.encodeText(char); return char; } catch { return "?"; }
  }).join("");
  const draw = (value: string, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) => {
    const font = opts.font ?? normal;
    const size = opts.size ?? 10;
    const x = 44 + (opts.indent ?? 0);
    const maxWidth = 551 - x;
    const words = safe(value, font).split(/\s+/);
    let line = "";
    const flush = () => {
      if (!line) return;
      if (y < 55) beginPage();
      page.drawText(line, { x, y, size, font, color: opts.color ?? ink });
      y -= opts.gap ?? size + 5;
      line = "";
    };
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) flush();
      line = line ? `${line} ${word}` : word;
    }
    flush();
  };
  beginPage();
  draw(plan.titulo, { size: 18, font: bold, color: green, gap: 25 });
  draw(`Paciente: ${patient.nome}`, { font: bold });
  draw(`Aprovado em ${new Date(plan.aprovado_em!).toLocaleDateString("pt-BR")} | ID ${plan.id}`, { size: 9, color: muted });
  if (plan.objetivo) { y -= 9; draw("Orientacoes", { font: bold, color: green }); draw(plan.objetivo); }
  const primary = items.filter((item) => !item.substitui_item_id);
  if (showNutrition) {
    const total = sumNutrients(primary.map((item) => nutrientsFromSnapshot(item.nutrientes_snapshot)));
    y -= 10;
    draw(`Total diario: ${total.energia_kcal ?? "-"} kcal | P ${total.proteina_g ?? "-"} g | C ${total.carboidrato_g ?? "-"} g | L ${total.lipidios_g ?? "-"} g`, { font: bold });
    draw(`Metas: ${plan.meta_energia_kcal ?? "-"} kcal | P ${plan.meta_proteina_g ?? "-"} g | C ${plan.meta_carboidrato_g ?? "-"} g | L ${plan.meta_lipidios_g ?? "-"} g`, { size: 9, color: muted });
  }
  for (const meal of meals) {
    y -= 16;
    draw(`${meal.nome}${meal.horario ? ` | ${meal.horario.slice(0, 5)}` : ""}`, { size: 13, font: bold, color: green, gap: 21 });
    for (const item of primary.filter((entry) => entry.refeicao_id === meal.id)) {
      const n = nutrientsFromSnapshot(item.nutrientes_snapshot);
      draw(`${item.nome_snapshot} | ${item.gramas} g${showNutrition ? ` | ${n.energia_kcal ?? "-"} kcal` : ""}`, { font: bold, indent: 9 });
      if (item.observacao) draw(item.observacao, { size: 9, indent: 9 });
      for (const alternative of items.filter((entry) => entry.substitui_item_id === item.id)) {
        draw(`Substituicao: ${alternative.nome_snapshot} | ${alternative.gramas} g`, { size: 9, indent: 18, color: muted });
      }
    }
  }
  const sources = new Map<string, Source>();
  for (const item of items) {
    if (Array.isArray(item.fonte_snapshot)) for (const source of item.fonte_snapshot as Source[]) {
      if (source.fonte) sources.set(`${source.fonte}:${source.versao}`, source);
    }
  }
  y -= 16;
  draw("Fontes dos dados nutricionais", { font: bold, color: green });
  if (sources.size === 0) draw("Composicoes cadastradas pelo profissional.", { size: 9 });
  for (const source of sources.values()) {
    draw(`${source.fonte} | versao ${source.versao ?? "nao informada"}`, { size: 9 });
    if (source.atribuicao) draw(source.atribuicao, { size: 9, indent: 8 });
    if (source.referencia_url) draw(source.referencia_url, { size: 8, indent: 8, color: muted });
  }
  if ([...sources.values()].some((source) => source.fonte === "TACO" && !source.atribuicao)) {
    draw("TACO - Tabela Brasileira de Composicao de Alimentos, NEPA/UNICAMP, 4a edicao.", { size: 9 });
  }
  draw("Substituicoes sao alternativas e nao entram no total diario. Use somente esta versao aprovada.", { size: 8, color: muted });
  const bytes = await doc.save();
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="plano-alimentar-v${plan.versao}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
