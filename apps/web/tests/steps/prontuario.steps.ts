import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

Given("que um paciente possui uma primeira consulta registrada", async ({ page, request }) => {
  const email = `bdd-fase2-${Date.now()}@example.test`;
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Bia Nutri");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("SenhaSegura123!");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: "Confira seu e-mail." })).toBeVisible();
  let messageId: string | undefined;
  await expect.poll(async () => {
    const response = await request.get("http://127.0.0.1:56324/api/v1/messages");
    const inbox = await response.json() as { messages: Array<{ ID: string; To: Array<{ Address: string }> }> };
    messageId = inbox.messages.find((m) => m.To.some((to) => to.Address === email))?.ID;
    return messageId;
  }, { timeout: 20_000 }).toBeTruthy();
  const response = await request.get(`http://127.0.0.1:56324/api/v1/message/${messageId}`);
  const message = await response.json() as { HTML: string };
  const url = message.HTML.match(/href="([^"]+\/auth\/confirm[^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
  expect(url).toBeTruthy();
  await page.goto(url!);
  await page.getByLabel("Nome do consultório").fill("Consultório Bia");
  await page.getByLabel("Seu nome profissional").fill("Bia Nutri");
  await page.getByRole("button", { name: "Criar consultório" }).click();
  await expect(page.getByRole("heading", { name: "Olá, Bia." })).toBeVisible();
  await page.getByRole("link", { name: "Abrir pacientes" }).click();
  await page.getByRole("link", { name: "Novo paciente" }).click();
  await page.getByLabel("Nome completo").fill("Paciente BDD");
  await page.getByRole("button", { name: "Salvar paciente" }).click();
  await page.getByRole("link", { name: "Consultas" }).click();
  await page.getByLabel("Queixa e relato").fill("Primeira consulta BDD");
  await page.getByRole("button", { name: "Salvar consulta" }).click();
  await expect(page.getByText("Primeira consulta BDD")).toBeVisible();
});

When("registro uma segunda consulta para o mesmo paciente", async ({ page }) => {
  await page.getByLabel("Queixa e relato").fill("Segunda consulta BDD");
  await page.getByRole("button", { name: "Salvar consulta" }).click();
});

Then("as duas consultas permanecem no histórico clínico", async ({ page }) => {
  await expect(page.getByText("Primeira consulta BDD")).toBeVisible();
  await expect(page.getByText("Segunda consulta BDD")).toBeVisible();
});
