import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDeleteDialog } from "@/components/admin/ui/ConfirmDeleteDialog";

describe("ConfirmDeleteDialog", () => {
  it("mantem o botao Excluir desabilitado ate o nome digitado bater exatamente", async () => {
    const user = userEvent.setup();
    render(<ConfirmDeleteDialog companyName="Acme" onConfirm={vi.fn()} onClose={vi.fn()} />);

    const confirmButton = screen.getByRole("button", { name: /^excluir$/i });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText(/nome da empresa/i), "Acm");
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText(/nome da empresa/i), "e");
    expect(confirmButton).toBeEnabled();
  });

  it("chama onConfirm quando o nome bate e confirma", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ConfirmDeleteDialog companyName="Acme" onConfirm={onConfirm} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText(/nome da empresa/i), "Acme");
    await user.click(screen.getByRole("button", { name: /^excluir$/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("mostra erro inline sem fechar quando onConfirm falha", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Empresa "acme" nao encontrada.'));
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmDeleteDialog companyName="Acme" onConfirm={onConfirm} onClose={onClose} />);

    await user.type(screen.getByLabelText(/nome da empresa/i), "Acme");
    await user.click(screen.getByRole("button", { name: /^excluir$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("nao encontrada");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("botao Cancelar chama onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmDeleteDialog companyName="Acme" onConfirm={vi.fn()} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
