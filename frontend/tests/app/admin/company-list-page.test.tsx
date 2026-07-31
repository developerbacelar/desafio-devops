import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCompany, fetchAdminCompanies } from "@/lib/adminApi";
import CompanyListPage from "@/app/admin/(protected)/page";

vi.mock("@/lib/adminApi", () => ({
  fetchAdminCompanies: vi.fn(),
  deleteCompany: vi.fn(),
}));

describe("CompanyListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza as empresas retornadas pela API, com link de editar por slug", async () => {
    vi.mocked(fetchAdminCompanies).mockResolvedValue([
      { id: "1", slug: "acme", name: "Acme", primaryColor: "#2563eb", persona: "p", documentCount: 3 },
      { id: "2", slug: "beta", name: "Beta", primaryColor: "#0d9488", persona: "p", documentCount: 1 },
    ]);

    render(<CompanyListPage />);

    expect(await screen.findByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    const acmeLink = screen.getByRole("link", { name: /editar acme/i });
    expect(acmeLink).toHaveAttribute("href", "/admin/companies/acme");
  });

  it("mostra os cards de resumo com o total de empresas e de documentos", async () => {
    vi.mocked(fetchAdminCompanies).mockResolvedValue([
      { id: "1", slug: "acme", name: "Acme", primaryColor: "#2563eb", persona: "p", documentCount: 3 },
      { id: "2", slug: "beta", name: "Beta", primaryColor: "#0d9488", persona: "p", documentCount: 1 },
    ]);

    render(<CompanyListPage />);

    expect(await screen.findByText("Empresas")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Documentos")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("mostra uma mensagem de erro quando a API falha", async () => {
    vi.mocked(fetchAdminCompanies).mockRejectedValue(new Error("Nao foi possivel carregar as empresas."));

    render(<CompanyListPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Nao foi possivel carregar as empresas.");
  });

  it("tem um link para criar uma nova empresa", async () => {
    vi.mocked(fetchAdminCompanies).mockResolvedValue([]);

    render(<CompanyListPage />);

    const newLink = await screen.findByRole("link", { name: /nova empresa/i });
    expect(newLink).toHaveAttribute("href", "/admin/companies/new");
  });

  it("exclui uma empresa apos confirmar o nome e remove o card", async () => {
    vi.mocked(fetchAdminCompanies).mockResolvedValue([
      { id: "1", slug: "acme", name: "Acme", primaryColor: "#2563eb", persona: "p", documentCount: 0 },
    ]);
    vi.mocked(deleteCompany).mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<CompanyListPage />);
    expect(await screen.findByText("Acme")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /excluir acme/i }));
    await user.type(screen.getByLabelText(/nome da empresa/i), "Acme");
    await user.click(screen.getByRole("button", { name: /^excluir$/i }));

    await waitFor(() => expect(deleteCompany).toHaveBeenCalledWith("acme"));
    await waitFor(() => expect(screen.queryByText("Acme")).not.toBeInTheDocument());
  });
});
