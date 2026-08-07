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

  describe("fetchCompany", () => {
    it("busca /api/companies/:slug com o header X-Widget-Key e retorna a empresa", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ company: { slug: "technova", name: "TechNova", primaryColor: "#2563eb" } }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { fetchCompany } = await import("@/lib/api");
      const company = await fetchCompany("technova", "wk_abc123");

      expect(fetchMock).toHaveBeenCalledWith("http://localhost:3333/api/companies/technova", {
        headers: { "X-Widget-Key": "wk_abc123" },
      });
      expect(company).toEqual({ slug: "technova", name: "TechNova", primaryColor: "#2563eb" });
    });

    it("lanca erro quando a resposta nao e ok", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));

      const { fetchCompany } = await import("@/lib/api");
      await expect(fetchCompany("technova", "chave-errada")).rejects.toThrow(/empresa/);
    });
  });

  describe("sendChatMessage", () => {
    it("envia POST /api/chat com o payload, o header X-Widget-Key e retorna a resposta", async () => {
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
      const result = await sendChatMessage(
        {
          companySlug: "technova",
          question: "Voces entregam em Curitiba?",
          history: [],
        },
        "wk_abc123",
      );

      expect(fetchMock).toHaveBeenCalledWith("http://localhost:3333/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Widget-Key": "wk_abc123" },
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
        sendChatMessage({ companySlug: "technova", question: "", history: [] }, "wk_abc123"),
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
        sendChatMessage({ companySlug: "technova", question: "Ola", history: [] }, "wk_abc123"),
      ).rejects.toThrow(/Falha ao enviar/);
    });
  });
});
