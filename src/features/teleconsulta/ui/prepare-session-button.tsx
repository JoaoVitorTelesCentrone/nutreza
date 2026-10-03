"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTelehealthSession } from "../application/actions";

export function PrepareSessionButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function prepare() {
    setBusy(true); setMessage("");
    const result = await createTelehealthSession(bookingId);
    setBusy(false);
    if (!result.ok) { setMessage(result.message); return; }
    router.push(`/app/agenda/${bookingId}/teleconsulta`);
    router.refresh();
  }
  return <div><button className="action-primary" type="button" disabled={busy} onClick={prepare}>{busy ? "Preparando sala…" : "Preparar teleconsulta"}</button>{message && <p className="notice-error mt-3" role="alert">{message}</p>}</div>;
}
