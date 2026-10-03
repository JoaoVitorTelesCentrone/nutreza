import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

function encryptionKey() {
  const encoded = process.env.PSP_ENCRYPTION_KEY;
  if (!encoded) throw new Error("PSP_ENCRYPTION_KEY não configurada.");
  const key = Buffer.from(encoded, "base64");
  if (key.byteLength !== 32) throw new Error("PSP_ENCRYPTION_KEY precisa conter 32 bytes em Base64.");
  return key;
}

export function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(value: string) {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Formato de segredo inválido.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

export function hashSecret(secret: string) { return createHash("sha256").update(secret).digest("hex"); }

export function safeHashEqual(actual: string, expected: string) {
  const a = Buffer.from(hashSecret(actual), "hex");
  const b = Buffer.from(expected, "hex");
  return a.byteLength === b.byteLength && timingSafeEqual(a, b);
}
