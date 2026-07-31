import { describe, expect, it } from "vitest";
import { chunkMarkdown, chunkText } from "../src/services/chunk.service.js";

describe("chunkText", () => {
  it("retorna lista vazia para texto vazio ou so espacos", () => {
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("lanca erro quando o tamanho e menor ou igual a sobreposicao", () => {
    expect(() => chunkText("qualquer texto", 100, 100)).toThrow(/tamanho deve ser maior/i);
  });

  it("retorna um unico chunk quando o texto cabe inteiro dentro do tamanho", () => {
    const text = "A".repeat(100);
    expect(chunkText(text)).toEqual([text]);
  });

  it("divide texto maior que o tamanho em blocos com sobreposicao de 200 caracteres", () => {
    const text = "0123456789".repeat(150); // 1500 caracteres
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toBe(text.slice(0, 1000));
    expect(chunks[1]).toBe(text.slice(800, 1500));
    expect(chunks[0].slice(800)).toBe(chunks[1].slice(0, 200));
  });

  it("descarta o ultimo pedaco quando ele tem 50 caracteres ou menos", () => {
    const text = "0123456789".repeat(83); // 830 caracteres
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });
});

describe("chunkMarkdown", () => {
  it("quebra por cabecalhos de nivel 1 a 3, uma secao por chunk quando cabe no tamanho", () => {
    const md =
      "# Titulo\nIntro curta.\n\n## Secao 2\nConteudo da secao 2.\n\n### Secao 3\nConteudo da secao 3.";
    expect(chunkMarkdown(md)).toEqual([
      "# Titulo\nIntro curta.",
      "## Secao 2\nConteudo da secao 2.",
      "### Secao 3\nConteudo da secao 3.",
    ]);
  });

  it("aplica chunkText dentro de uma secao que excede o tamanho maximo", () => {
    const longBody = "0123456789".repeat(150); // 1500 caracteres
    const md = `# Titulo\n${longBody}`;
    const chunks = chunkMarkdown(md);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].startsWith("# Titulo")).toBe(true);
  });

  it("ignora secoes vazias", () => {
    expect(chunkMarkdown("\n\n\n")).toEqual([]);
  });
});
