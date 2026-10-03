import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

async function confirmEmail(request: APIRequestContext, email: string, page: Page) {
  let messageId: string | undefined;
  await expect.poll(async () => {
    const response = await request.get("http://127.0.0.1:56324/api/v1/messages");
    const inbox = await response.json() as { messages: Array<{ ID: string; To: Array<{ Address: string }> }> };
    messageId = inbox.messages.find((message) => message.To.some((to) => to.Address === email))?.ID;
    return messageId;
  }, { timeout: 20_000 }).toBeTruthy();
  const response = await request.get(`http://127.0.0.1:56324/api/v1/message/${messageId}`);
  const message = await response.json() as { HTML: string };
  const url = message.HTML.match(/href="([^"]*\/auth\/(?:confirm|v1\/verify)[^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
  expect(url).toBeTruthy();
  await page.goto(url!);
}

test("convite, consentimento e diário offline sincronizam sem duplicar", async ({ page, request, browser }) => {
  test.setTimeout(120_000);
  const clinicianEmail = `pwa-clinica-${Date.now()}@example.test`;
  const patientEmail = `pwa-paciente-${Date.now()}@example.test`;

  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Nutricionista PWA");
  await page.getByLabel("E-mail").fill(clinicianEmail);
  await page.getByLabel("Senha").fill("SenhaSegura123!");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await confirmEmail(request, clinicianEmail, page);
  await page.getByLabel("Nome do consultório").fill("Clínica PWA");
  await page.getByLabel("Seu nome profissional").fill("Nutricionista PWA");
  await page.getByRole("button", { name: "Criar consultório" }).click();
  await page.getByRole("link", { name: "Abrir pacientes" }).click();
  await page.getByRole("link", { name: "Novo paciente" }).click();
  await page.getByLabel("Nome completo").fill("Paciente PWA");
  await page.getByLabel("Email").fill(patientEmail);
  await page.getByRole("button", { name: "Salvar paciente" }).click();
  await expect(page.getByRole("heading", { name: "Paciente PWA" })).toBeVisible();
  const patientId = page.url().match(/\/pacientes\/([^/?]+)/)?.[1];
  expect(patientId).toBeTruthy();
  await page.getByRole("button", { name: "Criar convite" }).click();
  await expect(page.getByRole("status")).toContainText("Copie o link");
  const inviteUrl = await page.getByRole("textbox", { name: "Link do convite" }).inputValue();

  const status = execSync("pnpm --dir ../.. exec supabase status -o env", { encoding: "utf8" });
  const localEnv = Object.fromEntries(status.split(/\r?\n/).filter((line) => line.includes("="))
    .map((line) => { const at = line.indexOf("="); return [line.slice(0, at), line.slice(at + 1).replace(/^\"|\"$/g, "")]; }));
  const admin = createClient(localEnv.API_URL, localEnv.SECRET_KEY, { auth: { persistSession: false } });
  const patientPassword = "SenhaPaciente123!";
  const { data: createdPatient, error: createPatientError } = await admin.auth.admin.createUser({
    email: patientEmail, password: patientPassword, email_confirm: true,
  });
  expect(createPatientError).toBeNull();
  expect(createdPatient.user).toBeTruthy();
  const patientContext = await browser.newContext({ baseURL: "http://127.0.0.1:3005" });
  const patientPage = await patientContext.newPage();
  await patientPage.goto(inviteUrl);
  await patientPage.getByText("Já tenho uma conta").click();
  await patientPage.getByLabel("E-mail", { exact: true }).fill(patientEmail);
  await patientPage.getByLabel("Senha", { exact: true }).fill(patientPassword);
  await patientPage.getByRole("button", { name: "Entrar e ativar convite" }).click();
  await expect(patientPage).toHaveURL(new RegExp(`/paciente/consentimentos/${patientId}`));
  await patientPage.getByRole("checkbox", { name: /Usar a área do paciente/ }).check();
  await patientPage.getByRole("button", { name: "Salvar escolhas e continuar" }).click();
  await expect(patientPage).toHaveURL(/\/paciente$/);
  await patientPage.getByRole("link", { name: "Registrar agora" }).click();
  await patientPage.getByLabel("Alimentos e porções").fill("Arroz — 3 colheres\nFeijão — 1 concha");
  await patientPage.getByLabel("Data e horário").fill("2026-10-02T12:00");
  await patientPage.context().setOffline(true);
  await patientPage.getByRole("button", { name: "Confirmar e registrar" }).click();
  await expect(patientPage.getByRole("status").filter({ hasText: "Registro guardado neste aparelho" })).toBeVisible();
  await expect(patientPage.getByRole("heading", { name: "Aguardando sincronização" })).toBeVisible();
  await patientPage.context().setOffline(false);
  await expect(patientPage.getByRole("status")).toContainText("Sincronização concluída", { timeout: 20_000 });
  await expect(patientPage.getByText("Arroz · 3 colheres")).toBeVisible();
  await patientPage.reload();
  await expect(patientPage.getByText("Arroz · 3 colheres")).toHaveCount(1);
  await patientPage.setViewportSize({ width: 360, height: 780 });
  expect(await patientPage.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await patientContext.close();
});
