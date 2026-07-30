import { beforeEach, describe, expect, it, vi } from "vitest";

const companyFindManyMock = vi.fn();
const companyFindUniqueMock = vi.fn();
vi.mock("../src/lib/prisma.js", () => ({
  getPrisma: () => ({
    company: { findMany: companyFindManyMock, findUnique: companyFindUniqueMock },
  }),
}));

const mockEnv = { databaseUrl: "" };
vi.mock("../src/lib/env.js", () => ({ env: mockEnv }));

describe("company.service", () => {
  beforeEach(() => {
    vi.resetModules();
    companyFindManyMock.mockReset();
    companyFindUniqueMock.mockReset();
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
  });

  describe("com DATABASE_URL setada (banco via Prisma)", () => {
    beforeEach(() => {
      mockEnv.databaseUrl = "postgres://localhost/db";
    });

    it("lista empresas a partir do banco", async () => {
      companyFindManyMock.mockResolvedValue([
        {
          id: "1",
          slug: "acme",
          name: "Acme",
          persona: "Voce e o assistente da Acme.",
          primaryColor: "#000000",
          logoUrl: null,
          createdAt: new Date(),
        },
      ]);
      const { listCompanies } = await import("../src/services/company.service.js");

      const companies = await listCompanies();

      expect(companies).toEqual([
        { id: "1", slug: "acme", name: "Acme", persona: "Voce e o assistente da Acme.", primaryColor: "#000000" },
      ]);
      expect(companyFindManyMock).toHaveBeenCalledOnce();
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
  });
});
