import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// A chamada real ao Gemini e substituida por um duble: os testes nao
// dependem de rede nem consomem cota da API no pipeline.
vi.mock("../src/services/ai.service.js", () => ({
  ask: vi.fn(async () => "Resposta simulada da IA."),
}));

const { createApp } = await import("../src/app.js");
const { ask } = await import("../src/services/ai.service.js");

const app = createApp();

beforeEach(() => vi.clearAllMocks());

describe("GET /api/health", () => {
  it("responde com status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("GET /api/companies", () => {
  it("lista as empresas sem expor a persona", async () => {
    const res = await request(app).get("/api/companies");
    expect(res.status).toBe(200);
    expect(res.body.companies.length).toBeGreaterThan(0);
    expect(res.body.companies[0]).not.toHaveProperty("persona");
  });
});

describe("POST /api/chat", () => {
  it("retorna a resposta da IA", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ companySlug: "technova", question: "Voces entregam em Curitiba?" });

    expect(res.status).toBe(200);
    expect(res.body.answer).toBe("Resposta simulada da IA.");
    expect(res.body.company).toBe("technova");
    expect(ask).toHaveBeenCalledOnce();
  });

  it("usa a empresa padrao quando o slug nao e informado", async () => {
    const res = await request(app).post("/api/chat").send({ question: "Ola" });
    expect(res.status).toBe(200);
    expect(res.body.company).toBe("technova");
  });

  it("retorna 400 quando a pergunta esta vazia", async () => {
    const res = await request(app).post("/api/chat").send({ question: "  " });
    expect(res.status).toBe(400);
    expect(ask).not.toHaveBeenCalled();
  });

  it("retorna 404 para empresa inexistente", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ companySlug: "nao-existe", question: "Ola" });
    expect(res.status).toBe(404);
  });

  it("retorna 500 quando a IA falha", async () => {
    vi.mocked(ask).mockRejectedValueOnce(new Error("timeout"));
    const res = await request(app).post("/api/chat").send({ question: "Ola" });
    expect(res.status).toBe(500);
  });

  it("trata corpo ausente como objeto vazio", async () => {
    const res = await request(app).post("/api/chat");
    expect(res.status).toBe(400);
    expect(ask).not.toHaveBeenCalled();
  });

  it("retorna 404 para rota desconhecida", async () => {
    const res = await request(app).get("/api/inexistente");
    expect(res.status).toBe(404);
  });
});
