import { defineConfig } from "vitest/config";
import { workflow } from "@workflow/vitest";
import path from "node:path";
export default defineConfig({ plugins: [workflow()], resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { include: ["tests/website-studio-durable.integration.test.ts"], testTimeout: 60000 } });
