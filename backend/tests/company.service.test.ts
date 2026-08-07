import { beforeEach, describe, expect, it, vi } from "vitest";

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

const mockEnv = { databaseUrl: "" };
vi.mock("../src/lib/env.js", () => ({ env: mockEnv }));

describe("company.service", () => {
  beforeEach(() => {
    vi.resetModules();
    companyFindManyMock.mockReset();
    companyFindUniqueMock.mockReset();
    companyCreateMock.mockReset();
    companyUpdateMock.mockReset();
    companyDeleteMock.mockReset();
    mockEnv.databaseUrl = "";
  });

  describe("sem DATABASE_URL (fallback em memoria)", () => {
    it("lista as empresas cadastradas", async () => {
      const { listCompanies } = await import("../src/services/company.service.js");
      const companies = await listCompanies();
      expect(companies.length).toBeGreaterThan(0);
      expect(companyFindManyMock).not.toHaveBeenCalled();
    });

    it("encontra empresa pelo slug", async () => {
      const { findCompanyBySlug } = await import("../src/services/company.service.js");
      expect((await findCompanyBySlug("technova"))?.name).toBe("TechNova Eletronicos");
    });

    it("ignora caixa e espacos no slug", async () => {
      const { findCompanyBySlug } = await import("../src/services/company.service.js");
      expect((await findCompanyBySlug("  TechNova  "))?.slug).toBe("technova");
    });

    it("retorna null para slug inexistente", async () => {
      const { findCompanyBySlug } = await import("../src/services/company.service.js");
      expect(await findCompanyBySlug("empresa-fantasma")).toBeNull();
    });

    it("logoUrl fica indefinido quando a empresa fallback ainda nao tem logo cadastrada", async () => {
      const { findCompanyBySlug } = await import("../src/services/company.service.js");
      expect((await findCompanyBySlug("technova"))?.logoUrl).toBeUndefined();
    });

    it("documentCount e zero para as empresas de fallback", async () => {
      const { listCompanies } = await import("../src/services/company.service.js");
      const companies = await listCompanies();
      expect(companies.every((c) => c.documentCount === 0)).toBe(true);
    });

    describe("findCompanyForWidget", () => {
      it("retorna a empresa quando o slug existe e a chave de fallback bate", async () => {
        const { findCompanyForWidget, FALLBACK_API_KEY } = await import("../src/services/company.service.js");
        const company = await findCompanyForWidget("technova", FALLBACK_API_KEY);
        expect(company?.slug).toBe("technova");
      });

      it("retorna null quando a chave esta errada", async () => {
        const { findCompanyForWidget } = await import("../src/services/company.service.js");
        expect(await findCompanyForWidget("technova", "chave-errada")).toBeNull();
      });

      it("retorna null quando a chave esta ausente", async () => {
        const { findCompanyForWidget } = await import("../src/services/company.service.js");
        expect(await findCompanyForWidget("technova", undefined)).toBeNull();
      });

      it("retorna null para slug inexistente mesmo com a chave de fallback certa", async () => {
        const { findCompanyForWidget, FALLBACK_API_KEY } = await import("../src/services/company.service.js");
        expect(await findCompanyForWidget("empresa-fantasma", FALLBACK_API_KEY)).toBeNull();
      });
    });
  });

  describe("com DATABASE_URL setada (banco via Prisma)", () => {
    beforeEach(() => {
      mockEnv.databaseUrl = "postgres://localhost/db";
    });

    it("lista empresas a partir do banco, com contagem de documentos", async () => {
      companyFindManyMock.mockResolvedValue([
        {
          id: "1",
          slug: "acme",
          name: "Acme",
          persona: "Voce e o assistente da Acme.",
          primaryColor: "#000000",
          logoUrl: null,
          createdAt: new Date(),
          _count: { documents: 2 },
        },
      ]);
      const { listCompanies } = await import("../src/services/company.service.js");

      const companies = await listCompanies();

      expect(companies).toEqual([
        {
          id: "1",
          slug: "acme",
          name: "Acme",
          persona: "Voce e o assistente da Acme.",
          primaryColor: "#000000",
          documentCount: 2,
        },
      ]);
      expect(companyFindManyMock).toHaveBeenCalledWith({ include: { _count: { select: { documents: true } } } });
    });

    it("inclui logoUrl quando o banco tem o campo preenchido", async () => {
      companyFindManyMock.mockResolvedValue([
        {
          id: "1",
          slug: "acme",
          name: "Acme",
          persona: "Voce e o assistente da Acme.",
          primaryColor: "#000000",
          logoUrl: "/logos/acme.svg",
          createdAt: new Date(),
        },
      ]);
      const { listCompanies } = await import("../src/services/company.service.js");

      const companies = await listCompanies();

      expect(companies[0].logoUrl).toBe("/logos/acme.svg");
    });

    it("busca empresa pelo slug normalizado no banco", async () => {
      companyFindUniqueMock.mockResolvedValue({
        id: "2",
        slug: "technova",
        name: "TechNova",
        persona: "p",
        primaryColor: "#111111",
        createdAt: new Date(),
      });
      const { findCompanyBySlug } = await import("../src/services/company.service.js");

      const company = await findCompanyBySlug("  TechNova  ");

      expect(company?.slug).toBe("technova");
      expect(companyFindUniqueMock).toHaveBeenCalledWith({ where: { slug: "technova" } });
    });

    it("retorna null quando o banco nao encontra a empresa", async () => {
      companyFindUniqueMock.mockResolvedValue(null);
      const { findCompanyBySlug } = await import("../src/services/company.service.js");

      expect(await findCompanyBySlug("nao-existe")).toBeNull();
    });

    describe("findCompanyForWidget", () => {
      it("retorna a empresa quando a chave bate com o hash armazenado", async () => {
        const { generateApiKey, findCompanyForWidget } = await import("../src/services/company.service.js");
        const { createHash } = await import("node:crypto");
        const apiKey = generateApiKey();
        companyFindUniqueMock.mockResolvedValue({
          id: "1",
          slug: "acme",
          name: "Acme",
          persona: "p",
          primaryColor: "#000000",
          logoUrl: null,
          apiKeyHash: createHash("sha256").update(apiKey).digest("hex"),
        });

        const company = await findCompanyForWidget("acme", apiKey);

        expect(company?.slug).toBe("acme");
      });

      it("retorna null quando a chave nao bate com o hash armazenado", async () => {
        companyFindUniqueMock.mockResolvedValue({
          id: "1",
          slug: "acme",
          name: "Acme",
          persona: "p",
          primaryColor: "#000000",
          logoUrl: null,
          apiKeyHash: "hash-de-outra-chave",
        });
        const { findCompanyForWidget } = await import("../src/services/company.service.js");

        expect(await findCompanyForWidget("acme", "chave-errada")).toBeNull();
      });

      it("retorna null quando o slug nao existe no banco", async () => {
        companyFindUniqueMock.mockResolvedValue(null);
        const { findCompanyForWidget } = await import("../src/services/company.service.js");

        expect(await findCompanyForWidget("nao-existe", "qualquer-chave")).toBeNull();
      });
    });
  });

  describe("generateApiKey / verifyApiKey", () => {
    it("gera chaves com o prefixo wk_ e valores diferentes a cada chamada", async () => {
      const { generateApiKey } = await import("../src/services/company.service.js");
      const a = generateApiKey();
      const b = generateApiKey();
      expect(a).toMatch(/^wk_/);
      expect(b).toMatch(/^wk_/);
      expect(a).not.toBe(b);
    });

    it("verifyApiKey confere hash e chave corretamente", async () => {
      const { generateApiKey, verifyApiKey } = await import("../src/services/company.service.js");
      const { createHash } = await import("node:crypto");
      const key = generateApiKey();
      const hash = createHash("sha256").update(key).digest("hex");

      expect(verifyApiKey(hash, key)).toBe(true);
      expect(verifyApiKey(hash, "outra-chave")).toBe(false);
      expect(verifyApiKey(null, key)).toBe(false);
      expect(verifyApiKey(hash, undefined)).toBe(false);
    });
  });

  describe("validateCreateCompanyInput", () => {
    it("aceita entrada valida e normaliza espacos", async () => {
      const { validateCreateCompanyInput } = await import("../src/services/company.service.js");
      const result = validateCreateCompanyInput({
        slug: "nova-empresa",
        name: "  Nova Empresa  ",
        persona: "  Voce e o assistente.  ",
        primaryColor: "#112233",
      });
      expect(result).toEqual({
        slug: "nova-empresa",
        name: "Nova Empresa",
        persona: "Voce e o assistente.",
        primaryColor: "#112233",
        logoUrl: undefined,
      });
    });

    it("rejeita slug fora do padrao", async () => {
      const { validateCreateCompanyInput } = await import("../src/services/company.service.js");
      expect(() =>
        validateCreateCompanyInput({ slug: "Nova Empresa", name: "x", persona: "x", primaryColor: "#112233" }),
      ).toThrow(/slug/i);
    });

    it("rejeita nome vazio", async () => {
      const { validateCreateCompanyInput } = await import("../src/services/company.service.js");
      expect(() =>
        validateCreateCompanyInput({ slug: "nova", name: "  ", persona: "x", primaryColor: "#112233" }),
      ).toThrow(/nome/i);
    });

    it("rejeita persona vazia", async () => {
      const { validateCreateCompanyInput } = await import("../src/services/company.service.js");
      expect(() =>
        validateCreateCompanyInput({ slug: "nova", name: "x", persona: "  ", primaryColor: "#112233" }),
      ).toThrow(/persona/i);
    });

    it("rejeita cor fora do formato hex", async () => {
      const { validateCreateCompanyInput } = await import("../src/services/company.service.js");
      expect(() =>
        validateCreateCompanyInput({ slug: "nova", name: "x", persona: "x", primaryColor: "azul" }),
      ).toThrow(/cor/i);
    });

    it("rejeita entrada que nao e um objeto", async () => {
      const { validateCreateCompanyInput } = await import("../src/services/company.service.js");
      expect(() => validateCreateCompanyInput("nao e objeto")).toThrow(/dados da empresa/i);
      expect(() => validateCreateCompanyInput(null)).toThrow(/dados da empresa/i);
    });

    it("rejeita logoUrl que nao e texto", async () => {
      const { validateCreateCompanyInput } = await import("../src/services/company.service.js");
      expect(() =>
        validateCreateCompanyInput({ slug: "nova", name: "x", persona: "x", primaryColor: "#112233", logoUrl: 123 }),
      ).toThrow(/logourl/i);
    });

    it("aceita logoUrl valido e normaliza espacos", async () => {
      const { validateCreateCompanyInput } = await import("../src/services/company.service.js");
      const result = validateCreateCompanyInput({
        slug: "nova",
        name: "x",
        persona: "x",
        primaryColor: "#112233",
        logoUrl: "  /logos/nova.svg  ",
      });
      expect(result.logoUrl).toBe("/logos/nova.svg");
    });
  });

  describe("validateUpdateCompanyInput", () => {
    it("aceita atualizacao parcial", async () => {
      const { validateUpdateCompanyInput } = await import("../src/services/company.service.js");
      expect(validateUpdateCompanyInput({ name: "  Novo Nome  " })).toEqual({ name: "Novo Nome" });
    });

    it("rejeita quando nenhum campo e enviado", async () => {
      const { validateUpdateCompanyInput } = await import("../src/services/company.service.js");
      expect(() => validateUpdateCompanyInput({})).toThrow(/nenhum campo/i);
    });

    it("rejeita cor invalida mesmo em atualizacao parcial", async () => {
      const { validateUpdateCompanyInput } = await import("../src/services/company.service.js");
      expect(() => validateUpdateCompanyInput({ primaryColor: "vermelho" })).toThrow(/cor/i);
    });

    it("rejeita entrada que nao e um objeto", async () => {
      const { validateUpdateCompanyInput } = await import("../src/services/company.service.js");
      expect(() => validateUpdateCompanyInput("nao e objeto")).toThrow(/dados da empresa/i);
      expect(() => validateUpdateCompanyInput(null)).toThrow(/dados da empresa/i);
    });

    it("rejeita nome vazio em atualizacao parcial", async () => {
      const { validateUpdateCompanyInput } = await import("../src/services/company.service.js");
      expect(() => validateUpdateCompanyInput({ name: "   " })).toThrow(/nome/i);
    });

    it("aceita persona valida em atualizacao parcial", async () => {
      const { validateUpdateCompanyInput } = await import("../src/services/company.service.js");
      expect(validateUpdateCompanyInput({ persona: "  Nova persona  " })).toEqual({ persona: "Nova persona" });
    });

    it("rejeita persona vazia em atualizacao parcial", async () => {
      const { validateUpdateCompanyInput } = await import("../src/services/company.service.js");
      expect(() => validateUpdateCompanyInput({ persona: "   " })).toThrow(/persona/i);
    });

    it("aceita cor valida em atualizacao parcial", async () => {
      const { validateUpdateCompanyInput } = await import("../src/services/company.service.js");
      expect(validateUpdateCompanyInput({ primaryColor: "#abcdef" })).toEqual({ primaryColor: "#abcdef" });
    });

    it("aceita logoUrl valido em atualizacao parcial", async () => {
      const { validateUpdateCompanyInput } = await import("../src/services/company.service.js");
      expect(validateUpdateCompanyInput({ logoUrl: "  /logos/x.svg  " })).toEqual({ logoUrl: "/logos/x.svg" });
    });

    it("rejeita logoUrl que nao e texto em atualizacao parcial", async () => {
      const { validateUpdateCompanyInput } = await import("../src/services/company.service.js");
      expect(() => validateUpdateCompanyInput({ logoUrl: 123 })).toThrow(/logourl/i);
    });

    it("aceita slug valido em atualizacao parcial", async () => {
      const { validateUpdateCompanyInput } = await import("../src/services/company.service.js");
      expect(validateUpdateCompanyInput({ slug: "novo-slug" })).toEqual({ slug: "novo-slug" });
    });

    it("rejeita slug fora do padrao em atualizacao parcial", async () => {
      const { validateUpdateCompanyInput } = await import("../src/services/company.service.js");
      expect(() => validateUpdateCompanyInput({ slug: "Slug Invalido" })).toThrow(/slug/i);
    });
  });

  describe("createCompany", () => {
    it("cria a empresa via Prisma, gera uma chave e devolve o par company+apiKey", async () => {
      companyCreateMock.mockResolvedValue({
        id: "1",
        slug: "nova",
        name: "Nova",
        persona: "p",
        primaryColor: "#112233",
        logoUrl: null,
      });
      const { createCompany } = await import("../src/services/company.service.js");

      const result = await createCompany({ slug: "nova", name: "Nova", persona: "p", primaryColor: "#112233" });

      expect(companyCreateMock).toHaveBeenCalledWith({
        data: {
          slug: "nova",
          name: "Nova",
          persona: "p",
          primaryColor: "#112233",
          logoUrl: undefined,
          apiKeyHash: expect.any(String),
        },
      });
      expect(result.company).toEqual({
        id: "1",
        slug: "nova",
        name: "Nova",
        persona: "p",
        primaryColor: "#112233",
        logoUrl: undefined,
      });
      expect(result.apiKey).toMatch(/^wk_/);
    });
  });

  describe("rotateApiKey", () => {
    it("gera uma nova chave, atualiza o hash via Prisma e devolve o par company+apiKey", async () => {
      companyUpdateMock.mockResolvedValue({
        id: "1",
        slug: "nova",
        name: "Nova",
        persona: "p",
        primaryColor: "#112233",
        logoUrl: null,
      });
      const { rotateApiKey } = await import("../src/services/company.service.js");

      const result = await rotateApiKey("nova");

      expect(companyUpdateMock).toHaveBeenCalledWith({
        where: { slug: "nova" },
        data: { apiKeyHash: expect.any(String) },
      });
      expect(result.company.slug).toBe("nova");
      expect(result.apiKey).toMatch(/^wk_/);
    });
  });

  describe("updateCompany", () => {
    it("atualiza a empresa via Prisma e retorna no formato Company", async () => {
      companyUpdateMock.mockResolvedValue({
        id: "1",
        slug: "nova",
        name: "Nome Novo",
        persona: "p",
        primaryColor: "#112233",
        logoUrl: null,
      });
      const { updateCompany } = await import("../src/services/company.service.js");

      const result = await updateCompany("nova", { name: "Nome Novo" });

      expect(companyUpdateMock).toHaveBeenCalledWith({ where: { slug: "nova" }, data: { name: "Nome Novo" } });
      expect(result.name).toBe("Nome Novo");
    });

    it("converte logoUrl vazio em null para limpar o logo no banco", async () => {
      companyUpdateMock.mockResolvedValue({
        id: "1",
        slug: "nova",
        name: "Nova",
        persona: "p",
        primaryColor: "#112233",
        logoUrl: null,
      });
      const { updateCompany } = await import("../src/services/company.service.js");

      await updateCompany("nova", { logoUrl: "" });

      expect(companyUpdateMock).toHaveBeenCalledWith({ where: { slug: "nova" }, data: { logoUrl: null } });
    });

    it("mantem logoUrl preenchido quando recebe um valor", async () => {
      companyUpdateMock.mockResolvedValue({
        id: "1",
        slug: "nova",
        name: "Nova",
        persona: "p",
        primaryColor: "#112233",
        logoUrl: "/logos/nova.svg",
      });
      const { updateCompany } = await import("../src/services/company.service.js");

      await updateCompany("nova", { logoUrl: "/logos/nova.svg" });

      expect(companyUpdateMock).toHaveBeenCalledWith({
        where: { slug: "nova" },
        data: { logoUrl: "/logos/nova.svg" },
      });
    });
  });

  describe("deleteCompany", () => {
    it("exclui a empresa via Prisma", async () => {
      mockEnv.databaseUrl = "postgres://localhost/db";
      companyDeleteMock.mockResolvedValue(undefined);
      const { deleteCompany } = await import("../src/services/company.service.js");

      await deleteCompany("acme");

      expect(companyDeleteMock).toHaveBeenCalledWith({ where: { slug: "acme" } });
    });
  });
});
