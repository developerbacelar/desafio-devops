import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../src/services/company.service.js", () => ({
  listCompanies: vi.fn(),
}));

const { createApp } = await import("../src/app.js");
const { listCompanies } = await import("../src/services/company.service.js");

const app = createApp();

beforeEach(() => vi.clearAllMocks());

describe("GET /api/companies", () => {
  it("retorna 500 quando listCompanies falha", async () => {
    vi.mocked(listCompanies).mockRejectedValueOnce(new Error("falha no banco"));

    const res = await request(app).get("/api/companies");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Erro interno do servidor.");
  });

  it("inclui logoUrl na projecao publica quando a empresa tem uma cadastrada", async () => {
    vi.mocked(listCompanies).mockResolvedValueOnce([
      {
        id: "1",
        slug: "acme",
        name: "Acme",
        persona: "Voce e o assistente da Acme.",
        primaryColor: "#000000",
        logoUrl: "/logos/acme.svg",
      },
    ]);

    const res = await request(app).get("/api/companies");

    expect(res.status).toBe(200);
    expect(res.body.companies[0]).toEqual({
      slug: "acme",
      name: "Acme",
      primaryColor: "#000000",
      logoUrl: "/logos/acme.svg",
    });
  });
});
