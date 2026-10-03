import Link from "next/link";
import Image from "next/image";
import { PatientShell } from "@/features/paciente-pwa/ui/patient-shell";
import { ProgressEntryForm, ProgressPhotoForm } from "@/features/paciente-pwa/ui/progress-tools";
import { requirePatientAccount } from "@/features/paciente-pwa/application/access";
import { PatientSignOutButton } from "@/features/paciente-pwa/ui/patient-sign-out";

export const dynamic = "force-dynamic";

export default async function PatientProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, patient } = await requirePatientAccount(id);
  const [{ data: selfReports }, { data: clinicalMeasures }, { data: consents }, { data: photos }] = await Promise.all([
    supabase.from("patient_progress").select("id,medida_em,peso_kg,cintura_cm,nota,created_at").eq("paciente_id", id).order("medida_em", { ascending: false }).limit(100),
    supabase.from("antropometria").select("id,medida_em,peso_kg,cintura_cm").eq("paciente_id", id).order("medida_em", { ascending: false }).limit(100),
    supabase.from("patient_consent_event").select("finalidade,aceito,created_at").eq("paciente_id", id).eq("user_id", userId).in("finalidade", ["compartilhar_fotos_progresso"]).order("created_at", { ascending: false }),
    supabase.from("patient_progress_photo").select("id,foto_path,tirada_em,compartilhado_com_profissional").eq("paciente_id", id).order("tirada_em", { ascending: false }).limit(40),
  ]);
  const shareConsent = consents?.[0]?.aceito === true;
  const photoRows = await Promise.all((photos ?? []).map(async (photo) => {
    const { data } = await supabase.storage.from("patient-health-images").createSignedUrl(photo.foto_path, 300);
    return { ...photo, signedUrl: data?.signedUrl ?? null };
  }));
  const chartRows = [
    ...(selfReports ?? []).filter((row) => row.peso_kg !== null).map((row) => ({ date: row.medida_em, weight: Number(row.peso_kg), source: "Informado por você" })),
    ...(clinicalMeasures ?? []).filter((row) => row.peso_kg !== null).map((row) => ({ date: row.medida_em, weight: Number(row.peso_kg), source: "Medido em consulta" })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return <PatientShell patientId={id} patientName={patient.nome}><main className="page-wrap max-w-3xl py-8"><header className="flex items-center justify-between"><div><Link className="quiet-link" href="/paciente">← Início</Link><p className="mt-4 text-sm font-semibold text-primary">Progresso de {patient.nome}</p><h1 className="mt-1 text-3xl font-bold">Sua evolução</h1></div><PatientSignOutButton userId={userId} patientId={id}/></header>
    <ProgressEntryForm patientId={id}/>
    <section className="card mt-5"><h2 className="section-title">Histórico de peso</h2><p className="mt-1 text-sm text-muted">Uma visão de tendência; pequenas variações são esperadas.</p>{chartRows.length ? <><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Peso registrado ao longo do tempo e origem da medida</caption><thead><tr><th>Data</th><th>Peso</th><th>Origem</th></tr></thead><tbody>{chartRows.map((row, index) => <tr key={row.date + row.source + index} className="border-t border-line"><td className="py-3">{new Date(row.date + "T12:00:00").toLocaleDateString("pt-BR")}</td><td>{row.weight.toLocaleString("pt-BR")} kg</td><td>{row.source}</td></tr>)}</tbody></table></div>{chartRows.length > 1 && <svg role="img" aria-label="Gráfico de tendência do peso" viewBox="0 0 500 150" className="mt-4 h-36 w-full text-primary">{(() => { const min = Math.min(...chartRows.map((r) => r.weight)); const max = Math.max(...chartRows.map((r) => r.weight)); const span = Math.max(1, max - min); const points = chartRows.map((r, i) => (20 + i * 460 / (chartRows.length - 1)) + "," + (130 - (r.weight - min) * 100 / span)).join(" "); return <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3"/>; })()}</svg>}</> : <p className="empty">Registre uma medida para começar a acompanhar sua tendência.</p>}</section>
    <section className="card mt-5"><h2 className="section-title">Medidas registradas em consulta</h2>{clinicalMeasures?.length ? <ul className="mt-3 divide-y divide-line">{clinicalMeasures.map((row) => <li className="py-3" key={row.id}>{new Date(row.medida_em + "T12:00:00").toLocaleDateString("pt-BR")} · {row.peso_kg ?? "—"} kg{row.cintura_cm ? " · " + row.cintura_cm + " cm" : ""}</li>)}</ul> : <p className="empty">Ainda não há medidas de consulta disponíveis.</p>}</section>
    <ProgressPhotoForm patientId={id} shareAllowed={shareConsent}/>
    <section className="card mt-5"><h2 className="section-title">Suas fotos</h2>{photoRows.length ? <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{photoRows.map((photo) => <li key={photo.id} className="rounded-xl border border-line p-2"><p className="text-xs text-muted">{new Date(photo.tirada_em + "T12:00:00").toLocaleDateString("pt-BR")} · {photo.compartilhado_com_profissional ? "compartilhada" : "privada"}</p>{photo.signedUrl ? <Image src={photo.signedUrl} alt={"Foto de progresso de " + new Date(photo.tirada_em + "T12:00:00").toLocaleDateString("pt-BR")} width={400} height={400} unoptimized className="mt-2 aspect-square w-full rounded-lg object-cover"/> : <p className="mt-2 text-sm">Foto indisponível.</p>}</li>)}</ul> : <p className="empty">Suas fotos privadas aparecerão aqui.</p>}</section>
  </main></PatientShell>;
}
