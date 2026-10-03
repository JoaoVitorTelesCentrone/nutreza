import "server-only";

export type AsaasConfig = { apiKey: string; environment: "sandbox" | "producao" };
export type AsaasCustomer = { id: string; name: string; email?: string };
export type AsaasPayment = {
  id: string; status: string; value: number; externalReference?: string;
  dueDate?: string; invoiceUrl?: string;
};
export type AsaasRefund = { id: string; value: number; description?: string; status: "PENDING" | "CANCELLED" | "DONE" };

export class AsaasError extends Error {
  constructor(message: string, readonly status?: number) { super(message); this.name = "AsaasError"; }
}

const base = (environment: AsaasConfig["environment"]) =>
  environment === "sandbox" ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";

async function call<T>(config: AsaasConfig, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base(config.environment)}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/json", "content-type": "application/json",
      access_token: config.apiKey, "user-agent": "Nutreza/0.1.0",
      ...init.headers,
    },
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.json().catch(() => ({})) as { errors?: Array<{ description?: string }>; [key: string]: unknown };
  if (!response.ok) throw new AsaasError(body.errors?.[0]?.description ?? "Falha ao comunicar com o Asaas.", response.status);
  return body as T;
}

export async function getOrCreateAsaasCustomer(config: AsaasConfig, input: {
  name: string; email: string | null; phone: string | null; externalReference: string;
}) {
  const list = await call<{ data: AsaasCustomer[] }>(config,
    `/customers?externalReference=${encodeURIComponent(input.externalReference)}&limit=1`);
  if (list.data[0]) return list.data[0];
  return call<AsaasCustomer>(config, "/customers", {
    method: "POST", body: JSON.stringify({
      name: input.name, email: input.email ?? undefined, mobilePhone: input.phone ?? undefined,
      externalReference: input.externalReference,
    }),
  });
}

export async function getOrCreateAsaasPixPayment(config: AsaasConfig, input: {
  customerId: string; valueCents: number; description: string; dueDate: string; externalReference: string;
}) {
  const list = await call<{ data: AsaasPayment[] }>(config,
    `/payments?externalReference=${encodeURIComponent(input.externalReference)}&limit=1`);
  if (list.data[0]) return list.data[0];
  return call<AsaasPayment>(config, "/payments", {
    method: "POST", body: JSON.stringify({
      customer: input.customerId, billingType: "PIX", value: input.valueCents / 100,
      description: input.description.slice(0, 500), dueDate: input.dueDate,
      externalReference: input.externalReference,
    }),
  });
}

export async function getAsaasPixCode(config: AsaasConfig, paymentId: string) {
  return call<{ encodedImage?: string; payload?: string; expirationDate?: string }>(
    config, `/payments/${encodeURIComponent(paymentId)}/pixQrCode`);
}

export async function refundAsaasPayment(config: AsaasConfig, paymentId: string, input: {
  valueCents: number; description: string;
}) {
  return call<{ id: string; status?: string }>(config, `/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST", body: JSON.stringify({ value: input.valueCents / 100, description: input.description }),
  });
}

export async function getAsaasPayment(config: AsaasConfig, paymentId: string) {
  return call<AsaasPayment>(config, `/payments/${encodeURIComponent(paymentId)}`);
}

export async function getAsaasRefunds(config: AsaasConfig, paymentId: string) {
  return call<{ data?: AsaasRefund[] }>(config, `/payments/${encodeURIComponent(paymentId)}/refunds`);
}

export async function cancelAsaasPayment(config: AsaasConfig, paymentId: string) {
  return call<{ deleted?: boolean; id?: string; status?: string }>(config, `/payments/${encodeURIComponent(paymentId)}`, { method: "DELETE" });
}
