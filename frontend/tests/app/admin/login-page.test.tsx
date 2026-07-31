import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/lib/adminApi";
import { setToken } from "@/lib/adminAuth";
import AdminLoginPage from "@/app/admin/login/page";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));
vi.mock("@/lib/adminApi", () => ({
  adminLogin: vi.fn(),
}));
vi.mock("@/lib/adminAuth", () => ({
  setToken: vi.fn(),
}));

describe("AdminLoginPage", () => {
  const replace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ replace, push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
  });

  it("login com sucesso salva o token e redireciona para /admin", async () => {
    vi.mocked(adminLogin).mockResolvedValue("token-abc");
    const user = userEvent.setup();
    render(<AdminLoginPage />);

    await user.type(screen.getByLabelText(/login/i), "admin@example.com");
    await user.type(screen.getByLabelText(/senha/i), "senha-correta");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(adminLogin).toHaveBeenCalledWith("admin@example.com", "senha-correta");
    expect(setToken).toHaveBeenCalledWith("token-abc");
    expect(replace).toHaveBeenCalledWith("/admin");
  });

  it("login com credenciais invalidas mostra mensagem de erro e nao redireciona", async () => {
    vi.mocked(adminLogin).mockRejectedValue(new Error("Credenciais invalidas."));
    const user = userEvent.setup();
    render(<AdminLoginPage />);

    await user.type(screen.getByLabelText(/login/i), "admin@example.com");
    await user.type(screen.getByLabelText(/senha/i), "senha-errada");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Credenciais invalidas.");
    expect(setToken).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
