import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const mockEnv = {
  adminEmail: "admin@example.com",
  adminPasswordHash: "",
  jwtSecret: "segredo-de-teste",
  databaseUrl: "",
};
vi.mock("../src/lib/env.js", () => ({ env: mockEnv }));

describe("POST /api/admin/login", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockEnv.adminEmail = "admin@example.com";
    mockEnv.adminPasswordHash = await bcrypt.hash("senha-correta", 4);
    mockEnv.jwtSecret = "segredo-de-teste";
    mockEnv.databaseUrl = "";
  });

  it("retorna um token valido com credenciais corretas", async () => {
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/admin/login")
      .send({ email: "admin@example.com", password: "senha-correta" });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    const decoded = jwt.verify(res.body.token, "segredo-de-teste") as { email: string; role: string };
    expect(decoded.email).toBe("admin@example.com");
    expect(decoded.role).toBe("admin");
  });

  it("retorna 401 com senha errada", async () => {
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/admin/login")
      .send({ email: "admin@example.com", password: "senha-errada" });

    expect(res.status).toBe(401);
  });

  it("retorna 401 com email errado", async () => {
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/admin/login")
      .send({ email: "outro@example.com", password: "senha-correta" });

    expect(res.status).toBe(401);
  });

  it("retorna 400 quando email ou senha nao sao enviados", async () => {
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app).post("/api/admin/login").send({ email: "admin@example.com" });

    expect(res.status).toBe(400);
  });

  it("trata corpo ausente como objeto vazio", async () => {
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app).post("/api/admin/login");

    expect(res.status).toBe(400);
  });

  it("retorna 401 quando ADMIN_PASSWORD_HASH nao esta configurado", async () => {
    mockEnv.adminPasswordHash = "";
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/admin/login")
      .send({ email: "admin@example.com", password: "senha-correta" });

    expect(res.status).toBe(401);
  });

  it("ignora caixa e espacos no email", async () => {
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/admin/login")
      .send({ email: "  ADMIN@EXAMPLE.COM  ", password: "senha-correta" });

    expect(res.status).toBe(200);
  });
});
