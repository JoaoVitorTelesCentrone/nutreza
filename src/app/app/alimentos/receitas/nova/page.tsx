import Link from "next/link";
import { redirect } from "next/navigation";
import { createRecipe } from "@/features/planos/application/food-actions";
import { canAccessClinical, requireStaff } from "@/features/pacientes/application/context";

export default async function NewRecipe({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { profile } = await requireStaff();
  if (!canAccessClinical(profile.papel)) redirect("/app?erro=permissao");
  const query = await searchParams;
  return <main className="page-wrap py-10"><Link className="quiet-link" href="/app/alimentos">← Alimentos</Link><div className="card mx-auto mt-5 max-w-2xl"><h1 className="text-3xl font-bold">Nova receita</h1><p className="mt-2 text-muted">Defina o rendimento final. Depois adicione cada ingrediente em gramas.</p>{query.erro && <p role="alert" className="notice-error mt-5">Confira os dados e tente novamente.</p>}<form action={createRecipe} className="mt-6 grid gap-4"><label className="form-label">Nome<input className="field" name="nome" required minLength={3}/></label><label className="form-label">Rendimento pronto (g)<input className="field" name="rendimento_g" type="number" min="0.001" max="100000" step="0.001" required/></label><label className="form-label">Modo de preparo<textarea className="field min-h-32" name="preparo" maxLength={5000}/></label><button className="action-primary justify-self-start" type="submit">Criar receita</button></form></div></main>;
}
