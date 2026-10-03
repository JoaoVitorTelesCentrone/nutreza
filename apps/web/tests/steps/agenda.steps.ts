import { expect, test } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

Given("que existe uma consulta interna confirmada para um paciente", async ({ page, request }) => {
  test.setTimeout(90_000);
  const unique = Date.now();
  const email = `bdd-agenda-${unique}@example.test`;
  const future = new Date();
  future.setUTCDate(future.getUTCDate() + 14);
  const day = future.toISOString().slice(0, 10);
  const weekday = future.getUTCDay() || 7;
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Bia Agenda");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("SenhaSegura123!");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: "Confira seu e-mail." })).toBeVisible();
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
  await page.getByLabel("Nome do consultório").fill("Consultório Bia Agenda");
  await page.getByLabel("Seu nome profissional").fill("Bia Agenda");
  await page.getByRole("button", { name: "Criar consultório" }).click();
  await expect(page.getByRole("heading", { name: "Olá, Bia." })).toBeVisible();
  await page.getByRole("link", { name: "Abrir pacientes" }).click();
  await page.getByRole("link", { name: "Novo paciente" }).click();
  await page.getByLabel("Nome completo").fill("Paciente Falta");
  await page.getByRole("button", { name: "Salvar paciente" }).click();
  await expect(page.getByRole("heading", { name: "Paciente Falta" })).toBeVisible();
  const patientId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.locator("summary").filter({ hasText: "Consultório" }).click();
  await page.getByRole("link", { name: "Agenda", exact: true }).click();
  await page.getByRole("link", { name: "Disponibilidade" }).click();
  await page.getByLabel("Endereço da agenda").fill(`bdd-agenda-${unique}`);
  await page.getByRole("button", { name: "Salvar link público" }).click();
  await expect(page.getByRole("status")).toContainText("Configuração salva");
  await page.getByLabel("Nome do serviço").fill("Consulta retorno");
  await page.getByRole("button", { name: "Adicionar serviço" }).click();
  await expect(page.getByText("Consulta retorno", { exact: true })).toBeVisible();
  await page.getByLabel("Dia da semana").selectOption(String(weekday));
  await page.getByRole("button", { name: "Adicionar horário" }).click();
  await expect(page.getByText("09:00–18:00", { exact: false })).toBeVisible();
  await page.locator("summary").filter({ hasText: "Consultório" }).click();
  await page.getByRole("link", { name: "Agenda", exact: true }).click();
  await page.getByRole("link", { name: "Novo agendamento" }).first().click();
  const serviceId = await page.getByLabel("Serviço").inputValue();
  await page.goto(`/app/agenda/novo?servico=${serviceId}&data=${day}`);
  await expect(page.getByLabel("Dia")).toHaveValue(day);
  await page.getByRole("combobox", { name: "Paciente *" }).selectOption(patientId);
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();
  await expect(page.getByRole("heading", { name: "Paciente Falta" })).toBeVisible();
});

When("consulto as ações da consulta futura", async ({ page }) => {
  await expect(page.getByText("Confirmado", { exact: true })).toBeVisible();
});

Then("a opção de marcar falta ainda não aparece", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Marcar falta" })).toHaveCount(0);
});
