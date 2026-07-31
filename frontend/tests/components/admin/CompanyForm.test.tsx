import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CompanyForm, type CompanyFormValues } from "@/components/admin/CompanyForm";

const EMPTY_VALUES: CompanyFormValues = { slug: "", name: "", persona: "", primaryColor: "", logoUrl: "" };

async function fillValidForm(user: ReturnType<typeof userEvent.setup>, { withSlug }: { withSlug: boolean }) {
  if (withSlug) {
    await user.type(screen.getByLabelText(/slug/i), "nova-empresa");
  }
  await user.type(screen.getByLabelText(/^nome$/i), "Nova Empresa");
  await user.type(screen.getByLabelText(/persona/i), "Voce e o assistente da Nova Empresa.");
  await user.type(screen.getByLabelText(/cor primaria/i), "#2563eb");
}

describe("CompanyForm", () => {
  it("modo create: mostra o campo slug como input editavel", () => {
    render(<CompanyForm mode="create" initialValues={EMPTY_VALUES} submitLabel="Criar empresa" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/slug/i).tagName).toBe("INPUT");
  });

  it("modo edit: mostra o slug como input editavel, com aviso sobre embeds", () => {
    render(
      <CompanyForm
        mode="edit"
        initialValues={{ ...EMPTY_VALUES, slug: "acme" }}
        submitLabel="Salvar"
        onSubmit={vi.fn()}
      />,
    );
    const slugInput = screen.getByLabelText(/slug/i);
    expect(slugInput.tagName).toBe("INPUT");
    expect(slugInput).toHaveValue("acme");
    expect(screen.getByText(/quebra widgets já publicados/i)).toBeInTheDocument();
  });

  it("modo create: nao mostra o aviso de slug (nao ha slug anterior pra quebrar)", () => {
    render(<CompanyForm mode="create" initialValues={EMPTY_VALUES} submitLabel="Criar empresa" onSubmit={vi.fn()} />);
    expect(screen.queryByText(/quebra widgets já publicados/i)).not.toBeInTheDocument();
  });

  it("bloqueia o envio com slug invalido no modo edit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <CompanyForm
        mode="edit"
        initialValues={{ ...EMPTY_VALUES, slug: "acme", name: "Acme", persona: "p", primaryColor: "#2563eb" }}
        submitLabel="Salvar"
        onSubmit={onSubmit}
      />,
    );

    await user.clear(screen.getByLabelText(/slug/i));
    await user.type(screen.getByLabelText(/slug/i), "Slug Invalido");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/slug invalido/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("bloqueia o envio com slug invalido no modo create", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CompanyForm mode="create" initialValues={EMPTY_VALUES} submitLabel="Criar empresa" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/slug/i), "Slug Invalido");
    await user.type(screen.getByLabelText(/^nome$/i), "Nome");
    await user.type(screen.getByLabelText(/persona/i), "Persona");
    await user.type(screen.getByLabelText(/cor primaria/i), "#2563eb");
    await user.click(screen.getByRole("button", { name: /criar empresa/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/slug invalido/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("bloqueia o envio com cor invalida", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CompanyForm mode="create" initialValues={EMPTY_VALUES} submitLabel="Criar empresa" onSubmit={onSubmit} />);

    await fillValidForm(user, { withSlug: false });
    await user.type(screen.getByLabelText(/slug/i), "nova-empresa");
    await user.clear(screen.getByLabelText(/cor primaria/i));
    await user.type(screen.getByLabelText(/cor primaria/i), "vermelho");
    await user.click(screen.getByRole("button", { name: /criar empresa/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/cor primaria invalida/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("com dados validos, chama onSubmit com os valores e mostra confirmacao", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CompanyForm mode="create" initialValues={EMPTY_VALUES} submitLabel="Criar empresa" onSubmit={onSubmit} />);

    await fillValidForm(user, { withSlug: true });
    await user.click(screen.getByRole("button", { name: /criar empresa/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      slug: "nova-empresa",
      name: "Nova Empresa",
      persona: "Voce e o assistente da Nova Empresa.",
      primaryColor: "#2563eb",
      logoUrl: "",
    });
    expect(await screen.findByText("Salvo com sucesso.")).toBeInTheDocument();
  });

  it("quando onSubmit rejeita, mostra a mensagem de erro do backend", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Slug ja esta em uso."));
    const user = userEvent.setup();
    render(<CompanyForm mode="create" initialValues={EMPTY_VALUES} submitLabel="Criar empresa" onSubmit={onSubmit} />);

    await fillValidForm(user, { withSlug: true });
    await user.click(screen.getByRole("button", { name: /criar empresa/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Slug ja esta em uso.");
  });
});
