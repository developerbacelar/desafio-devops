import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Evita que o dotenv leia o .env real: assim controlamos totalmente
// process.env dentro de cada teste, sem depender do que esta no disco.
vi.mock("dotenv/config", () => ({}));

const ENV_KEYS = ["GEMINI_API_KEY", "GEMINI_MODEL", "PORT", "DATABASE_URL", "NODE_ENV"] as const;
type EnvKey = (typeof ENV_KEYS)[number];
const originalValues: Partial<Record<EnvKey, string | undefined>> = {};

describe("env", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) originalValues[key] = process.env[key];
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalValues[key] === undefined) delete process.env[key];
      else process.env[key] = originalValues[key];
    }
  });

  it("usa os valores padrao quando as variaveis nao estao definidas", async () => {
    for (const key of ENV_KEYS) delete process.env[key];

    const { env } = await import("../src/lib/env.js");

    expect(env.geminiApiKey).toBe("");
    expect(env.geminiModel).toBe("gemini-2.5-flash");
    expect(env.port).toBe(3333);
    expect(env.databaseUrl).toBe("");
    expect(env.isTest).toBe(false);
  });

  it("usa os valores definidos nas variaveis de ambiente", async () => {
    process.env.GEMINI_API_KEY = "chave-de-teste";
    process.env.GEMINI_MODEL = "gemini-flash-latest";
    process.env.PORT = "4000";
    process.env.DATABASE_URL = "postgres://localhost/db";
    process.env.NODE_ENV = "test";

    const { env } = await import("../src/lib/env.js");

    expect(env.geminiApiKey).toBe("chave-de-teste");
    expect(env.geminiModel).toBe("gemini-flash-latest");
    expect(env.port).toBe(4000);
    expect(env.databaseUrl).toBe("postgres://localhost/db");
    expect(env.isTest).toBe(true);
  });
});
