import { beforeEach, describe, expect, it, vi } from "vitest";

const chunkMarkdownMock = vi.fn();
vi.mock("../src/services/chunk.service.js", () => ({ chunkMarkdown: chunkMarkdownMock }));

const embedMock = vi.fn();
vi.mock("../src/services/embedding.service.js", () => ({ embed: embedMock }));

const deleteManyMock = vi.fn();
const createMock = vi.fn();
const executeRawMock = vi.fn();
vi.mock("../src/lib/prisma.js", () => ({
  getPrisma: () => ({
    document: { deleteMany: deleteManyMock, create: createMock },
    $executeRaw: executeRawMock,
  }),
}));

describe("ingest.service", () => {
  beforeEach(() => {
    vi.resetModules();
    chunkMarkdownMock.mockReset();
    embedMock.mockReset();
    deleteManyMock.mockReset();
    createMock.mockReset();
    executeRawMock.mockReset();
  });

  it("nao faz nada quando o conteudo nao gera nenhum chunk", async () => {
    chunkMarkdownMock.mockReturnValue([]);
    const { ingestDocument } = await import("../src/services/ingest.service.js");

    const result = await ingestDocument("company-1", "vazio.md", "   ");

    expect(result).toBeNull();
    expect(embedMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("apaga o documento anterior da mesma empresa+arquivo antes de criar o novo (reseed idempotente)", async () => {
    chunkMarkdownMock.mockReturnValue(["trecho 1"]);
    embedMock.mockResolvedValue([[0.1, 0.2]]);
    createMock.mockResolvedValue({ id: "doc-1" });

    const { ingestDocument } = await import("../src/services/ingest.service.js");
    await ingestDocument("company-1", "contexto.md", "# Titulo\ntrecho 1");

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { companyId: "company-1", filename: "contexto.md" },
    });
    expect(deleteManyMock.mock.invocationCallOrder[0]).toBeLessThan(
      createMock.mock.invocationCallOrder[0],
    );
  });

  it("gera embeddings para os chunks, cria o Document e insere cada Chunk via SQL cru com a posicao correta", async () => {
    chunkMarkdownMock.mockReturnValue(["trecho A", "trecho B"]);
    embedMock.mockResolvedValue([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    createMock.mockResolvedValue({ id: "doc-1" });

    const { ingestDocument } = await import("../src/services/ingest.service.js");
    const result = await ingestDocument("company-1", "contexto.md", "# Titulo\ntrecho A\ntrecho B");

    expect(result).toEqual({ id: "doc-1" });
    expect(embedMock).toHaveBeenCalledWith(["trecho A", "trecho B"], false);
    expect(createMock).toHaveBeenCalledWith({
      data: { companyId: "company-1", filename: "contexto.md", mimeType: "text/markdown", status: "ready" },
    });
    expect(executeRawMock).toHaveBeenCalledTimes(2);

    const [, id0, documentId0, companyId0, content0, position0, vector0] = executeRawMock.mock.calls[0];
    expect(typeof id0).toBe("string");
    expect(documentId0).toBe("doc-1");
    expect(companyId0).toBe("company-1");
    expect(content0).toBe("trecho A");
    expect(position0).toBe(0);
    expect(vector0).toBe("[0.1,0.2]");

    const [, , , , content1, position1, vector1] = executeRawMock.mock.calls[1];
    expect(content1).toBe("trecho B");
    expect(position1).toBe(1);
    expect(vector1).toBe("[0.3,0.4]");
  });
});
