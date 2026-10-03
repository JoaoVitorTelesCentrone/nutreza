import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", ".next-e2e/**", ".next-phase7-build/**", ".features-gen/**", "node_modules/**", "coverage/**", "playwright-report/**", "test-results/**", "next-env.d.ts"]),
]);
