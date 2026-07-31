import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useParams, useRouter } from "next/navigation";
import { deleteCompany, fetchAdminCompany, fetchDocuments, updateCompany } from "@/lib/adminApi";
import EditCompanyPage from "@/app/admin/(protected)/companies/[slug]/page";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));
vi.mock("@/lib/adminApi", () => ({
  fetchAdminCompany: vi.fn(),
  updateCompany: vi.fn(),
  deleteCompany: vi.fn(),
  fetchDocuments: vi.fn(),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

describe("EditCompanyPage", () => {
  const replace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ slug: "acme" });
    vi.mocked(fetchDocuments).mockResolvedValue([]);
    vi.mocked(useRouter).mockReturnValue({ replace, push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
  });

  it("carrega a empresa e preenche o formulario com o slug editavel", async () => {
    vi.mocked(fetchAdminCompany).mockResolvedValue({
      id: "1",
      slug: "acme",
      name: "Acme",
      persona: "Persona da Acme",
      primaryColor: "#2563eb",
    });

    render(<EditCompanyPage />);

    expect(await screen.findByDisplayValue("Acme")).toBeInTheDocument();
    expect(screen.getByLabelText(/slug/i)).toHaveValue("acme");
  });

  it("salva as alteracoes chamando updateCompany com o slug e o payload parcial", async () => {
    vi.mocked(fetchAdminCompany).mockResolvedValue({
      id: "1",
      slug: "acme",
      name: "Acme",
      persona: "Persona da Acme",
      primaryColor: "#2563eb",
    });
    vi.mocked(updateCompany).mockResolvedValue({
      id: "1",
      slug: "acme",
      name: "Acme Renomeada",
      persona: "Persona da Acme",
      primaryColor: "#2563eb",
    });
    const user = userEvent.setup();
    render(<EditCompanyPage />);

    const nameInput = await screen.findByDisplayValue("Acme");
    await user.clear(nameInput);
    await user.type(nameInput, "Acme Renomeada");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(updateCompany).toHaveBeenCalledWith("acme", {
        name: "Acme Renomeada",
        persona: "Persona da Acme",
        primaryColor: "#2563eb",
        logoUrl: "",
      }),
    );
  });

  it("envia logoUrl vazio ao limpar o campo, para o backend remover o logo salvo", async () => {
    vi.mocked(fetchAdminCompany).mockResolvedValue({
      id: "1",
      slug: "acme",
      name: "Acme",
      persona: "Persona da Acme",
      primaryColor: "#2563eb",
      logoUrl: "/logos/acme.svg",
    });
    vi.mocked(updateCompany).mockResolvedValue({
      id: "1",
      slug: "acme",
      name: "Acme",
      persona: "Persona da Acme",
      primaryColor: "#2563eb",
    });
    const user = userEvent.setup();
    render(<EditCompanyPage />);

    const logoInput = await screen.findByLabelText(/logo/i);
    expect(logoInput).toHaveValue("/logos/acme.svg");
    await user.clear(logoInput);
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(updateCompany).toHaveBeenCalledWith("acme", {
        name: "Acme",
        persona: "Persona da Acme",
        primaryColor: "#2563eb",
        logoUrl: "",
      }),
    );
  });

  it("renderiza a secao de documentos abaixo do formulario", async () => {
    vi.mocked(fetchAdminCompany).mockResolvedValue({
      id: "1",
      slug: "acme",
      name: "Acme",
      persona: "Persona da Acme",
      primaryColor: "#2563eb",
    });

    render(<EditCompanyPage />);

    expect(await screen.findByText("Documentos")).toBeInTheDocument();
    expect(fetchDocuments).toHaveBeenCalledWith("acme");
  });

  it("mostra erro quando a empresa nao e encontrada", async () => {
    vi.mocked(fetchAdminCompany).mockRejectedValue(new Error('Empresa "acme" nao encontrada.'));

    render(<EditCompanyPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("nao encontrada");
  });

  it("mostra a zona de risco com botao de excluir empresa", async () => {
    vi.mocked(fetchAdminCompany).mockResolvedValue({
      id: "1",
      slug: "acme",
      name: "Acme",
      persona: "Persona da Acme",
      primaryColor: "#2563eb",
    });

    render(<EditCompanyPage />);

    expect(await screen.findByRole("button", { name: /excluir empresa/i })).toBeInTheDocument();
  });

  it("exclui a empresa e redireciona para /admin", async () => {
    vi.mocked(fetchAdminCompany).mockResolvedValue({
      id: "1",
      slug: "acme",
      name: "Acme",
      persona: "Persona da Acme",
      primaryColor: "#2563eb",
    });
    vi.mocked(deleteCompany).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<EditCompanyPage />);

    await user.click(await screen.findByRole("button", { name: /excluir empresa/i }));
    await user.type(screen.getByLabelText(/nome da empresa/i), "Acme");
    await user.click(screen.getByRole("button", { name: /^excluir$/i }));

    await waitFor(() => expect(deleteCompany).toHaveBeenCalledWith("acme"));
    expect(replace).toHaveBeenCalledWith("/admin");
  });
});
