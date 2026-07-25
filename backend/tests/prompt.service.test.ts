import { describe, expect, it } from "vitest";
import {
  GUARDRAILS,
  buildSystemPrompt,
  sanitizeQuestion,
} from "../src/services/prompt.service.js";
import type { Company } from "../src/services/company.service.js";

const company: Company = {
  slug: "acme",
  name: "Acme",
  primaryColor: "#000000",
  persona: "Voce e o assistente da Acme.",
};

describe("buildSystemPrompt", () => {
  it("inclui a persona da empresa", () => {
    expect(buildSystemPrompt(company)).toContain("assistente da Acme");
  });

  it("sempre aplica os guardrails", () => {
    expect(buildSystemPrompt(company)).toContain(GUARDRAILS);
  });

  it("nao cria bloco de contexto quando nao ha chunks", () => {
    expect(buildSystemPrompt(company)).not.toContain("CONTEXTO:");
  });

  it("numera os trechos recuperados da base de conhecimento", () => {
    const prompt = buildSystemPrompt(company, ["Entregamos em 5 dias.", "Frete gratis acima de R$ 200."]);
    expect(prompt).toContain("CONTEXTO:");
    expect(prompt).toContain("[1] Entregamos em 5 dias.");
    expect(prompt).toContain("[2] Frete gratis acima de R$ 200.");
  });
});

describe("sanitizeQuestion", () => {
  it("remove espacos redundantes", () => {
    expect(sanitizeQuestion("  qual   o   prazo?  ")).toBe("qual o prazo?");
  });

  it("rejeita valores que nao sao texto", () => {
    expect(() => sanitizeQuestion(42)).toThrow(/texto/);
    expect(() => sanitizeQuestion(null)).toThrow(/texto/);
  });

  it("rejeita pergunta vazia", () => {
    expect(() => sanitizeQuestion("   ")).toThrow(/vazia/);
  });

  it("rejeita pergunta acima de 2000 caracteres", () => {
    expect(() => sanitizeQuestion("a".repeat(2001))).toThrow(/limite/);
  });
});
