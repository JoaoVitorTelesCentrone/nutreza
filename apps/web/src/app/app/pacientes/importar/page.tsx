import Link from "next/link";
import { importPatients } from "@/features/pacientes/application/patient-actions";
import { requireStaff } from "@/features/pacientes/application/context";

export default async function ImportPatients({ searchParams }: { searchParams: Promise<{ erro?: string; numero?: string }> }) {
  await requireStaff();
  const { erro, numero } = await searchParams;
  const message = erro === "arquivo" ? "Selecione um CSV de até 500 KB." : erro === "linha" ? `Confira a linha ${numero ?? "indicada"} do arquivo.` : "Não foi possível importar os pacientes.";
  return <main className="page-wrap py-10"><Link href="/app/pacientes" className="quiet-link">← Pacientes</Link><div className="card mx-auto mt-6 max-w-2xl"><h1 className="text-3xl font-bold">Importar pacientes</h1><p className="mt-2 text-muted">Importe até 100 pacientes por arquivo CSV. Use cabeçalhos: <strong>nome, nascimento, sexo, email, telefone</strong>. Aceita vírgula ou ponto e vírgula. Data: AAAA-MM-DD ou DD/MM/AAAA.</p>{erro && <p role="alert" className="notice-error mt-5">{message}</p>}<form action={importPatients} className="mt-6 space-y-5"><div><label className="form-label" htmlFor="arquivo">Arquivo CSV</label><input id="arquivo" name="arquivo" type="file" accept=".csv,text/csv" required className="field"/></div><button className="action-primary" type="submit">Importar pacientes</button></form></div></main>;
}
