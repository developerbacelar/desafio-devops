import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

const mockEnv = { jwtSecret: "segredo-de-teste" };
vi.mock("../src/lib/env.js", () => ({ env: mockEnv }));

async function buildTestApp() {
  const { requireAdmin } = await import("../src/middlewares/auth.middleware.js");
  const { errorMiddleware } = await import("../src/middlewares/error.middleware.js");
  const app = express();
  app.get("/protected", requireAdmin, (_req, res) => res.json({ ok: true }));
  app.use(errorMiddleware);
  return app;
}

describe("auth.middleware", () => {
  beforeEach(() => {
    vi.resetModules();
    mockEnv.jwtSecret = "segredo-de-teste";
  });

  it("retorna 401 quando o header Authorization esta ausente", async () => {
    const res = await request(await buildTestApp()).get("/protected");
    expect(res.status).toBe(401);
  });

  it("retorna 401 quando o header nao comeca com Bearer", async () => {
    const res = await request(await buildTestApp()).get("/protected").set("Authorization", "Basic abc123");
    expect(res.status).toBe(401);
  });

  it("retorna 401 quando o token e invalido", async () => {
    const res = await request(await buildTestApp())
      .get("/protected")
      .set("Authorization", "Bearer token-invalido");
    expect(res.status).toBe(401);
  });

  it("retorna 401 quando o token esta expirado", async () => {
    const token = jwt.sign({ email: "admin@example.com" }, "segredo-de-teste", { expiresIn: -1 });
    const res = await request(await buildTestApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("chama a proxima rota quando o token e valido", async () => {
    const token = jwt.sign({ email: "admin@example.com" }, "segredo-de-teste");
    const res = await request(await buildTestApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
