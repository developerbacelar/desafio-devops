import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();
const GoogleGenAIMock = vi.fn().mockImplementation(() => ({
  models: { generateContent: generateContentMock },
}));

// Duble do SDK do Gemini: os testes de ai.service nao devem depender de
// rede nem consumir cota real da API.
vi.mock("@google/genai", () => ({ GoogleGenAI: GoogleGenAIMock }));

const mockEnv = { geminiApiKey: "chave-de-teste", geminiModel: "gemini-flash-latest" };
vi.mock("../src/lib/env.js", () => ({ env: mockEnv }));

describe("ai.service", () => {
  beforeEach(() => {
    vi.resetModules();
    generateContentMock.mockReset();
    GoogleGenAIMock.mockClear();
    mockEnv.geminiApiKey = "chave-de-teste";
    mockEnv.geminiModel = "gemini-flash-latest";
  });

  it("lanca erro quando a GEMINI_API_KEY nao esta configurada", async () => {
    mockEnv.geminiApiKey = "";
    const { ask } = await import("../src/services/ai.service.js");

    await expect(ask({ systemPrompt: "sys", question: "oi" })).rejects.toThrow(/GEMINI_API_KEY/);
    expect(GoogleGenAIMock).not.toHaveBeenCalled();
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
      contents: "oi",
      config: {
        systemInstruction: "sys",
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    });
  });

  it("lanca erro quando a IA retorna resposta vazia", async () => {
    generateContentMock.mockResolvedValue({ text: "" });
    const { ask } = await import("../src/services/ai.service.js");

    await expect(ask({ systemPrompt: "sys", question: "oi" })).rejects.toThrow(/vazia/);
  });

  it("lanca erro quando a resposta da IA nao tem campo text", async () => {
    generateContentMock.mockResolvedValue({});
    const { ask } = await import("../src/services/ai.service.js");

    await expect(ask({ systemPrompt: "sys", question: "oi" })).rejects.toThrow(/vazia/);
  });
});
