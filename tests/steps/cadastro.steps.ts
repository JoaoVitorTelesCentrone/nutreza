import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

Given("que estou na página inicial da Nutreza", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mais tempo para cuidar de quem importa." })).toBeVisible();
});

When("escolho criar minha conta", async ({ page }) => {
  await page.getByRole("link", { name: "Criar minha conta" }).click();
});

Then("vejo o formulário de cadastro", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Comece pela sua conta." })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "E-mail" })).toBeVisible();
});
