import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

// Carrega .env.local (chaves do Supabase local de testes)
if (fs.existsSync(".env.local")) {
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests",
  testMatch: /.*\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL, trace: "off", locale: "pt-BR", timezoneId: "America/Sao_Paulo" },
  projects: [
    { name: "unit", testMatch: /unit\.spec\.ts/ },
    { name: "security", testMatch: /security\.spec\.ts/ },
    { name: "mobile", testMatch: /e2e\.spec\.ts/, use: { ...devices["Pixel 7"], locale: "pt-BR" } },
  ],
});
