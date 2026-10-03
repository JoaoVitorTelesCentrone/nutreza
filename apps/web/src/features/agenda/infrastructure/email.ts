type NoticeType = "solicitacao" | "confirmacao" | "remarcacao" | "cancelamento" | "lembrete_24h" | "lembrete_1h";

const subjects: Record<NoticeType, string> = {
  solicitacao: "Recebemos sua solicitação de consulta",
  confirmacao: "Sua consulta foi confirmada",
  remarcacao: "Sua consulta mudou de horário",
  cancelamento: "Sua consulta foi cancelada",
  lembrete_24h: "Lembrete: sua consulta é amanhã",
  lembrete_1h: "Lembrete: sua consulta começa em breve",
};

export function notificationText(type: NoticeType, clinic: string, service: string, start: string, timezone: string) {
  const date = new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, dateStyle: "full", timeStyle: "short" }).format(new Date(start));
  const lead = type === "solicitacao" ? "Recebemos sua solicitação. Aguarde a confirmação do consultório." :
    type === "cancelamento" ? "Sua consulta foi cancelada." :
    type === "remarcacao" ? "O horário da sua consulta foi alterado. Confira os dados abaixo." :
    type === "confirmacao" ? "Sua consulta está confirmada." : "Este é um lembrete da sua consulta.";
  return { subject: subjects[type], text: `${lead}\n\n${service}\n${date}\n${clinic}\n\nSe precisar de ajuda, entre em contato com o consultório.` };
}

export async function sendTransactionalEmail(args: {
  apiKey: string; from: string; to: string; idempotencyKey: string; subject: string; text: string;
}, fetcher: typeof fetch = fetch) {
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${args.apiKey}`, "Content-Type": "application/json",
      "Idempotency-Key": args.idempotencyKey },
    body: JSON.stringify({ from: args.from, to: [args.to], subject: args.subject, text: args.text }),
    signal: AbortSignal.timeout(10_000),
  });
  return response.ok;
}
