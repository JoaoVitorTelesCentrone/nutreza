import { redirect } from "next/navigation";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { Brand } from "@/shared/ui/brand";
import { signOut } from "@/features/auth/application/actions";
import { createClient } from "@/shared/lib/supabase/server";
import { Button } from "@/shared/ui/button";
import { AppNavigation } from "@/shared/ui/app-navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/entrar");
  return <div className="min-h-screen bg-cream">
    <header className="app-shell-header sticky top-0 z-40 border-b"><div className="page-wrap flex min-h-19 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2"><Brand /><AppNavigation /><div className="flex items-center gap-1"><Button asChild variant="ghost"><Link href="/app/perfil"><UserRound aria-hidden="true" className="size-4" />Perfil</Link></Button><form action={signOut}><Button type="submit" variant="ghost">Sair</Button></form></div></div></header>
    {children}
  </div>;
}

