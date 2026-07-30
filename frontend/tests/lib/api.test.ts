import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("lib/api", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:3333");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe("fetchCompanies", () => {
    it("busca /api/companies e retorna a lista de empresas", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ companies: [{ slug: "technova", name: "TechNova", primaryColor: "#2563eb" }] }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { fetchCompanies } = await import("@/lib/api");
      const companies = await fetchCompanies();

      expect(fetchMock).toHaveBeenCalledWith("http://localhost:3333/api/companies");
      expect(companies).toEqual([{ slug: "technova", name: "TechNova", primaryColor: "#2563eb" }]);
    });

    it("lanca erro quando a resposta nao e ok", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));

      const { fetchCompanies } = await import("@/lib/api");
      await expect(fetchCompanies()).rejects.toThrow(/empresas/);
    });
  });

  describe("sendChatMessage", () => {
    it("envia POST /api/chat com o payload e retorna a resposta", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          company: "technova",
          question: "Voces entregam em Curitiba?",
          answer: "Sim, entregamos.",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { sendChatMessage } = await import("@/lib/api");
      const result = await sendChatMessage({
        companySlug: "technova",
        question: "Voces entregam em Curitiba?",
        history: [],
      });

      expect(fetchMock).toHaveBeenCalledWith("http://localhost:3333/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companySlug: "technova",
          question: "Voces entregam em Curitiba?",
          history: [],
        }),
      });
      expect(result.answer).toBe("Sim, entregamos.");
    });

    it("lanca erro com a mensagem do backend quando a resposta nao e ok", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "A pergunta nao pode estar vazia." }) }),
      );

      const { sendChatMessage } = await import("@/lib/api");
      await expect(
        sendChatMessage({ companySlug: "technova", question: "", history: [] }),
      ).rejects.toThrow("A pergunta nao pode estar vazia.");
    });

    it("lanca erro generico quando a resposta de erro nao tem corpo JSON valido", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => {
            throw new Error("corpo invalido");
          },
        }),
      );

      const { sendChatMessage } = await import("@/lib/api");
      await expect(
        sendChatMessage({ companySlug: "technova", question: "Ola", history: [] }),
      ).rejects.toThrow(/Falha ao enviar/);
    });
  });
});
