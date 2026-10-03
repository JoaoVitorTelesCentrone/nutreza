import { spawn } from "node:child_process";

const site = "http://127.0.0.1:3005";
const child = spawn("pnpm", ["dev", "--hostname", "127.0.0.1", "--port", "3005"], {
  env: { ...process.env, NEXT_PUBLIC_SITE_URL: site, NUTREZA_NEXT_DIST_DIR: ".next-e2e", RESEND_API_KEY: "", REMINDER_FROM_EMAIL: "" },
  shell: process.platform === "win32",
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code) => process.exit(code ?? 0));
