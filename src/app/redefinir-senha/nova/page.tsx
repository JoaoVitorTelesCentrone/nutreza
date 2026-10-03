import { updatePassword } from "@/features/auth/application/actions";
import { AuthShell } from "@/shared/ui/auth-shell";
import { Button } from "@/shared/ui/button";

export default async function NewPasswordPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return <AuthShell><h1 className="text-3xl font-bold tracking-tight">Escolha uma nova senha.</h1><p className="mt-3 text-muted">Use pelo menos 8 caracteres.</p>{erro && <p role="alert" className="mt-5 text-sm text-danger">Não foi possível atualizar a senha. Solicite um novo link se necessário.</p>}<form action={updatePassword} className="mt-7 space-y-5"><div><label className="form-label" htmlFor="password">Nova senha</label><input className="field" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div><Button className="w-full" type="submit">Salvar nova senha</Button></form></AuthShell>;
}
