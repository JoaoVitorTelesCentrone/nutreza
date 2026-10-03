export default function LoadingPatient() {
  return <main className="page-wrap py-10" role="status" aria-live="polite"><div className="h-9 w-64 animate-pulse rounded-xl bg-line"/><div className="mt-6 h-20 animate-pulse rounded-2xl bg-line"/><div className="card mt-6 h-72 animate-pulse bg-line"/><span className="sr-only">Carregando prontuário</span></main>;
}
