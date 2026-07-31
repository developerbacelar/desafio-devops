import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const askMock = vi.fn(async () => "Resposta simulada da IA.");
vi.mock("../src/services/ai.service.js", () => ({ ask: askMock }));

const retrieveContextMock = vi.fn();
vi.mock("../src/services/retrieval.service.js", () => ({ retrieveContext: retrieveContextMock }));

const companyFindUniqueMock = vi.fn();
vi.mock("../src/lib/prisma.js", () => ({
  getPrisma: () => ({ company: { findUnique: companyFindUniqueMock } }),
}));

const mockEnv = {
  databaseUrl: "postgres://localhost/db",
  geminiApiKey: "chave-de-teste",
  geminiModel: "gemini-flash-latest",
};
vi.mock("../src/lib/env.js", () => ({ env: mockEnv }));

describe("POST /api/chat com RAG (DATABASE_URL configurada)", () => {
  beforeEach(() => {
    vi.resetModules();
    askMock.mockClear();
    retrieveContextMock.mockReset();
    companyFindUniqueMock.mockReset();
    mockEnv.databaseUrl = "postgres://localhost/db";
  });

  it("busca o contexto da empresa e injeta os trechos no system prompt enviado a IA", async () => {
    companyFindUniqueMock.mockResolvedValue({
      id: "company-1",
      slug: "technova",
      name: "TechNova Eletronicos",
      persona: "Voce e o assistente da TechNova.",
      primaryColor: "#2563eb",
      logoUrl: null,
    });
    retrieveContextMock.mockResolvedValue([{ content: "Entregamos em Curitiba em 2 dias.", score: 0.9 }]);

    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/chat")
      .send({ companySlug: "technova", question: "Voces entregam em Curitiba?" });

    expect(res.status).toBe(200);
    expect(retrieveContextMock).toHaveBeenCalledWith("company-1", "Voces entregam em Curitiba?");
    expect(askMock).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining("Entregamos em Curitiba em 2 dias."),
      }),
    );
  });

  it("continua respondendo normalmente quando nao ha nenhum trecho relevante", async () => {
    companyFindUniqueMock.mockResolvedValue({
      id: "company-1",
      slug: "technova",
      name: "TechNova Eletronicos",
      persona: "Voce e o assistente da TechNova.",
      primaryColor: "#2563eb",
      logoUrl: null,
    });
    retrieveContextMock.mockResolvedValue([]);

    const { createApp } = await import("../src/app.js");
    const app = createApp();

    const res = await request(app).post("/api/chat").send({ companySlug: "technova", question: "Qualquer coisa" });

    expect(res.status).toBe(200);
    expect(askMock).toHaveBeenCalled();
  });
});
