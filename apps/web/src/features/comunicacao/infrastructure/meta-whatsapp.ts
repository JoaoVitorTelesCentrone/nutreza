import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { decryptWhatsAppSecret } from "./secrets";

export type MetaMessageParameter = { type: "text"; text: string };

export class MetaSendError extends Error {
  constructor(public readonly httpStatus: number | null, public readonly providerCode: number | null) {
    super(`META_SEND_${providerCode ?? httpStatus ?? "NETWORK"}`);
  }
}

export function verifyMetaSignature(rawBody: string, header: string | null) {
  const secret = process.env.WHATSAPP_META_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const actual = Buffer.from(header.slice(7), "hex");
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function verifyWebhookHandshake(mode: string | null, token: string | null, challenge: string | null) {
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (mode !== "subscribe" || !challenge || !expected || token !== expected) return null;
  return challenge;
}

export async function sendMetaTemplate(input: {
  graphApiVersion: string;
  phoneNumberId: string;
  encryptedToken: string;
  to: string;
  name: string;
  language: string;
  parameters: MetaMessageParameter[];
}) {
  if (!/^v\d+\.\d+$/.test(input.graphApiVersion)) throw new Error("INVALID_GRAPH_VERSION");
  const accessToken = decryptWhatsAppSecret(input.encryptedToken);
  let response: Response;
  try { response = await fetch(`https://graph.facebook.com/${input.graphApiVersion}/${encodeURIComponent(input.phoneNumberId)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.to.replace(/^\+/, ""),
      type: "template",
      template: {
        name: input.name,
        language: { code: input.language },
        ...(input.parameters.length ? { components: [{ type: "body", parameters: input.parameters }] } : {}),
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  }); } catch { throw new MetaSendError(null, null); }
  const result = await response.json().catch(() => ({})) as { messages?: Array<{ id?: string }>; error?: { code?: number } };
  if (!response.ok || !result.messages?.[0]?.id) throw new MetaSendError(response.status, result.error?.code ?? null);
  return result.messages[0].id;
}
