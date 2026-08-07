import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../src/services/company.service.js", () => ({
  findCompanyForWidget: vi.fn(),
}));

const { createApp } = await import("../src/app.js");
const { findCompanyForWidget } = await import("../src/services/company.service.js");

const app = createApp();

beforeEach(() => vi.clearAllMocks());

describe("GET /api/companies/:slug", () => {
  it("retorna 403 quando a chave e invalida ou o slug nao existe", async () => {
    vi.mocked(findCompanyForWidget).mockResolvedValueOnce(null);

    const res = await request(app).get("/api/companies/acme").set("X-Widget-Key", "qualquer");

    expect(res.status).toBe(403);
  });

  it("retorna 403 quando o header X-Widget-Key esta ausente", async () => {
    vi.mocked(findCompanyForWidget).mockResolvedValueOnce(null);

    const res = await request(app).get("/api/companies/acme");

    expect(res.status).toBe(403);
    expect(findCompanyForWidget).toHaveBeenCalledWith("acme", undefined);
  });

  it("retorna a empresa (projecao publica, sem persona) quando a chave e valida", async () => {
    vi.mocked(findCompanyForWidget).mockResolvedValueOnce({
      id: "1",
      slug: "acme",
      name: "Acme",
      persona: "Voce e o assistente da Acme.",
      primaryColor: "#000000",
      logoUrl: "/logos/acme.svg",
    });

    const res = await request(app).get("/api/companies/acme").set("X-Widget-Key", "chave-certa");

    expect(res.status).toBe(200);
    expect(res.body.company).toEqual({
      slug: "acme",
      name: "Acme",
      primaryColor: "#000000",
      logoUrl: "/logos/acme.svg",
    });
    expect(res.body.company).not.toHaveProperty("persona");
    expect(findCompanyForWidget).toHaveBeenCalledWith("acme", "chave-certa");
  });

  it("retorna 500 quando findCompanyForWidget falha", async () => {
    vi.mocked(findCompanyForWidget).mockRejectedValueOnce(new Error("falha no banco"));

    const res = await request(app).get("/api/companies/acme").set("X-Widget-Key", "chave-certa");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Erro interno do servidor.");
  });
});
