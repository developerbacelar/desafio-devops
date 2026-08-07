import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRouter } from "next/navigation";
import { createCompany } from "@/lib/adminApi";
import NewCompanyPage from "@/app/admin/(protected)/companies/new/page";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));
vi.mock("@/lib/adminApi", () => ({
  createCompany: vi.fn(),
}));

describe("NewCompanyPage", () => {
  const push = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push, replace: vi.fn() } as unknown as ReturnType<typeof useRouter>);
  });

  it("envia o formulario preenchido, mostra a chave gerada e so navega apos confirmar", async () => {
    vi.mocked(createCompany).mockResolvedValue({
      company: {
        id: "1",
        slug: "nova-empresa",
        name: "Nova Empresa",
        persona: "Persona da empresa",
        primaryColor: "#2563eb",
      },
      apiKey: "wk_chave_gerada",
    });
    const user = userEvent.setup();
    render(<NewCompanyPage />);

    await user.type(screen.getByLabelText(/slug/i), "nova-empresa");
    await user.type(screen.getByLabelText(/^nome$/i), "Nova Empresa");
    await user.type(screen.getByLabelText(/persona/i), "Persona da empresa");
    await user.type(screen.getByLabelText(/cor primaria/i), "#2563eb");
    await user.click(screen.getByRole("button", { name: /criar empresa/i }));

    expect(createCompany).toHaveBeenCalledWith({
      slug: "nova-empresa",
      name: "Nova Empresa",
      persona: "Persona da empresa",
      primaryColor: "#2563eb",
      logoUrl: undefined,
    });
    expect(await screen.findByText("wk_chave_gerada")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /continuar/i }));
    expect(push).toHaveBeenCalledWith("/admin");
  });
});
