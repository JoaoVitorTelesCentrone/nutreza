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
  const url = message.HTML.match(/href="([^"]+\/auth\/confirm[^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
  expect(url).toBeTruthy();
  await page.goto(url!);
}

test("alimento TACO, plano, aprovação, PDF, paciente e revisão", async ({ page, request, browser }) => {
  test.setTimeout(120_000);
  const email = `plano-${Date.now()}@example.test`;
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Ana Plano");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("SenhaSegura123!");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await confirmEmail(request, email, page);
  await page.getByLabel("Nome do consultório").fill("Clínica Plano");
  await page.getByLabel("Seu nome profissional").fill("Ana Plano");
  await page.getByRole("button", { name: "Criar consultório" }).click();
  await expect(page.getByRole("heading", { name: "Olá, Ana." })).toBeVisible();
  await page.locator("summary").filter({ hasText: "Nutrição" }).click();
  await page.getByRole("link", { name: "Alimentos" }).click();
  await expect(page.getByText(/TACO 4a edicao/).first()).toBeVisible();
  await page.locator("summary").filter({ hasText: "Consultório" }).click();
  await page.getByRole("link", { name: "Pacientes", exact: true }).click();
  await page.getByRole("link", { name: "Novo paciente" }).click();
  await page.getByLabel("Nome completo").fill("Maria Plano");
  await page.getByRole("button", { name: "Salvar paciente" }).click();
  await page.getByRole("link", { name: "Planos alimentares" }).click();
  await page.getByLabel("Título *").fill("Plano Maria");
  await page.getByRole("button", { name: "Criar rascunho" }).click();
  await expect(page.getByText("Rascunho", { exact: false }).first()).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill("Almoço");
  await page.getByRole("button", { name: /Adicionar refei/ }).click();
  await page.getByText(/Adicionar alimento ou receita/).click();
  await page.getByRole("button", { name: "Adicionar ao plano" }).click();
  await expect(page.getByRole("button", { name: "Aprovar plano" })).toBeEnabled();
  await page.getByRole("checkbox", { name: /Revisei as alergias/ }).check();
  await page.getByRole("button", { name: "Aprovar plano" }).click();
  await expect(page.getByRole("status")).toContainText("Plano aprovado");
  const pdfHref = await page.getByRole("link", { name: "Baixar PDF" }).getAttribute("href");
  expect(pdfHref).toBeTruthy();
  const pdfResponse = await page.request.get(pdfHref!);
  expect(pdfResponse.status()).toBe(200);
  expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
  expect(pdfResponse.headers()["content-disposition"]).toContain("v1.pdf");
  expect((await pdfResponse.body()).subarray(0, 5).toString()).toBe("%PDF-");
  const patientId = page.url().match(/\/pacientes\/([^/]+)\/planos/)?.[1];
  expect(patientId).toBeTruthy();
  const patientEmail = `paciente-plano-${Date.now()}@example.test`;
  const patientContext = await browser.newContext({ baseURL: "http://127.0.0.1:3005" });
  const patientPage = await patientContext.newPage();
  await patientPage.goto("/cadastro");
  await patientPage.getByLabel("Seu nome").fill("Maria Plano");
  await patientPage.getByLabel("E-mail").fill(patientEmail);
  await patientPage.getByLabel("Senha").fill("SenhaSegura123!");
  await patientPage.getByRole("checkbox").check();
  await patientPage.getByRole("button", { name: "Criar conta" }).click();
  await confirmEmail(request, patientEmail, patientPage);
  const status = execSync("pnpm --dir ../.. exec supabase status -o env", { encoding: "utf8" });
  const localEnv = Object.fromEntries(status.split(/\r?\n/).filter((line) => line.includes("="))
    .map((line) => { const at = line.indexOf("="); return [line.slice(0, at), line.slice(at + 1).replace(/^"|"$/g, "")]; }));
  const admin = createClient(localEnv.API_URL, localEnv.SECRET_KEY, { auth: { persistSession: false } });
  const { data: users, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  expect(usersError).toBeNull();
  const patientUser = users.users.find((user) => user.email === patientEmail);
  const clinicianUser = users.users.find((user) => user.email === email);
  expect(patientUser?.id).toBeTruthy();
  expect(clinicianUser?.id).toBeTruthy();
  const { data: patientRecord, error: patientRecordError } = await admin.from("paciente")
    .select("clinica_id").eq("id", patientId!).single();
  expect(patientRecord, `Patient ${patientId}: ${patientRecordError?.message ?? "not found"}`).toBeTruthy();
  const { error: linkError } = await admin.from("paciente_acesso").insert({
    paciente_id: patientId!, clinica_id: patientRecord!.clinica_id,
    user_id: patientUser!.id, vinculado_por: clinicianUser!.id,
  });
  expect(linkError).toBeNull();
  await patientPage.goto(`/paciente/consentimentos/${patientId}`);
  await patientPage.getByRole("checkbox", { name: /Usar a área do paciente/ }).check();
  await patientPage.getByRole("button", { name: "Salvar escolhas e continuar" }).click();
  await patientPage.goto(`/paciente/plano/${patientId}`);
  await expect(patientPage.getByRole("heading", { name: "Plano Maria" })).toBeVisible();
  await expect(patientPage.getByText("Versão 1", { exact: false })).toBeVisible();
  const patientPdf = await patientPage.request.get(`/app/pacientes/${patientId}/planos/${pdfHref!.match(/planos\/([^/]+)/)?.[1]}/pdf`);
  expect(patientPdf.status()).toBe(200);
  await page.getByRole("button", { name: "Criar revisão da versão 1" }).click();
  await expect(page.getByText("versão 2", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Almoço", { exact: false }).first()).toBeVisible();
  await page.setViewportSize({ width: 360, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await patientPage.reload();
  await expect(patientPage.getByText("Versão 1", { exact: false })).toBeVisible();
  await page.getByRole("checkbox", { name: /Revisei as alergias/ }).check();
  await page.getByRole("button", { name: "Aprovar plano" }).click();
  await expect(page.getByRole("status")).toContainText("Plano aprovado");
  await patientPage.reload();
  await expect(patientPage.getByText("Versão 2", { exact: false })).toBeVisible();
  const latestPdfHref = await patientPage.getByRole("link", { name: "Baixar PDF desta versão" }).getAttribute("href");
  expect(latestPdfHref).toContain(page.url().match(/\/planos\/([^?]+)/)?.[1]);
  const latestPdf = await patientPage.request.get(latestPdfHref!);
  expect(latestPdf.status()).toBe(200);
  expect(latestPdf.headers()["content-type"]).toContain("application/pdf");
  expect(latestPdf.headers()["content-disposition"]).toContain("v2.pdf");
  await patientContext.close();
});
