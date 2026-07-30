import { beforeEach, describe, expect, it, vi } from "vitest";

const PrismaClientMock = vi.fn().mockImplementation(() => ({ marker: Symbol("prisma-instance") }));
vi.mock("@prisma/client", () => ({ PrismaClient: PrismaClientMock }));

const mockEnv = { databaseUrl: "" };
vi.mock("../src/lib/env.js", () => ({ env: mockEnv }));

describe("lib/prisma", () => {
  beforeEach(() => {
    vi.resetModules();
    PrismaClientMock.mockClear();
    mockEnv.databaseUrl = "";
  });

  it("lanca erro quando DATABASE_URL nao esta configurada", async () => {
    const { getPrisma } = await import("../src/lib/prisma.js");
    expect(() => getPrisma()).toThrow(/DATABASE_URL/);
    expect(PrismaClientMock).not.toHaveBeenCalled();
  });

  it("cria o client uma unica vez e reaproveita entre chamadas", async () => {
    mockEnv.databaseUrl = "postgres://localhost/db";
    const { getPrisma } = await import("../src/lib/prisma.js");

    const first = getPrisma();
    const second = getPrisma();

    expect(first).toBe(second);
    expect(PrismaClientMock).toHaveBeenCalledOnce();
  });
});
