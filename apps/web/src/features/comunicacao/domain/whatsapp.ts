export type InboundIntent = "opt_out" | "opt_in" | "yes" | "no" | "help" | "clinical" | "unknown";

export function normalizeBrazilianPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return null;
}

export function classifyInboundMessage(input: string): InboundIntent {
  const text = input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
  if (/^(parar|sair|cancelar|stop|nao quero receber)(\s|[.!])*$/.test(text)) return "opt_out";
  if (/^(reiniciar|voltar a receber|quero receber)(\s|[.!])*$/.test(text)) return "opt_in";
  if (/^(sim|s|ok|confirmo|confirmado)(\s|[.!])*$/.test(text)) return "yes";
  if (/^(nao|n|negativo)(\s|[.!])*$/.test(text)) return "no";
  if (/^(ajuda|help|humano|atendente)(\s|[.!])*$/.test(text)) return "help";
  if (/\b(alergia|alergico|dor|sintoma|medicamento|remedio|remedio|dieta|emagrecer|engordar|diabetes|pressao|gravidez|amament|caloria|peso|jejum|vomit|desmaio|sangue|urgencia|urgente)\b/.test(text)) return "clinical";
  return "unknown";
}

export function canAdvanceMessageStatus(previous: string, next: string): boolean {
  const rank: Record<string, number> = { enfileirada: 0, recebida: 0, enviada: 1, entregue: 2, lida: 3, falhou: 1, bloqueada: 4 };
  if (!(previous in rank) || !(next in rank)) return false;
  if (previous === "bloqueada" || previous === "lida" || previous === "falhou") return previous === next;
  if (next === "bloqueada") return true;
  return rank[next] >= rank[previous];
}

export function outboxOccurrenceKey(patientId: string, purpose: string, occurrence: string) {
  return `${patientId}:${purpose}:${occurrence}`;
}
