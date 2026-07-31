import { beforeEach, describe, expect, it, vi } from "vitest";

const embedContentMock = vi.fn();
const GoogleGenAIMock = vi.fn().mockImplementation(() => ({
  models: { embedContent: embedContentMock },
}));

vi.mock("@google/genai", () => ({ GoogleGenAI: GoogleGenAIMock }));

const mockEnv = { geminiApiKey: "chave-de-teste" };
vi.mock("../src/lib/env.js", () => ({ env: mockEnv }));

describe("embedding.service", () => {
  beforeEach(() => {
    vi.resetModules();
    embedContentMock.mockReset();
    GoogleGenAIMock.mockClear();
    mockEnv.geminiApiKey = "chave-de-teste";
  });

  it("lanca erro quando a GEMINI_API_KEY nao esta configurada", async () => {
    mockEnv.geminiApiKey = "";
    const { embed } = await import("../src/services/embedding.service.js");
    await expect(embed(["texto"], false)).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it("usa taskType RETRIEVAL_DOCUMENT para ingestao (isQuery=false)", async () => {
    embedContentMock.mockResolvedValue({ embeddings: [{ values: [0.1, 0.2] }] });
    const { embed, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } = await import(
      "../src/services/embedding.service.js"
    );

    const result = await embed(["conteudo do documento"], false);

    expect(result).toEqual([[0.1, 0.2]]);
    expect(embedContentMock).toHaveBeenCalledWith({
      model: EMBEDDING_MODEL,
      contents: ["conteudo do documento"],
      config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: EMBEDDING_DIMENSIONS },
    });
  });

  it("usa taskType RETRIEVAL_QUERY para pergunta (isQuery=true)", async () => {
    embedContentMock.mockResolvedValue({ embeddings: [{ values: [0.3, 0.4] }] });
    const { embed } = await import("../src/services/embedding.service.js");

    await embed(["qual o prazo?"], true);

    expect(embedContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ taskType: "RETRIEVAL_QUERY" }),
      }),
    );
  });

  it("retorna um vetor por texto de entrada, na mesma ordem", async () => {
    embedContentMock.mockResolvedValue({
      embeddings: [{ values: [1, 2] }, { values: [3, 4] }],
    });
    const { embed } = await import("../src/services/embedding.service.js");

    expect(await embed(["a", "b"], false)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("lanca erro quando a API nao retorna embeddings", async () => {
    embedContentMock.mockResolvedValue({});
    const { embed } = await import("../src/services/embedding.service.js");
    await expect(embed(["texto"], false)).rejects.toThrow(/nao retornou/i);
  });

  it("lanca erro quando um embedding vem sem valores", async () => {
    embedContentMock.mockResolvedValue({ embeddings: [{}] });
    const { embed } = await import("../src/services/embedding.service.js");
    await expect(embed(["texto"], false)).rejects.toThrow(/vetor vazio/i);
  });
});
