import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const args = {};
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  const value = process.argv[index + 1];
  if (!flag?.startsWith("--") || !value || value.startsWith("--") || flag.slice(2) in args) {
    throw new Error(`Invalid or repeated argument: ${flag ?? "(missing)"}`);
  }
  args[flag.slice(2)] = value;
}
const metaPath = args.meta;
const dataPath = args.data;
if (!metaPath || !dataPath) {
  throw new Error("Usage: node scripts/import-foods.mjs --meta source.json --data foods.jsonl [--measures measures.jsonl] [--authorized-ref reference]");
}
const sourceSchema = z.object({
  nome: z.enum(["TACO", "TBCA"]), versao: z.string().min(1).max(40),
  referencia_url: z.url(), licenca: z.string().min(10), atribuicao: z.string().min(10),
  arquivo_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  medidas_sha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
});
const value = z.string().regex(/^\d+(?:\.\d{1,4})?$/).nullable();
const foodSchema = z.object({
  codigo: z.string().min(1).max(40), nome: z.string().min(2).max(240), grupo: z.string().max(120),
  energia_kcal_100g: value, proteina_g_100g: value, carboidrato_g_100g: value,
  lipidios_g_100g: value, fibra_g_100g: value, sodio_mg_100g: value,
  dados_ausentes: z.array(z.string()),
});
const measureSchema = z.object({
  codigo: z.string().min(1).max(40), nome: z.string().trim().min(2).max(100),
  gramas: z.string().regex(/^\d+(?:\.\d{1,3})?$/),
});

const metadata = sourceSchema.parse(JSON.parse(await readFile(metaPath, "utf8")));
if (metadata.nome === "TBCA" && (!args["authorized-ref"] || args["authorized-ref"].length < 6)) {
  throw new Error("TBCA requires --authorized-ref with the commercial-use authorization reference.");
}
const bytes = await readFile(dataPath);
const normalizado_sha256 = createHash("sha256").update(bytes).digest("hex");
const lines = bytes.toString("utf8").split(/\r?\n/).filter(Boolean);
const foods = lines.map((line) => foodSchema.parse(JSON.parse(line)));
if (metadata.nome === "TACO" && foods.length !== 597) throw new Error("TACO import must contain 597 foods.");
if (new Set(foods.map((food) => food.codigo)).size !== foods.length) throw new Error("Repeated food code.");
if (Boolean(args.measures) !== Boolean(metadata.medidas_sha256)) {
  throw new Error("A measures file and medidas_sha256 must be provided together.");
}
let measures = [];
if (args.measures) {
  const measureBytes = await readFile(args.measures);
  const measureHash = createHash("sha256").update(measureBytes).digest("hex");
  if (measureHash !== metadata.medidas_sha256) throw new Error("Measures SHA256 does not match source metadata.");
  measures = measureBytes.toString("utf8").split(/\r?\n/).filter(Boolean)
    .map((line) => measureSchema.parse(JSON.parse(line)));
  const foodCodes = new Set(foods.map((food) => food.codigo));
  if (measures.some((measure) => !foodCodes.has(measure.codigo) || Number(measure.gramas) <= 0 || Number(measure.gramas) > 10000)) {
    throw new Error("Measure refers to an unknown food or has invalid grams.");
  }
  if (new Set(measures.map((measure) => `${measure.codigo}\0${measure.nome}`)).size !== measures.length) {
    throw new Error("Repeated measure name for a food.");
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY on the server.");
const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: existing, error: readError } = await client.from("alimento_fonte").select("id,arquivo_sha256,normalizado_sha256,medidas_sha256")
  .eq("nome", metadata.nome).eq("versao", metadata.versao).maybeSingle();
if (readError) throw readError;
if (existing && (existing.arquivo_sha256 !== metadata.arquivo_sha256 || existing.normalizado_sha256 !== normalizado_sha256 ||
  existing.medidas_sha256 !== (metadata.medidas_sha256 ?? null))) {
  throw new Error("Source version already exists with different content. Use a new version.");
}
let sourceId = existing?.id;
if (!sourceId) {
  const { data, error } = await client.from("alimento_fonte").insert({ ...metadata,
    autorizacao_ref: metadata.nome === "TBCA" ? args["authorized-ref"] : null,
    normalizado_sha256,
  }).select("id").single();
  if (error) throw error;
  sourceId = data.id;
}
const foodIds = new Map();
for (let index = 0; index < foods.length; index += 100) {
  const batch = foods.slice(index, index + 100).map((food) => ({ ...food, fonte_id: sourceId }));
  const { data, error } = await client.from("alimento").upsert(batch, { onConflict: "fonte_id,codigo" })
    .select("id,codigo");
  if (error) throw error;
  for (const row of data) foodIds.set(row.codigo, row.id);
}
for (let index = 0; index < measures.length; index += 100) {
  const batch = measures.slice(index, index + 100).map((measure) => ({
    id: measureId(sourceId, measure.codigo, measure.nome),
    alimento_id: foodIds.get(measure.codigo), nome: measure.nome,
    gramas: measure.gramas, origem: "fonte",
  }));
  const { error } = await client.from("alimento_medida").upsert(batch, { onConflict: "id" });
  if (error) throw error;
}
console.log(`Imported ${foods.length} ${metadata.nome} foods and ${measures.length} measures from version ${metadata.versao}.`);

function measureId(sourceId, code, name) {
  const hash = createHash("sha256").update(`${sourceId}\0${code}\0${name}`).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
