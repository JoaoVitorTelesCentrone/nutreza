export default function LoadingPatients() {
  return <main className="page-wrap py-10" role="status" aria-live="polite"><div className="h-9 w-48 animate-pulse rounded-xl bg-line"/><div className="mt-7 h-12 animate-pulse rounded-xl bg-line"/><div className="card mt-6 space-y-4"><div className="h-5 w-2/3 animate-pulse rounded bg-line"/><div className="h-5 w-1/2 animate-pulse rounded bg-line"/></div><span className="sr-only">Carregando pacientes</span></main>;
}
