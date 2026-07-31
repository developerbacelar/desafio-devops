import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteDocument, fetchDocuments, uploadDocument } from "@/lib/adminApi";
import { DocumentManager } from "@/components/admin/DocumentManager";

vi.mock("@/lib/adminApi", () => ({
  fetchDocuments: vi.fn(),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

describe("DocumentManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("carrega e mostra os documentos da empresa ao montar", async () => {
    vi.mocked(fetchDocuments).mockResolvedValue([
      { id: "1", filename: "contexto.md", status: "ready", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);

    render(<DocumentManager companySlug="acme" />);

    expect(fetchDocuments).toHaveBeenCalledWith("acme");
    expect(await screen.findByText("contexto.md")).toBeInTheDocument();
    expect(screen.getByText("ready")).toBeInTheDocument();
  });

  it("envia um arquivo selecionado e recarrega a lista", async () => {
    vi.mocked(fetchDocuments).mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: "1", filename: "novo.md", status: "ready", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    vi.mocked(uploadDocument).mockResolvedValue({
      id: "1",
      filename: "novo.md",
      status: "ready",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const user = userEvent.setup();
    render(<DocumentManager companySlug="acme" />);
    await waitFor(() => expect(fetchDocuments).toHaveBeenCalledTimes(1));

    const file = new File(["conteudo"], "novo.md", { type: "text/markdown" });
    await user.upload(screen.getByLabelText(/enviar documento/i), file);

    await waitFor(() => expect(uploadDocument).toHaveBeenCalledWith("acme", file));
    expect(await screen.findByText("novo.md")).toBeInTheDocument();
  });

  it("mostra erro quando o upload falha", async () => {
    vi.mocked(fetchDocuments).mockResolvedValue([]);
    vi.mocked(uploadDocument).mockRejectedValue(new Error("Arquivo invalido ou maior que 10MB."));
    const user = userEvent.setup();
    render(<DocumentManager companySlug="acme" />);
    await waitFor(() => expect(fetchDocuments).toHaveBeenCalledTimes(1));

    const file = new File(["x"], "grande.md", { type: "text/markdown" });
    await user.upload(screen.getByLabelText(/enviar documento/i), file);

    expect(await screen.findByRole("alert")).toHaveTextContent("10MB");
  });

  it("remove um documento apos confirmacao e recarrega a lista", async () => {
    vi.mocked(fetchDocuments)
      .mockResolvedValueOnce([{ id: "1", filename: "a.md", status: "ready", createdAt: "2026-01-01T00:00:00.000Z" }])
      .mockResolvedValueOnce([]);
    vi.mocked(deleteDocument).mockResolvedValue(undefined);
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    const user = userEvent.setup();
    render(<DocumentManager companySlug="acme" />);

    await user.click(await screen.findByRole("button", { name: /remover/i }));

    expect(deleteDocument).toHaveBeenCalledWith("1");
    await waitFor(() => expect(screen.queryByText("a.md")).not.toBeInTheDocument());
  });

  it("nao remove quando a confirmacao e cancelada", async () => {
    vi.mocked(fetchDocuments).mockResolvedValue([
      { id: "1", filename: "a.md", status: "ready", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    const user = userEvent.setup();
    render(<DocumentManager companySlug="acme" />);

    await user.click(await screen.findByRole("button", { name: /remover/i }));

    expect(deleteDocument).not.toHaveBeenCalled();
  });
});
