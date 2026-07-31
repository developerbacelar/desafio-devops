import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRouter } from "next/navigation";
import { isAuthenticated, clearToken } from "@/lib/adminAuth";
import ProtectedLayout from "@/app/admin/(protected)/layout";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));
vi.mock("@/lib/adminAuth", () => ({
  isAuthenticated: vi.fn(),
  clearToken: vi.fn(),
}));

describe("ProtectedLayout", () => {
  const replace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ replace, push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
  });

  it("sem token, redireciona para /admin/login e nao renderiza os filhos", async () => {
    vi.mocked(isAuthenticated).mockReturnValue(false);
    render(
      <ProtectedLayout>
        <p>Conteudo protegido</p>
      </ProtectedLayout>,
    );

    expect(replace).toHaveBeenCalledWith("/admin/login");
    expect(screen.queryByText("Conteudo protegido")).not.toBeInTheDocument();
  });

  it("com token, renderiza os filhos", async () => {
    vi.mocked(isAuthenticated).mockReturnValue(true);
    render(
      <ProtectedLayout>
        <p>Conteudo protegido</p>
      </ProtectedLayout>,
    );

    expect(await screen.findByText("Conteudo protegido")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("botao Sair limpa o token e redireciona para /admin/login", async () => {
    vi.mocked(isAuthenticated).mockReturnValue(true);
    const user = userEvent.setup();
    render(
      <ProtectedLayout>
        <p>Conteudo protegido</p>
      </ProtectedLayout>,
    );

    await user.click(await screen.findByRole("button", { name: /sair/i }));

    expect(clearToken).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/admin/login");
  });
});
