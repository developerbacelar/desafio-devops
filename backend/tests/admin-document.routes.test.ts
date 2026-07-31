import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const findCompanyBySlugMock = vi.fn();
vi.mock("../src/services/company.service.js", () => ({ findCompanyBySlug: findCompanyBySlugMock }));

const extractTextMock = vi.fn();
vi.mock("../src/services/extract.service.js", () => ({ extractText: extractTextMock }));

const ingestDocumentMock = vi.fn();
vi.mock("../src/services/ingest.service.js", () => ({ ingestDocument: ingestDocumentMock }));

const listDocumentsMock = vi.fn();
const deleteDocumentMock = vi.fn();
vi.mock("../src/services/document.service.js", () => ({
  listDocuments: listDocumentsMock,
  deleteDocument: deleteDocumentMock,
}));

const mockEnv = { jwtSecret: "segredo-de-teste" };
vi.mock("../src/lib/env.js", () => ({ env: mockEnv }));

const token = jwt.sign({ email: "admin@example.com", role: "admin" }, "segredo-de-teste");

describe("/api/admin/.../documents", () => {
  beforeEach(() => {
    vi.resetModules();
    findCompanyBySlugMock.mockReset();
    extractTextMock.mockReset();
    ingestDocumentMock.mockReset();
    listDocumentsMock.mockReset();
    deleteDocumentMock.mockReset();
    mockEnv.jwtSecret = "segredo-de-teste";
  });

  it("retorna 401 sem token", async () => {
    const { createApp } = await import("../src/app.js");
    const app = createApp();
    const res = await request(app).post("/api/admin/companies/acme/documents");
    expect(res.status).toBe(401);
  });

  it("envia um documento com sucesso", async () => {
    findCompanyBySlugMock.mockResolvedValue({ id: "company-1", slug: "acme" });
    extractTextMock.mockResolvedValue("conteudo extraido");
    ingestDocumentMock.mockResolvedValue({
      id: "doc-1",
      filename: "contexto.md",
      status: "ready",
      createdAt: new Date("2026-01-01"),
    });

    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/admin/companies/acme/documents")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("# Titulo\nconteudo"), {
        filename: "contexto.md",
        contentType: "text/markdown",
      });

    expect(res.status).toBe(201);
    expect(res.body.document).toEqual({
      id: "doc-1",
      filename: "contexto.md",
      status: "ready",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(ingestDocumentMock).toHaveBeenCalledWith("company-1", "contexto.md", "conteudo extraido");
  });

  it("retorna 404 quando a empresa nao existe", async () => {
    findCompanyBySlugMock.mockResolvedValue(null);
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/admin/companies/fantasma/documents")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("x"), { filename: "x.md", contentType: "text/markdown" });

    expect(res.status).toBe(404);
  });

  it("retorna 400 quando o arquivo excede o limite de 10MB", async () => {
    findCompanyBySlugMock.mockResolvedValue({ id: "company-1", slug: "acme" });
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const oversized = Buffer.alloc(11 * 1024 * 1024, "a");
    const res = await request(app)
      .post("/api/admin/companies/acme/documents")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", oversized, { filename: "grande.md", contentType: "text/markdown" });

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando o arquivo nao gera nenhum conteudo aproveitavel", async () => {
    findCompanyBySlugMock.mockResolvedValue({ id: "company-1", slug: "acme" });
    extractTextMock.mockResolvedValue("   ");
    ingestDocumentMock.mockResolvedValue(null);

    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/admin/companies/acme/documents")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("   "), { filename: "vazio.md", contentType: "text/markdown" });

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando nenhum arquivo e enviado", async () => {
    findCompanyBySlugMock.mockResolvedValue({ id: "company-1", slug: "acme" });
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/admin/companies/acme/documents")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando o tipo de arquivo nao e suportado", async () => {
    findCompanyBySlugMock.mockResolvedValue({ id: "company-1", slug: "acme" });
    extractTextMock.mockRejectedValue(new Error("Tipo de arquivo nao suportado: image/png"));

    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/admin/companies/acme/documents")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("x"), { filename: "x.png", contentType: "image/png" });

    expect(res.status).toBe(400);
  });

  it("lista os documentos de uma empresa", async () => {
    findCompanyBySlugMock.mockResolvedValue({ id: "company-1", slug: "acme" });
    listDocumentsMock.mockResolvedValue([
      { id: "1", filename: "a.md", status: "ready", createdAt: new Date("2026-01-01") },
    ]);

    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .get("/api/admin/companies/acme/documents")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.documents).toHaveLength(1);
  });

  it("retorna 404 ao listar documentos de empresa inexistente", async () => {
    findCompanyBySlugMock.mockResolvedValue(null);
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .get("/api/admin/companies/fantasma/documents")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("remove um documento", async () => {
    deleteDocumentMock.mockResolvedValue(undefined);
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app).delete("/api/admin/documents/doc-1").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(deleteDocumentMock).toHaveBeenCalledWith("doc-1");
  });

  it("retorna 404 ao remover documento inexistente", async () => {
    const { Prisma } = await import("@prisma/client");
    deleteDocumentMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record not found", { code: "P2025", clientVersion: "6.19.3" }),
    );
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app).delete("/api/admin/documents/fantasma").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("retorna 500 quando a remocao falha por outro motivo", async () => {
    deleteDocumentMock.mockRejectedValue(new Error("falha inesperada"));
    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app).delete("/api/admin/documents/doc-1").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(500);
  });
});
