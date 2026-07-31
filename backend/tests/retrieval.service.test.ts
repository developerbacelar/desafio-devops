import { beforeEach, describe, expect, it, vi } from "vitest";

const embedMock = vi.fn();
vi.mock("../src/services/embedding.service.js", () => ({ embed: embedMock }));

const queryRawMock = vi.fn();
vi.mock("../src/lib/prisma.js", () => ({
  getPrisma: () => ({ $queryRaw: queryRawMock }),
}));

describe("retrieval.service", () => {
  beforeEach(() => {
    vi.resetModules();
    embedMock.mockReset();
    queryRawMock.mockReset();
  });

  it("embeda a pergunta como RETRIEVAL_QUERY", async () => {
    embedMock.mockResolvedValue([[0.5, 0.6]]);
    queryRawMock.mockResolvedValue([]);

    const { retrieveContext } = await import("../src/services/retrieval.service.js");
    await retrieveContext("company-1", "Voces entregam em Curitiba?");

    expect(embedMock).toHaveBeenCalledWith(["Voces entregam em Curitiba?"], true);
  });

  it("filtra sempre pela empresa no WHERE da query (isolamento multiempresa)", async () => {
    embedMock.mockResolvedValue([[0.5, 0.6]]);
    queryRawMock.mockResolvedValue([{ content: "trecho", score: 0.9 }]);

    const { retrieveContext } = await import("../src/services/retrieval.service.js");
    await retrieveContext("company-1", "pergunta");

    const [strings, ...values] = queryRawMock.mock.calls[0];
    const sql = strings.join("?");
    expect(sql).toMatch(/WHERE\s+"companyId"\s*=/);
    expect(values).toContain("company-1");
  });

  it("descarta trechos com score abaixo de 0.5", async () => {
    embedMock.mockResolvedValue([[0.1, 0.2]]);
    queryRawMock.mockResolvedValue([
      { content: "relevante", score: 0.8 },
      { content: "pouco relevante", score: 0.3 },
    ]);

    const { retrieveContext } = await import("../src/services/retrieval.service.js");
    const result = await retrieveContext("company-1", "pergunta");

    expect(result).toEqual([{ content: "relevante", score: 0.8 }]);
  });

  it("respeita o topK informado no LIMIT da query", async () => {
    embedMock.mockResolvedValue([[0.1, 0.2]]);
    queryRawMock.mockResolvedValue([]);

    const { retrieveContext } = await import("../src/services/retrieval.service.js");
    await retrieveContext("company-1", "pergunta", 3);

    const values = queryRawMock.mock.calls[0].slice(1);
    expect(values).toContain(3);
  });

  it("retorna lista vazia quando nao ha trechos", async () => {
    embedMock.mockResolvedValue([[0.1, 0.2]]);
    queryRawMock.mockResolvedValue([]);

    const { retrieveContext } = await import("../src/services/retrieval.service.js");
    expect(await retrieveContext("company-1", "pergunta")).toEqual([]);
  });
});
