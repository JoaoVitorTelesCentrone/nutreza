import Link from "next/link";
import { createPatient } from "@/features/pacientes/application/patient-actions";
import { requireStaff } from "@/features/pacientes/application/context";
import { PatientFields } from "@/features/pacientes/ui/patient-fields";

export default async function NewPatient({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requireStaff();
  const { erro } = await searchParams;
  return <main className="page-wrap py-10"><Link href="/app/pacientes" className="quiet-link">← Pacientes</Link><div className="card mx-auto mt-6 max-w-2xl"><h1 className="text-3xl font-bold">Novo paciente</h1><p className="mt-2 text-muted">Comece pelos dados cadastrais. O prontuário fica disponível após salvar.</p>{erro && <p role="alert" className="notice-error mt-5">{erro === "campos" ? "Confira os dados informados." : "Não foi possível salvar o paciente."}</p>}<form action={createPatient} className="mt-6 space-y-5"><PatientFields/><button className="action-primary" type="submit">Salvar paciente</button></form></div></main>;
}
