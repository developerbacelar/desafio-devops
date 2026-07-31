import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Garante testes hermeticos: o .env local pode ter uma DATABASE_URL real
    // (para `npm run dev`/`npm run seed`), mas os testes que nao mockam
    // lib/env.js explicitamente devem sempre ver o caminho sem banco.
    env: {
      DATABASE_URL: "",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts", "src/lib/prisma.ts"],
      // Exigencia da disciplina de Qualidade e Testes: minimo 50%,
      // elevado para 100% apos cobertura completa de src/**/*.ts
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
