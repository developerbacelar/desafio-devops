import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Evita que o dotenv leia o .env real: assim controlamos totalmente
// process.env dentro de cada teste, sem depender do que esta no disco.
vi.mock("dotenv/config", () => ({}));

const ENV_KEYS = [
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "GROQ_API_KEY",
  "GROQ_MODEL",
  "PORT",
  "DATABASE_URL",
  "NODE_ENV",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD_HASH",
  "JWT_SECRET",
] as const;
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
    expect(env.geminiModel).toBe("gemini-3.5-flash");
    expect(env.groqApiKey).toBe("");
    expect(env.groqModel).toBe("llama-3.3-70b-versatile");
    expect(env.port).toBe(3333);
    expect(env.databaseUrl).toBe("");
    expect(env.isTest).toBe(false);
    expect(env.adminEmail).toBe("");
    expect(env.adminPasswordHash).toBe("");
    expect(env.jwtSecret).toBe("");
  });

  it("usa os valores definidos nas variaveis de ambiente", async () => {
    process.env.GEMINI_API_KEY = "chave-de-teste";
    process.env.GEMINI_MODEL = "gemini-flash-latest";
    process.env.GROQ_API_KEY = "chave-groq-teste";
    process.env.GROQ_MODEL = "llama-3.1-8b-instant";
    process.env.PORT = "4000";
    process.env.DATABASE_URL = "postgres://localhost/db";
    process.env.NODE_ENV = "test";
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD_HASH = "hash-fake";
    process.env.JWT_SECRET = "segredo-fake";

    const { env } = await import("../src/lib/env.js");

    expect(env.geminiApiKey).toBe("chave-de-teste");
    expect(env.geminiModel).toBe("gemini-flash-latest");
    expect(env.groqApiKey).toBe("chave-groq-teste");
    expect(env.groqModel).toBe("llama-3.1-8b-instant");
    expect(env.port).toBe(4000);
    expect(env.databaseUrl).toBe("postgres://localhost/db");
    expect(env.isTest).toBe(true);
    expect(env.adminEmail).toBe("admin@example.com");
    expect(env.adminPasswordHash).toBe("hash-fake");
    expect(env.jwtSecret).toBe("segredo-fake");
  });
});
