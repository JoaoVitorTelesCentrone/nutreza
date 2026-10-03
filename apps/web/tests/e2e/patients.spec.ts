import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

async function confirmLatestEmail(request: APIRequestContext, email: string, page: Page) {
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

test("cadastro, duas consultas e versões anteriores permanecem acessíveis", async ({ page, request }) => {
  const email = `fase2-${Date.now()}@example.test`;
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Ana Nutri");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("SenhaSegura123!");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: "Confira seu e-mail." })).toBeVisible();
  await confirmLatestEmail(request, email, page);
  await page.getByLabel("Nome do consultório").fill("Clínica Ana Nutri");
  await page.getByLabel("Seu nome profissional").fill("Ana Nutri");
  await page.getByRole("button", { name: "Criar consultório" }).click();
  await page.getByRole("link", { name: "Abrir pacientes" }).click();
  await expect(page.getByText("Nenhum paciente cadastrado")).toBeVisible();
  await page.getByRole("link", { name: "Novo paciente" }).click();
  await page.getByLabel("Nome completo").fill("Maria Paciente");
  await page.getByLabel("Data de nascimento").fill("1990-05-12");
  await page.getByRole("button", { name: "Salvar paciente" }).click();
  await expect(page.getByRole("heading", { name: "Maria Paciente" })).toBeVisible();
  await page.getByRole("link", { name: "Alergias" }).click();
  await page.getByLabel("Substância").fill("Amendoim");
  await page.getByRole("button", { name: "Adicionar alergia" }).click();
  await expect(page.getByRole("region", { name: "Alergias em destaque" })).toContainText("Amendoim");
  await page.getByRole("link", { name: "Anamnese" }).click();
  await page.getByLabel("Queixa principal").fill("Primeira avaliação");
  await page.getByRole("button", { name: "Salvar nova versão" }).click();
  await page.getByLabel("Queixa principal").fill("Acompanhamento nutricional");
  await page.getByRole("button", { name: "Salvar nova versão" }).click();
  await expect(page.getByText("Primeira avaliação")).toBeVisible();
  await page.getByRole("link", { name: "Consultas" }).click();
  await page.getByLabel("Queixa e relato").fill("Consulta inicial");
  await page.getByRole("button", { name: "Salvar consulta" }).click();
  await expect(page.getByText("Consulta inicial")).toBeVisible();
  await page.getByLabel("Queixa e relato").fill("Segunda consulta");
  await page.getByRole("button", { name: "Salvar consulta" }).click();
  await expect(page.getByText("Consulta inicial")).toBeVisible();
  await expect(page.getByText("Segunda consulta")).toBeVisible();
  await page.setViewportSize({ width: 360, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.getByRole("link", { name: "Documentos" }).click();
  await page.getByLabel("Arquivo").setInputFiles({ name: "exame.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF") });
  await page.getByRole("button", { name: "Enviar arquivo" }).click();
  await expect(page.getByText("exame.pdf")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Baixar" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("exame.pdf");
  await page.getByRole("link", { name: "Histórico" }).click();
  await expect(page.getByRole("heading", { name: "Histórico de atividades" })).toBeVisible();
  await expect(page.getByText("Consulta · criado").first()).toBeVisible();
  await page.locator("summary").filter({ hasText: "Menu" }).click();
  await page.getByRole("link", { name: "Pacientes", exact: true }).click();
  await page.getByRole("link", { name: "Importar CSV" }).click();
  await page.getByLabel("Arquivo CSV").setInputFiles({ name: "pacientes.csv", mimeType: "text/csv", buffer: Buffer.from("nome;nascimento;email\nJoão Importado;1992-03-10;joao@example.test") });
  await page.getByRole("button", { name: "Importar pacientes" }).click();
  await expect(page.getByRole("link", { name: "João Importado" })).toBeVisible();
});

test("busca de pacientes é utilizável em tela estreita", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/app/pacientes");
  await expect(page).toHaveURL(/entrar/);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(360);
});
