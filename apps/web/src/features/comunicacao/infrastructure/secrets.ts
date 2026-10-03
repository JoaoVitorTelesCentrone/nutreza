import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key() {
  const encoded = process.env.WHATSAPP_ENCRYPTION_KEY;
  if (!encoded) throw new Error("WHATSAPP_ENCRYPTION_KEY não configurada.");
  const value = Buffer.from(encoded, "base64");
  if (value.byteLength !== 32) throw new Error("WHATSAPP_ENCRYPTION_KEY precisa conter 32 bytes em Base64.");
  return value;
}

export function encryptWhatsAppSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptWhatsAppSecret(value: string) {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Formato de segredo WhatsApp inválido.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}
