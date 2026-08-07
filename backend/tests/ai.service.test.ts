import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();
const GoogleGenAIMock = vi.fn().mockImplementation(() => ({
  models: { generateContent: generateContentMock },
}));

const groqCreateMock = vi.fn();
const GroqMock = vi.fn().mockImplementation(() => ({
  chat: { completions: { create: groqCreateMock } },
}));

// Dubles dos SDKs de IA: os testes de ai.service nao devem depender de
// rede nem consumir cota real de nenhuma API.
vi.mock("@google/genai", () => ({ GoogleGenAI: GoogleGenAIMock }));
vi.mock("groq-sdk", () => ({ default: GroqMock }));

const mockEnv = {
  geminiApiKey: "chave-de-teste",
  geminiModel: "gemini-flash-latest",
  groqApiKey: "",
  groqModel: "llama-3.3-70b-versatile",
};
vi.mock("../src/lib/env.js", () => ({ env: mockEnv }));

describe("ai.service", () => {
  beforeEach(() => {
    vi.resetModules();
    generateContentMock.mockReset();
    groqCreateMock.mockReset();
    GoogleGenAIMock.mockClear();
    GroqMock.mockClear();
    mockEnv.geminiApiKey = "chave-de-teste";
    mockEnv.geminiModel = "gemini-flash-latest";
    mockEnv.groqApiKey = "";
    mockEnv.groqModel = "llama-3.3-70b-versatile";
  });

  it("lanca erro quando a GEMINI_API_KEY nao esta configurada e o Groq nao esta configurado", async () => {
    mockEnv.geminiApiKey = "";
    const { ask } = await import("../src/services/ai.service.js");

    await expect(ask({ systemPrompt: "sys", question: "oi" })).rejects.toThrow(/GEMINI_API_KEY/);
    expect(GoogleGenAIMock).not.toHaveBeenCalled();
    expect(groqCreateMock).not.toHaveBeenCalled();
  });

  it("retorna o texto da resposta e reaproveita o client entre chamadas", async () => {
    generateContentMock.mockResolvedValue({ text: "  Ola, tudo bem?  " });
    const { ask } = await import("../src/services/ai.service.js");

    const primeira = await ask({ systemPrompt: "sys", question: "oi" });
    const segunda = await ask({ systemPrompt: "sys", question: "tudo bem?" });

    expect(primeira).toBe("Ola, tudo bem?");
    expect(segunda).toBe("Ola, tudo bem?");
    expect(GoogleGenAIMock).toHaveBeenCalledOnce();
    expect(generateContentMock).toHaveBeenCalledWith({
      model: "gemini-flash-latest",
      contents: [{ role: "user", parts: [{ text: "oi" }] }],
      config: {
        systemInstruction: "sys",
        temperature: 0.3,
        maxOutputTokens: 1536,
      },
    });
  });

  it("monta contents multi-turno a partir do historico, mapeando assistant para model", async () => {
    generateContentMock.mockResolvedValue({ text: "Resposta." });
    const { ask } = await import("../src/services/ai.service.js");

    await ask({
      systemPrompt: "sys",
      question: "e agora?",
      history: [
        { role: "user", content: "Qual o prazo?" },
        { role: "assistant", content: "5 dias uteis." },
      ],
    });

    expect(generateContentMock).toHaveBeenCalledWith({
      model: "gemini-flash-latest",
      contents: [
        { role: "user", parts: [{ text: "Qual o prazo?" }] },
        { role: "model", parts: [{ text: "5 dias uteis." }] },
        { role: "user", parts: [{ text: "e agora?" }] },
      ],
      config: {
        systemInstruction: "sys",
        temperature: 0.3,
        maxOutputTokens: 1536,
      },
    });
  });

  it("detecta truncamento no Gemini (finishReason MAX_TOKENS) e tenta novamente com mais espaco", async () => {
    generateContentMock
      .mockResolvedValueOnce({
        text: "Resposta cortada pela met",
        candidates: [{ finishReason: "MAX_TOKENS" }],
      })
      .mockResolvedValueOnce({
        text: "Resposta completa.",
        candidates: [{ finishReason: "STOP" }],
      });
    const { ask } = await import("../src/services/ai.service.js");

    const resultado = await ask({ systemPrompt: "sys", question: "oi" });

    expect(resultado).toBe("Resposta completa.");
    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(generateContentMock).toHaveBeenNthCalledWith(2, {
      model: "gemini-flash-latest",
      contents: [{ role: "user", parts: [{ text: "oi" }] }],
      config: {
        systemInstruction: expect.stringContaining("cortada antes de terminar"),
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    });
  });

  it("se a retentativa do Gemini tambem truncar, retorna o texto da retentativa sem uma 3a chamada", async () => {
    generateContentMock
      .mockResolvedValueOnce({
        text: "Primeira tentativa cortada",
        candidates: [{ finishReason: "MAX_TOKENS" }],
      })
      .mockResolvedValueOnce({
        text: "Segunda tentativa tambem cortada",
        candidates: [{ finishReason: "MAX_TOKENS" }],
      });
    const { ask } = await import("../src/services/ai.service.js");

    const resultado = await ask({ systemPrompt: "sys", question: "oi" });

    expect(resultado).toBe("Segunda tentativa tambem cortada");
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("lanca erro quando a IA retorna resposta vazia e o Groq nao esta configurado", async () => {
    generateContentMock.mockResolvedValue({ text: "" });
    const { ask } = await import("../src/services/ai.service.js");

    await expect(ask({ systemPrompt: "sys", question: "oi" })).rejects.toThrow(/vazia/);
  });

  it("lanca erro quando a resposta da IA nao tem campo text", async () => {
    generateContentMock.mockResolvedValue({});
    const { ask } = await import("../src/services/ai.service.js");

    await expect(ask({ systemPrompt: "sys", question: "oi" })).rejects.toThrow(/vazia/);
  });

  it("usa Groq como fallback quando o Gemini falha e GROQ_API_KEY esta configurada", async () => {
    mockEnv.groqApiKey = "chave-groq";
    generateContentMock.mockRejectedValue(new Error("Gemini indisponivel"));
    groqCreateMock.mockResolvedValue({ choices: [{ message: { content: "Resposta do Groq." } }] });

    const { ask } = await import("../src/services/ai.service.js");
    const resultado = await ask({ systemPrompt: "sys", question: "oi" });

    expect(resultado).toBe("Resposta do Groq.");
    expect(generateContentMock).toHaveBeenCalledOnce();
    expect(groqCreateMock).toHaveBeenCalledWith({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "oi" },
      ],
      temperature: 0.3,
      max_tokens: 1536,
    });
  });

  it("monta mensagens do Groq a partir do historico no fallback", async () => {
    mockEnv.groqApiKey = "chave-groq";
    generateContentMock.mockRejectedValue(new Error("Gemini indisponivel"));
    groqCreateMock.mockResolvedValue({ choices: [{ message: { content: "Resposta." } }] });

    const { ask } = await import("../src/services/ai.service.js");
    await ask({
      systemPrompt: "sys",
      question: "e agora?",
      history: [
        { role: "user", content: "Qual o prazo?" },
        { role: "assistant", content: "5 dias uteis." },
      ],
    });

    expect(groqCreateMock).toHaveBeenCalledWith({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "Qual o prazo?" },
        { role: "assistant", content: "5 dias uteis." },
        { role: "user", content: "e agora?" },
      ],
      temperature: 0.3,
      max_tokens: 1536,
    });
  });

  it("detecta truncamento no Groq (finish_reason length) e tenta novamente com mais espaco", async () => {
    mockEnv.groqApiKey = "chave-groq";
    generateContentMock.mockRejectedValue(new Error("Gemini indisponivel"));
    groqCreateMock
      .mockResolvedValueOnce({
        choices: [{ message: { content: "Cortada" }, finish_reason: "length" }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: "Completa." }, finish_reason: "stop" }],
      });

    const { ask } = await import("../src/services/ai.service.js");
    const resultado = await ask({ systemPrompt: "sys", question: "oi" });

    expect(resultado).toBe("Completa.");
    expect(groqCreateMock).toHaveBeenCalledTimes(2);
    expect(groqCreateMock).toHaveBeenNthCalledWith(2, {
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: expect.stringContaining("cortada antes de terminar") },
        { role: "user", content: "oi" },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });
  });

  it("se a retentativa do Groq tambem truncar, retorna o texto da retentativa sem uma 3a chamada", async () => {
    mockEnv.groqApiKey = "chave-groq";
    generateContentMock.mockRejectedValue(new Error("Gemini indisponivel"));
    groqCreateMock
      .mockResolvedValueOnce({
        choices: [{ message: { content: "Cortada 1" }, finish_reason: "length" }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: "Cortada 2" }, finish_reason: "length" }],
      });

    const { ask } = await import("../src/services/ai.service.js");
    const resultado = await ask({ systemPrompt: "sys", question: "oi" });

    expect(resultado).toBe("Cortada 2");
    expect(groqCreateMock).toHaveBeenCalledTimes(2);
  });

  it("propaga o erro do Gemini quando GROQ_API_KEY nao esta configurada", async () => {
    mockEnv.groqApiKey = "";
    generateContentMock.mockRejectedValue(new Error("Gemini indisponivel"));

    const { ask } = await import("../src/services/ai.service.js");

    await expect(ask({ systemPrompt: "sys", question: "oi" })).rejects.toThrow("Gemini indisponivel");
    expect(groqCreateMock).not.toHaveBeenCalled();
  });

  it("propaga o erro do Groq quando ambos os provedores falham", async () => {
    mockEnv.groqApiKey = "chave-groq";
    generateContentMock.mockRejectedValue(new Error("Gemini indisponivel"));
    groqCreateMock.mockRejectedValue(new Error("Groq indisponivel"));

    const { ask } = await import("../src/services/ai.service.js");

    await expect(ask({ systemPrompt: "sys", question: "oi" })).rejects.toThrow("Groq indisponivel");
  });

  it("lanca erro quando o Groq retorna resposta vazia no fallback", async () => {
    mockEnv.groqApiKey = "chave-groq";
    generateContentMock.mockRejectedValue(new Error("Gemini indisponivel"));
    groqCreateMock.mockResolvedValue({ choices: [{ message: { content: "" } }] });

    const { ask } = await import("../src/services/ai.service.js");

    await expect(ask({ systemPrompt: "sys", question: "oi" })).rejects.toThrow(/vazia/);
  });
});
