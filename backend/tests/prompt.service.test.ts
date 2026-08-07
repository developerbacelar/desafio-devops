import { describe, expect, it } from "vitest";
import {
  buildGuardrails,
  buildSystemPrompt,
  sanitizeHistory,
  sanitizeQuestion,
  type ContextChunk,
} from "../src/services/prompt.service.js";
import type { Company } from "../src/services/company.service.js";

const company: Company = {
  id: "acme",
  slug: "acme",
  name: "Acme",
  primaryColor: "#000000",
  persona: "Voce e o assistente da Acme.",
};

describe("buildSystemPrompt", () => {
  it("inclui a persona da empresa", () => {
    expect(buildSystemPrompt(company)).toContain("assistente da Acme");
  });

  it("sempre aplica os guardrails com o nome da empresa", () => {
    const prompt = buildSystemPrompt(company);
    expect(prompt).toContain(buildGuardrails(company));
    expect(prompt).toContain("Acme");
  });

  it("nao cria bloco de contexto quando nao ha chunks", () => {
    expect(buildSystemPrompt(company)).not.toContain("CONTEXTO:");
  });

  it("numera trechos de contexto passados como string simples", () => {
    const prompt = buildSystemPrompt(company, ["Entregamos em 5 dias.", "Frete gratis acima de R$ 200."]);
    expect(prompt).toContain("CONTEXTO:");
    expect(prompt).toContain("[1] Entregamos em 5 dias.");
    expect(prompt).toContain("[2] Frete gratis acima de R$ 200.");
  });

  it("formata ContextChunk sem metadado igual a uma string simples", () => {
    const chunk: ContextChunk = { content: "Trocas em ate 7 dias." };
    const prompt = buildSystemPrompt(company, [chunk]);
    expect(prompt).toContain("[1] Trocas em ate 7 dias.");
  });

  it("inclui metadado parcial quando presente", () => {
    const chunk: ContextChunk = {
      content: "Horario de atendimento das 9h as 18h.",
      title: "Politica de atendimento",
      version: "2.1",
    };
    const prompt = buildSystemPrompt(company, [chunk]);
    expect(prompt).toContain("titulo: Politica de atendimento");
    expect(prompt).toContain("versao: 2.1");
    expect(prompt).not.toContain("revisao:");
    expect(prompt).not.toContain("status:");
  });

  it("expoe documento revogado no contexto em vez de descartar (a IA decide o que fazer)", () => {
    const chunk: ContextChunk = {
      content: "Frete gratis acima de R$ 100 (regra antiga).",
      title: "Politica de frete",
      revisedAt: "2023-01-10",
      status: "revogado",
    };
    const prompt = buildSystemPrompt(company, [chunk]);
    expect(prompt).toContain("status: revogado");
    expect(prompt).toContain("revisao: 2023-01-10");
    expect(prompt).toContain("Frete gratis acima de R$ 100");
  });
});

describe("buildGuardrails", () => {
  it("nao menciona vocabulario de RH interno", () => {
    const text = buildGuardrails(company);
    expect(text).not.toMatch(/\bRH\b/);
    expect(text).not.toMatch(/Ouvidoria/i);
    expect(text).not.toMatch(/SESMT/i);
  });

  it("inclui a regra de anti prompt injection e a hierarquia de autoridade", () => {
    const text = buildGuardrails(company);
    expect(text).toMatch(/ignore as instrucoes anteriores/i);
    expect(text).toMatch(/hierarquia de autoridade/i);
  });

  it("inclui a orientacao de emergencia", () => {
    const text = buildGuardrails(company);
    expect(text).toContain("SAMU");
    expect(text).toContain("192");
  });

  it("instrui a nao repetir saudacao a cada turno da mesma conversa", () => {
    const text = buildGuardrails(company);
    expect(text).toMatch(/cumprimente.*apenas na primeira mensagem/i);
  });

  it("pede objetividade sem enrolacao mas exige responder a pergunta por completo", () => {
    const text = buildGuardrails(company);
    expect(text).toMatch(/sem enrola[cç][aã]o/i);
    expect(text).toMatch(/complet[ao]/i);
    expect(text).not.toMatch(/frases curtas/i);
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

describe("sanitizeHistory", () => {
  it("retorna lista vazia quando o historico nao e informado", () => {
    expect(sanitizeHistory(undefined)).toEqual([]);
  });

  it("mantem role e content normalizados de cada turno", () => {
    const history = sanitizeHistory([
      { role: "user", content: "  Qual o prazo?  " },
      { role: "assistant", content: "5 dias uteis." },
    ]);
    expect(history).toEqual([
      { role: "user", content: "Qual o prazo?" },
      { role: "assistant", content: "5 dias uteis." },
    ]);
  });

  it("rejeita valor que nao e uma lista", () => {
    expect(() => sanitizeHistory("nao e lista")).toThrow(/lista/);
  });

  it("rejeita historico com mais de 30 mensagens", () => {
    const history = Array.from({ length: 31 }, () => ({ role: "user", content: "oi" }));
    expect(() => sanitizeHistory(history)).toThrow(/limite/);
  });

  it("rejeita item que nao e um objeto", () => {
    expect(() => sanitizeHistory(["oi"])).toThrow(/role e content/);
  });

  it("rejeita role invalido", () => {
    expect(() => sanitizeHistory([{ role: "system", content: "oi" }])).toThrow(/role/);
  });

  it("rejeita content que nao e texto", () => {
    expect(() => sanitizeHistory([{ role: "user", content: 42 }])).toThrow(/texto/);
  });

  it("rejeita content vazio", () => {
    expect(() => sanitizeHistory([{ role: "user", content: "   " }])).toThrow(/vazio/);
  });

  it("rejeita content acima de 2000 caracteres", () => {
    expect(() => sanitizeHistory([{ role: "user", content: "a".repeat(2001) }])).toThrow(/limite/);
  });
});
