import "server-only";
import { createHmac } from "node:crypto";
import { AccessToken } from "livekit-server-sdk";

export function liveKitConfiguration() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  return url && apiKey && apiSecret ? { url, apiKey, apiSecret } : null;
}

export async function createLiveKitParticipantToken(input: {
  room: string;
  userId: string;
  role: "paciente" | "profissional";
}) {
  const config = liveKitConfiguration();
  if (!config) throw new Error("LIVEKIT_NOT_CONFIGURED");
  const identity = createHmac("sha256", config.apiSecret).update(input.userId).digest("hex").slice(0, 32);
  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity,
    name: input.role === "paciente" ? "Paciente" : "Profissional",
    ttl: "10m",
  });
  token.addGrant({ roomJoin: true, room: input.room, canPublish: true, canSubscribe: true, canPublishData: false });
  return { url: config.url, token: await token.toJwt(), identity };
}
