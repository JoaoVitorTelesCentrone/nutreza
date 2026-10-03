import { appendFileSync } from "node:fs";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const vars = Object.fromEntries(input.split(/\r?\n/).map((line) => {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  return match ? [match[1], match[2].replace(/^['"]|['"]$/g, "")] : [];
}).filter((entry) => entry.length === 2));

const url = vars.API_URL;
const key = vars.PUBLISHABLE_KEY ?? vars.ANON_KEY;
if (!url || !key || !process.env.GITHUB_ENV) {
  throw new Error("Supabase local não retornou API_URL e chave pública.");
}
appendFileSync(process.env.GITHUB_ENV, `NEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}\n`);
