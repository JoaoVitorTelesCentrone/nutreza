import { expect, test } from "@playwright/test";

test("visitante encontra o cadastro e vê validação de campos", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mais tempo para cuidar de quem importa." })).toBeVisible();
  await page.getByRole("link", { name: "Criar minha conta" }).click();
  await expect(page.getByRole("heading", { name: "Comece pela sua conta." })).toBeVisible();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.locator("input#nome:invalid")).toHaveCount(1);
});

test("cadastro permanece utilizável em tela de 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/cadastro");
  await expect(page.getByRole("heading", { name: "Comece pela sua conta." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar conta" })).toBeVisible();
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(360);
});

test("profissional confirma e-mail e configura consultório isolado", async ({ page, request }) => {
  const email = `fase1-${Date.now()}@example.test`;
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Ana Teste");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("SenhaSegura123!");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: "Confira seu e-mail." })).toBeVisible();

  let messageId: string | undefined;
  await expect.poll(async () => {
    const response = await request.get("http://127.0.0.1:56324/api/v1/messages");
    const inbox = await response.json() as { messages: Array<{ ID: string; To: Array<{ Address: string }> }> };
    messageId = inbox.messages.find((message) => message.To.some((recipient) => recipient.Address === email))?.ID;
    return messageId;
  }, { timeout: 15_000 }).toBeTruthy();

  const messageResponse = await request.get(`http://127.0.0.1:56324/api/v1/message/${messageId}`);
  const message = await messageResponse.json() as { HTML: string };
  const confirmationUrl = message.HTML.match(/href="([^"]+\/auth\/confirm[^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
  expect(confirmationUrl).toBeTruthy();
  await page.goto(confirmationUrl!);
  await expect(page.getByRole("heading", { name: "Vamos criar seu espaço." })).toBeVisible();
  await page.getByLabel("Nome do consultório").fill("Clínica Ana Teste");
  await page.getByLabel("Seu nome profissional").fill("Ana Teste");
  await page.getByRole("button", { name: "Criar consultório" }).click();
  await expect(page.getByRole("heading", { name: "Olá, Ana." })).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.getByRole("heading", { name: "Bom ter você de volta." })).toBeVisible();
  await page.getByRole("link", { name: "Entrar com link por e-mail" }).click();
  await expect(page.getByRole("heading", { name: "Entrar com um link." })).toBeVisible();
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Enviar link de acesso" }).click();
  await expect(page).toHaveURL(/enviado=1/);
  await expect(page.getByText("Se a conta existir, enviamos um link para seu e-mail.", { exact: false })).toBeVisible();

  let loginMessageId: string | undefined;
  await expect.poll(async () => {
    const response = await request.get("http://127.0.0.1:56324/api/v1/messages");
    const inbox = await response.json() as { messages: Array<{ ID: string; Subject: string; To: Array<{ Address: string }> }> };
    loginMessageId = inbox.messages.find((message) => message.Subject === "Seu link de acesso à Nutreza" && message.To.some((recipient) => recipient.Address === email))?.ID;
    return loginMessageId;
  }, { timeout: 15_000 }).toBeTruthy();

  const loginMessageResponse = await request.get(`http://127.0.0.1:56324/api/v1/message/${loginMessageId}`);
  const loginMessage = await loginMessageResponse.json() as { HTML: string };
  const loginUrl = loginMessage.HTML.match(/href="([^"]+\/auth\/confirm[^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
  expect(loginUrl).toBeTruthy();
  await page.goto(loginUrl!);
  await expect(page.getByRole("heading", { name: "Olá, Ana." })).toBeVisible();
});
