import Link from "next/link";
import { requestPasswordReset } from "@/features/auth/application/actions";
import { AuthShell } from "@/shared/ui/auth-shell";
import { Button } from "@/shared/ui/button";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ erro?: string; enviado?: string }> }) {
  const { erro, enviado } = await searchParams;
  return <AuthShell><h1 className="text-3xl font-bold tracking-tight">Redefinir senha</h1>
    {enviado ? <p className="mt-4 leading-7 text-muted">Se este e-mail estiver cadastrado, você receberá um link para escolher uma nova senha.</p> : <><p className="mt-3 leading-7 text-muted">Informe seu e-mail e enviaremos um link de recuperação.</p>{erro && <p role="alert" className="mt-5 text-sm text-danger">{erro === "expirado" ? "O link expirou. Solicite um novo." : "Informe um e-mail válido."}</p>}<form action={requestPasswordReset} className="mt-7 space-y-5"><div><label className="form-label" htmlFor="email">E-mail</label><input className="field" id="email" name="email" type="email" autoComplete="email" required /></div><Button className="w-full" type="submit">Enviar link</Button></form></>}
    <Link className="quiet-link mt-7 inline-block text-sm" href="/entrar">Voltar ao login</Link>
  </AuthShell>;
}
