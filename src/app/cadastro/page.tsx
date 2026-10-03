import Link from "next/link";
import { signUp, signInWithGoogle } from "@/features/auth/application/actions";
import { AuthShell } from "@/shared/ui/auth-shell";
import { Button } from "@/shared/ui/button";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ erro?: string; enviado?: string }> }) {
  const { erro, enviado } = await searchParams;
  return <AuthShell>
    {enviado ? <><h1 className="text-3xl font-bold tracking-tight">Confira seu e-mail.</h1><p className="mt-4 leading-7 text-muted">Enviamos um link de confirmação. Abra a mensagem para ativar sua conta e configurar o consultório.</p><Button className="mt-8" variant="outline" asChild><Link href="/entrar">Ir para o login</Link></Button></> : <>
      <h1 className="text-3xl font-bold tracking-tight">Comece pela sua conta.</h1>
      <p className="mt-2 text-muted">Seu consultório ganha espaço para crescer.</p>
      {erro && <p role="alert" className="mt-6 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{erro === "campos" ? "Confira os campos e aceite os termos." : "Não foi possível criar sua conta. Tente novamente."}</p>}
      <form action={signUp} className="mt-7 space-y-4">
        <div><label className="form-label" htmlFor="nome">Seu nome</label><input className="field" id="nome" name="nome" autoComplete="name" minLength={2} required /></div>
        <div><label className="form-label" htmlFor="email">E-mail</label><input className="field" id="email" name="email" type="email" autoComplete="email" required /></div>
        <div><label className="form-label" htmlFor="password">Senha</label><input className="field" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /><p className="mt-1 text-xs text-muted">Use pelo menos 8 caracteres.</p></div>
        <label className="flex items-start gap-3 text-sm leading-6 text-muted"><input type="checkbox" name="terms" required className="mt-1 h-4 w-4 accent-primary"/><span>Li e aceito os <Link href="/termos" className="quiet-link">Termos de uso</Link> e a <Link href="/privacidade" className="quiet-link">Política de privacidade</Link>.</span></label>
        <Button className="w-full" type="submit">Criar conta</Button>
      </form>
      {process.env.GOOGLE_AUTH_ENABLED === "true" && <><div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line"/>ou<span className="h-px flex-1 bg-line"/></div><form action={signInWithGoogle}><Button type="submit" className="w-full" variant="outline">Continuar com Google</Button></form></>}
      <p className="mt-7 text-center text-sm text-muted">Já tem conta? <Link className="quiet-link" href="/entrar">Entrar</Link></p>
    </>}
  </AuthShell>;
}
