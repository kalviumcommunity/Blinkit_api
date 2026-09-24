import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    "legacy/**",
    "Blinkit_api-main/**",
    "github-review/**",
    ".local-postgres/**",
    "next-env.d.ts",
    "scripts/**",
  ]),
]);
