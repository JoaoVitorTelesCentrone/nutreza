import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const bddTestDir = defineBddConfig({
  features: "tests/features/*.feature",
  steps: "tests/steps/*.ts",
});

export default defineConfig({
  testDir: ".",
  use: { baseURL: "http://127.0.0.1:3005" },
  projects: [
    { name: "bdd", testDir: bddTestDir, use: { ...devices["Desktop Chrome"] } },
    { name: "e2e", testDir: "./tests/e2e", use: { ...devices["Desktop Chrome"] } },
  ],
  workers: 2,
  webServer: { command: "node scripts/e2e-server.mjs", url: "http://127.0.0.1:3005", reuseExistingServer: false, timeout: 120_000 },
  retries: process.env.CI ? 1 : 0,
});
