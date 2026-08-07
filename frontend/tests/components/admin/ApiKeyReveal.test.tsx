import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiKeyReveal } from "@/components/admin/ApiKeyReveal";

describe("ApiKeyReveal", () => {
  it("mostra a chave e chama onDismiss ao clicar em Continuar", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<ApiKeyReveal apiKey="wk_abc123" onDismiss={onDismiss} />);

    expect(screen.getByText("wk_abc123")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continuar/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("copia a chave pra area de transferencia e mostra confirmacao", async () => {
    const user = userEvent.setup();
    // userEvent.setup() instala o proprio mock de clipboard (pra suportar
    // user.copy()/paste()) - espiar depois do setup, nao antes, senao o
    // stub proprio some e a chamada de escrita passa batido pelo spy.
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    render(<ApiKeyReveal apiKey="wk_abc123" onDismiss={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /copiar chave/i }));

    expect(writeText).toHaveBeenCalledWith("wk_abc123");
    expect(await screen.findByRole("button", { name: /copiado/i })).toBeInTheDocument();
  });

  it("aceita um label customizado pro botao de dispensar", () => {
    render(<ApiKeyReveal apiKey="wk_abc123" onDismiss={vi.fn()} dismissLabel="Fechar" />);
    expect(screen.getByRole("button", { name: /fechar/i })).toBeInTheDocument();
  });
});
