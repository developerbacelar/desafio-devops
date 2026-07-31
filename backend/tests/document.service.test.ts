import { beforeEach, describe, expect, it, vi } from "vitest";

const documentFindManyMock = vi.fn();
const documentDeleteMock = vi.fn();
vi.mock("../src/lib/prisma.js", () => ({
  getPrisma: () => ({
    document: { findMany: documentFindManyMock, delete: documentDeleteMock },
  }),
}));

describe("document.service", () => {
  beforeEach(() => {
    vi.resetModules();
    documentFindManyMock.mockReset();
    documentDeleteMock.mockReset();
  });

  it("lista os documentos de uma empresa, mais recentes primeiro", async () => {
    documentFindManyMock.mockResolvedValue([
      { id: "1", filename: "a.md", status: "ready", createdAt: new Date("2026-01-02") },
    ]);
    const { listDocuments } = await import("../src/services/document.service.js");

    const result = await listDocuments("company-1");

    expect(documentFindManyMock).toHaveBeenCalledWith({
      where: { companyId: "company-1" },
      orderBy: { createdAt: "desc" },
      select: { id: true, filename: true, status: true, createdAt: true },
    });
    expect(result).toHaveLength(1);
  });

  it("remove um documento pelo id", async () => {
    documentDeleteMock.mockResolvedValue({});
    const { deleteDocument } = await import("../src/services/document.service.js");

    await deleteDocument("doc-1");

    expect(documentDeleteMock).toHaveBeenCalledWith({ where: { id: "doc-1" } });
  });
});
