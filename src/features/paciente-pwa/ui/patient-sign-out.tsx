"use client";

import { useState } from "react";
import { signOut } from "@/features/auth/application/actions";
import { clearPatientCache, clearPendingForUser } from "../infrastructure/offline-diary";

export function PatientSignOutButton({ userId, patientId }: { userId: string; patientId?: string }) {
  const [busy, setBusy] = useState(false);
  async function leave() {
    setBusy(true);
    await Promise.all([clearPendingForUser(userId), clearPatientCache(patientId)]).catch(() => undefined);
    await signOut();
  }
  return <button className="quiet-link" type="button" disabled={busy} onClick={() => void leave()}>{busy ? "Saindo…" : "Sair"}</button>;
}
