import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/adminAuth", () => ({
  getToken: vi.fn(),
  clearToken: vi.fn(),
}));

describe("lib/adminApi", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:3333");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe("adminLogin", () => {
    it("envia POST /api/admin/login e retorna o token", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: "abc123" }) }),
      );

      const { adminLogin } = await import("@/lib/adminApi");
      const token = await adminLogin("admin@example.com", "senha-correta");

      expect(token).toBe("abc123");
    });

    it("lanca a mensagem do backend quando as credenciais sao invalidas", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: "Credenciais invalidas." }) }),
      );

      const { adminLogin } = await import("@/lib/adminApi");
      await expect(adminLogin("admin@example.com", "senha-errada")).rejects.toThrow("Credenciais invalidas.");
    });
  });

  describe("fetchAdminCompanies", () => {
    it("envia o Bearer token e retorna a lista de empresas", async () => {
      const { getToken } = await import("@/lib/adminAuth");
      vi.mocked(getToken).mockReturnValue("token-valido");
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          companies: [{ id: "1", slug: "acme", name: "Acme", persona: "p", primaryColor: "#112233" }],
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { fetchAdminCompanies } = await import("@/lib/adminApi");
      const companies = await fetchAdminCompanies();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("http://localhost:3333/api/admin/companies");
      expect((options.headers as Headers).get("Authorization")).toBe("Bearer token-valido");
      expect(companies).toEqual([{ id: "1", slug: "acme", name: "Acme", persona: "p", primaryColor: "#112233" }]);
    });

    it("em 401, limpa o token e redireciona para /admin/login", async () => {
      const { getToken, clearToken } = await import("@/lib/adminAuth");
      vi.mocked(getToken).mockReturnValue("token-expirado");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: "Token invalido ou expirado." }) }),
      );
      vi.stubGlobal("location", { href: "" });

      const { fetchAdminCompanies } = await import("@/lib/adminApi");
      await expect(fetchAdminCompanies()).rejects.toThrow();

      expect(clearToken).toHaveBeenCalledTimes(1);
      expect(window.location.href).toBe("/admin/login");
    });
  });

  describe("fetchAdminCompany", () => {
    it("busca uma empresa pelo slug", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ company: { id: "1", slug: "acme", name: "Acme", persona: "p", primaryColor: "#112233" } }),
        }),
      );

      const { fetchAdminCompany } = await import("@/lib/adminApi");
      const company = await fetchAdminCompany("acme");

      expect(company.slug).toBe("acme");
    });

    it("lanca erro 404 do backend quando a empresa nao existe", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: 'Empresa "fantasma" nao encontrada.' }) }),
      );

      const { fetchAdminCompany } = await import("@/lib/adminApi");
      await expect(fetchAdminCompany("fantasma")).rejects.toThrow("nao encontrada");
    });
  });

  describe("createCompany", () => {
    it("envia POST com o payload e retorna a empresa criada junto com a apiKey", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          company: { id: "1", slug: "nova", name: "Nova", persona: "p", primaryColor: "#112233" },
          apiKey: "wk_abc123",
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { createCompany } = await import("@/lib/adminApi");
      const input = { slug: "nova", name: "Nova", persona: "p", primaryColor: "#112233" };
      const result = await createCompany(input);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("http://localhost:3333/api/admin/companies");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body as string)).toEqual(input);
      expect(result.company.slug).toBe("nova");
      expect(result.apiKey).toBe("wk_abc123");
    });

    it("lanca erro 409 do backend quando o slug ja existe", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: "Slug ja esta em uso." }) }),
      );

      const { createCompany } = await import("@/lib/adminApi");
      await expect(
        createCompany({ slug: "repetido", name: "x", persona: "x", primaryColor: "#112233" }),
      ).rejects.toThrow("Slug ja esta em uso.");
    });
  });

  describe("rotateApiKey", () => {
    it("envia POST /rotate-key e retorna a empresa junto com a nova apiKey", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          company: { id: "1", slug: "acme", name: "Acme", persona: "p", primaryColor: "#112233" },
          apiKey: "wk_nova_chave",
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { rotateApiKey } = await import("@/lib/adminApi");
      const result = await rotateApiKey("acme");

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("http://localhost:3333/api/admin/companies/acme/rotate-key");
      expect(options.method).toBe("POST");
      expect(result.apiKey).toBe("wk_nova_chave");
    });

    it("lanca erro quando a empresa nao existe", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: "Empresa nao encontrada." }) }),
      );

      const { rotateApiKey } = await import("@/lib/adminApi");
      await expect(rotateApiKey("fantasma")).rejects.toThrow("Empresa nao encontrada.");
    });
  });

  describe("updateCompany", () => {
    it("envia PUT para o slug com o payload parcial", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ company: { id: "1", slug: "acme", name: "Novo nome", persona: "p", primaryColor: "#112233" } }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { updateCompany } = await import("@/lib/adminApi");
      const company = await updateCompany("acme", { name: "Novo nome" });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("http://localhost:3333/api/admin/companies/acme");
      expect(options.method).toBe("PUT");
      expect(JSON.parse(options.body as string)).toEqual({ name: "Novo nome" });
      expect(company.name).toBe("Novo nome");
    });

    it("envia slug quando presente no payload parcial", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ company: { id: "1", slug: "novo-slug", name: "Acme", persona: "p", primaryColor: "#112233" } }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { updateCompany } = await import("@/lib/adminApi");
      await updateCompany("acme", { slug: "novo-slug" });

      const [, options] = fetchMock.mock.calls[0];
      expect(JSON.parse(options.body as string)).toEqual({ slug: "novo-slug" });
    });
  });

  describe("fetchDocuments", () => {
    it("busca os documentos de uma empresa", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ documents: [{ id: "1", filename: "a.md", status: "ready", createdAt: "2026-01-01T00:00:00.000Z" }] }),
        }),
      );

      const { fetchDocuments } = await import("@/lib/adminApi");
      const documents = await fetchDocuments("acme");

      expect(documents).toHaveLength(1);
      expect(documents[0].filename).toBe("a.md");
    });
  });

  describe("uploadDocument", () => {
    it("envia o arquivo como multipart/form-data", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ document: { id: "1", filename: "contexto.md", status: "ready", createdAt: "2026-01-01T00:00:00.000Z" } }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { uploadDocument } = await import("@/lib/adminApi");
      const file = new File(["conteudo"], "contexto.md", { type: "text/markdown" });
      const document = await uploadDocument("acme", file);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("http://localhost:3333/api/admin/companies/acme/documents");
      expect(options.method).toBe("POST");
      expect(options.body).toBeInstanceOf(FormData);
      expect((options.body as FormData).get("file")).toBe(file);
      expect(document.filename).toBe("contexto.md");
    });

    it("lanca erro 400 do backend quando o arquivo e invalido", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "Arquivo invalido ou maior que 10MB." }) }),
      );

      const { uploadDocument } = await import("@/lib/adminApi");
      const file = new File(["x"], "grande.md", { type: "text/markdown" });
      await expect(uploadDocument("acme", file)).rejects.toThrow("10MB");
    });
  });

  describe("deleteDocument", () => {
    it("envia DELETE para o documento", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
      vi.stubGlobal("fetch", fetchMock);

      const { deleteDocument } = await import("@/lib/adminApi");
      await deleteDocument("doc-1");

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("http://localhost:3333/api/admin/documents/doc-1");
      expect(options.method).toBe("DELETE");
    });
  });

  describe("deleteCompany", () => {
    it("envia DELETE para a empresa", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
      vi.stubGlobal("fetch", fetchMock);

      const { deleteCompany } = await import("@/lib/adminApi");
      await deleteCompany("acme");

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("http://localhost:3333/api/admin/companies/acme");
      expect(options.method).toBe("DELETE");
    });

    it("lanca erro 404 do backend quando a empresa nao existe", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: 'Empresa "acme" nao encontrada.' }) }),
      );

      const { deleteCompany } = await import("@/lib/adminApi");
      await expect(deleteCompany("acme")).rejects.toThrow("nao encontrada");
    });
  });
});
