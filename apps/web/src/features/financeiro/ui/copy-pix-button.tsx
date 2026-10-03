"use client";

import { useState } from "react";

export function CopyPixButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  }
  return <button className="action-secondary" type="button" onClick={copy} aria-live="polite">
    {copied ? "Código copiado" : "Copiar Pix copia e cola"}
  </button>;
}
