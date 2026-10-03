import { NextResponse } from "next/server";
import { canAccessClinical, requirePatient } from "@/features/pacientes/application/context";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await params;
  const { supabase, patient, profile } = await requirePatient(id);
  if (!canAccessClinical(profile.papel)) return new Response("Acesso negado", { status: 403 });
  const { data: document } = await supabase.from("documento").select("*")
    .eq("id", documentId).eq("paciente_id", patient.id).eq("clinica_id", patient.clinica_id)
    .eq("status", "pronto").single();
  if (!document) return new Response("Documento não encontrado", { status: 404 });
  const { data: file, error } = await supabase.storage.from("prontuarios").download(document.storage_path);
  if (error || !file) return new Response("Arquivo indisponível", { status: 404 });
  await supabase.from("audit_log").insert({ clinica_id: patient.clinica_id, paciente_id: patient.id,
    acao: "leitura", entidade: "paciente", entidade_id: patient.id });
  const filename = document.nome_original.replace(/[\r\n"\\]/g, "_");
  return new NextResponse(file, { headers: {
    "Content-Type": document.mime_type,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
