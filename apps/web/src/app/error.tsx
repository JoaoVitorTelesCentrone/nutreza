"use client";

import { useEffect } from "react";
import { Button } from "@/shared/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Falha de renderização", error.digest ?? error.name); }, [error]);
  return <main className="page-wrap flex min-h-screen max-w-[620px] flex-col justify-center py-12"><h1 className="text-3xl font-bold">Não foi possível abrir esta página.</h1><p className="mt-4 text-muted">Tente novamente. Se o problema continuar, volte ao início.</p><div className="mt-7"><Button onClick={reset}>Tentar novamente</Button></div></main>;
}
