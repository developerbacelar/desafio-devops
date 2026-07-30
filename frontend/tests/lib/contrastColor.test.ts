import { describe, expect, it } from "vitest";
import { getReadableTextColor } from "@/lib/contrastColor";

describe("getReadableTextColor", () => {
  it("retorna preto para fundo branco", () => {
    expect(getReadableTextColor("#ffffff")).toBe("#000000");
  });

  it("retorna branco para fundo preto", () => {
    expect(getReadableTextColor("#000000")).toBe("#ffffff");
  });

  it("retorna preto para o teal da PUC-PR/Clinica Sorriso (#0d9488)", () => {
    expect(getReadableTextColor("#0d9488")).toBe("#000000");
  });

  it("retorna branco para o azul da TechNova (#2563eb)", () => {
    expect(getReadableTextColor("#2563eb")).toBe("#ffffff");
  });

  it("aceita hex sem o simbolo #", () => {
    expect(getReadableTextColor("ffffff")).toBe("#000000");
  });

  it("aceita hex abreviado de 3 digitos", () => {
    expect(getReadableTextColor("#fff")).toBe("#000000");
    expect(getReadableTextColor("#000")).toBe("#ffffff");
  });

  it("lanca erro para hex invalido", () => {
    expect(() => getReadableTextColor("nao-e-hex")).toThrow(/hex/i);
  });
});
