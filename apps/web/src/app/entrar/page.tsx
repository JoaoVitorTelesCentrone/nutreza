import Link from "next/link";
import { signIn, signInWithGoogle } from "@/features/auth/application/actions";
import { AuthShell } from "@/shared/ui/auth-shell";
import { Button } from "@/shared/ui/button";

const errors: Record<string, string> = {
  campos: "Confira seu e-mail e sua senha.",
  credenciais: "Não foi possível entrar. Confira os dados ou confirme seu e-mail.",
  google: "Não foi possível conectar com o Google. Tente novamente.",
  link: "Este link expirou ou já foi usado. Solicite um novo acesso.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return <AuthShell>
    <h1 className="text-3xl font-bold tracking-tight">Bom ter você de volta.</h1>
    <p className="mt-2 text-muted">Entre para cuidar do seu consultório.</p>
    {erro && errors[erro] && <p role="alert" className="mt-6 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{errors[erro]}</p>}
    <form action={signIn} className="mt-8 space-y-5">
      <div><label htmlFor="email" className="form-label">E-mail</label><input className="field" id="email" name="email" type="email" autoComplete="email" required placeholder="voce@consultorio.com.br" /></div>
      <div><div className="flex items-center justify-between"><label htmlFor="password" className="form-label">Senha</label><Link href="/redefinir-senha" className="quiet-link text-sm">Esqueci a senha</Link></div><input className="field" id="password" name="password" type="password" autoComplete="current-password" required /></div>
      <Button className="w-full" type="submit">Entrar</Button>
    </form>
    {process.env.GOOGLE_AUTH_ENABLED === "true" && <><div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line"/>ou<span className="h-px flex-1 bg-line"/></div><form action={signInWithGoogle}><Button type="submit" className="w-full" variant="outline">Continuar com Google</Button></form></>}
    <p className="mt-5 text-center text-sm"><Link className="quiet-link" href="/entrar/link">Entrar com link por e-mail</Link></p>
    <p className="mt-8 text-center text-sm text-muted">Ainda não tem conta? <Link className="quiet-link" href="/cadastro">Criar conta</Link></p>
  </AuthShell>;
}
