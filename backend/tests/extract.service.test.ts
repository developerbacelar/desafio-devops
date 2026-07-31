import { beforeEach, describe, expect, it, vi } from "vitest";

const pdfParseMock = vi.fn();
vi.mock("pdf-parse", () => ({ default: pdfParseMock }));

describe("extract.service", () => {
  beforeEach(() => {
    vi.resetModules();
    pdfParseMock.mockReset();
  });

  it("extrai texto de PDF via pdf-parse", async () => {
    pdfParseMock.mockResolvedValue({ text: "conteudo do pdf" });
    const { extractText } = await import("../src/services/extract.service.js");

    const result = await extractText(Buffer.from("fake-pdf-bytes"), "application/pdf");

    expect(result).toBe("conteudo do pdf");
    expect(pdfParseMock).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it("le markdown como texto puro", async () => {
    const { extractText } = await import("../src/services/extract.service.js");
    expect(await extractText(Buffer.from("# Titulo\nconteudo"), "text/markdown")).toBe("# Titulo\nconteudo");
  });

  it("le texto puro como texto puro", async () => {
    const { extractText } = await import("../src/services/extract.service.js");
    expect(await extractText(Buffer.from("so texto"), "text/plain")).toBe("so texto");
  });

  it("lanca erro para mimetype nao suportado", async () => {
    const { extractText } = await import("../src/services/extract.service.js");
    await expect(extractText(Buffer.from("x"), "image/png")).rejects.toThrow(/nao suportado/i);
  });
});
