import Link from "next/link";
import { requestMagicLink } from "@/features/auth/application/actions";
import { AuthShell } from "@/shared/ui/auth-shell";
import { Button } from "@/shared/ui/button";

export default async function LinkSignInPage({ searchParams }: { searchParams: Promise<{ erro?: string; enviado?: string }> }) {
  const { erro, enviado } = await searchParams;
  return <AuthShell><h1 className="text-3xl font-bold tracking-tight">Entrar com um link.</h1>
    {enviado ? <p className="mt-4 leading-7 text-muted">Se a conta existir, enviamos um link para seu e-mail. Abra a mensagem para entrar.</p> : <><p className="mt-3 leading-7 text-muted">Informe o e-mail da sua conta. O link vale para um único acesso.</p>{erro && <p role="alert" className="mt-5 text-sm text-danger">Informe um e-mail válido.</p>}<form action={requestMagicLink} className="mt-7 space-y-5"><div><label htmlFor="email" className="form-label">E-mail</label><input id="email" name="email" type="email" autoComplete="email" className="field" required /></div><Button className="w-full" type="submit">Enviar link de acesso</Button></form></>}
    <Link href="/entrar" className="quiet-link mt-7 inline-block text-sm">Voltar ao login</Link>
  </AuthShell>;
}
