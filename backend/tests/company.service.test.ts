import { describe, expect, it } from "vitest";
import { findCompanyBySlug, listCompanies } from "../src/services/company.service.js";

describe("company.service", () => {
  it("lista as empresas cadastradas", () => {
    expect(listCompanies().length).toBeGreaterThan(0);
  });

  it("encontra empresa pelo slug", () => {
    expect(findCompanyBySlug("technova")?.name).toBe("TechNova Eletronicos");
  });

  it("ignora caixa e espacos no slug", () => {
    expect(findCompanyBySlug("  TechNova  ")?.slug).toBe("technova");
  });

  it("retorna null para slug inexistente", () => {
    expect(findCompanyBySlug("empresa-fantasma")).toBeNull();
  });
});
