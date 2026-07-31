import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const companyFindManyMock = vi.fn();
const companyFindUniqueMock = vi.fn();
const companyCreateMock = vi.fn();
const companyUpdateMock = vi.fn();
const companyDeleteMock = vi.fn();
vi.mock("../src/lib/prisma.js", () => ({
  getPrisma: () => ({
    company: {
      findMany: companyFindManyMock,
      findUnique: companyFindUniqueMock,
      create: companyCreateMock,
      update: companyUpdateMock,
      delete: companyDeleteMock,
    },
  }),
}));

const mockEnv = { databaseUrl: "postgres://localhost/db", jwtSecret: "segredo-de-teste" };
vi.mock("../src/lib/env.js", () => ({ env: mockEnv }));

const token = jwt.sign({ email: "admin@example.com", role: "admin" }, "segredo-de-teste");

describe("/api/admin/companies", () => {
  beforeEach(() => {
    vi.resetModules();
    companyFindManyMock.mockReset();
    companyFindUniqueMock.mockReset();
    companyCreateMock.mockReset();
    companyUpdateMock.mockReset();
    companyDeleteMock.mockReset();
    mockEnv.databaseUrl = "postgres://localhost/db";
    mockEnv.jwtSecret = "segredo-de-teste";
  });

  it("retorna 401 em todas as rotas sem token", async () => {
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    expect((await request(app).get("/api/admin/companies")).status).toBe(401);
    expect((await request(app).post("/api/admin/companies").send({})).status).toBe(401);
    expect((await request(app).put("/api/admin/companies/x").send({})).status).toBe(401);
    expect((await request(app).delete("/api/admin/companies/x")).status).toBe(401);
  });

  it("lista todas as empresas, com persona, quando autenticado", async () => {
    companyFindManyMock.mockResolvedValue([
      { id: "1", slug: "acme", name: "Acme", persona: "p", primaryColor: "#112233", logoUrl: null },
    ]);
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app).get("/api/admin/companies").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.companies[0].persona).toBe("p");
  });

  it("retorna 500 quando listCompanies falha", async () => {
    companyFindManyMock.mockRejectedValue(new Error("falha no banco"));
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app).get("/api/admin/companies").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(500);
  });

  it("cria uma empresa nova", async () => {
    companyCreateMock.mockResolvedValue({
      id: "1",
      slug: "nova",
      name: "Nova",
      persona: "p",
      primaryColor: "#112233",
      logoUrl: null,
    });
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/admin/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ slug: "nova", name: "Nova", persona: "p", primaryColor: "#112233" });

    expect(res.status).toBe(201);
    expect(res.body.company.slug).toBe("nova");
  });

  it("retorna 400 quando os dados de criacao sao invalidos", async () => {
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/admin/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ slug: "Slug Invalido", name: "x", persona: "x", primaryColor: "#112233" });

    expect(res.status).toBe(400);
    expect(companyCreateMock).not.toHaveBeenCalled();
  });

  it("retorna 409 quando o slug ja existe", async () => {
    const { Prisma } = await import("@prisma/client");
    companyCreateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.19.3",
      }),
    );
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/admin/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ slug: "repetido", name: "x", persona: "x", primaryColor: "#112233" });

    expect(res.status).toBe(409);
  });

  it("retorna uma empresa pelo slug", async () => {
    companyFindUniqueMock.mockResolvedValue({
      id: "1",
      slug: "acme",
      name: "Acme",
      persona: "p",
      primaryColor: "#112233",
      logoUrl: null,
    });
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app).get("/api/admin/companies/acme").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.company.slug).toBe("acme");
  });

  it("retorna 404 quando a empresa nao existe", async () => {
    companyFindUniqueMock.mockResolvedValue(null);
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app).get("/api/admin/companies/fantasma").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("atualiza uma empresa existente", async () => {
    companyUpdateMock.mockResolvedValue({
      id: "1",
      slug: "acme",
      name: "Nome Novo",
      persona: "p",
      primaryColor: "#112233",
      logoUrl: null,
    });
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .put("/api/admin/companies/acme")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nome Novo" });

    expect(res.status).toBe(200);
    expect(res.body.company.name).toBe("Nome Novo");
  });

  it("retorna 404 ao atualizar empresa inexistente", async () => {
    const { Prisma } = await import("@prisma/client");
    companyUpdateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "6.19.3",
      }),
    );
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .put("/api/admin/companies/fantasma")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nome Novo" });

    expect(res.status).toBe(404);
  });

  it("retorna 400 ao atualizar com corpo invalido", async () => {
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .put("/api/admin/companies/acme")
      .set("Authorization", `Bearer ${token}`)
      .send({ primaryColor: "vermelho" });

    expect(res.status).toBe(400);
    expect(companyUpdateMock).not.toHaveBeenCalled();
  });

  it("atualiza o slug de uma empresa existente", async () => {
    companyUpdateMock.mockResolvedValue({
      id: "1",
      slug: "novo-slug",
      name: "Acme",
      persona: "p",
      primaryColor: "#112233",
      logoUrl: null,
    });
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .put("/api/admin/companies/acme")
      .set("Authorization", `Bearer ${token}`)
      .send({ slug: "novo-slug" });

    expect(res.status).toBe(200);
    expect(res.body.company.slug).toBe("novo-slug");
    expect(companyUpdateMock).toHaveBeenCalledWith({ where: { slug: "acme" }, data: { slug: "novo-slug" } });
  });

  it("retorna 409 quando o novo slug ja esta em uso", async () => {
    const { Prisma } = await import("@prisma/client");
    companyUpdateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.19.3",
      }),
    );
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .put("/api/admin/companies/acme")
      .set("Authorization", `Bearer ${token}`)
      .send({ slug: "ja-existe" });

    expect(res.status).toBe(409);
  });

  it("exclui uma empresa existente", async () => {
    companyDeleteMock.mockResolvedValue(undefined);
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .delete("/api/admin/companies/acme")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(companyDeleteMock).toHaveBeenCalledWith({ where: { slug: "acme" } });
  });

  it("retorna 404 ao excluir empresa inexistente", async () => {
    const { Prisma } = await import("@prisma/client");
    companyDeleteMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "6.19.3",
      }),
    );
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .delete("/api/admin/companies/fantasma")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("retorna 500 quando a exclusao falha por outro motivo", async () => {
    companyDeleteMock.mockRejectedValue(new Error("falha inesperada"));
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .delete("/api/admin/companies/acme")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(500);
  });
});
