import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCompanies } from "@/lib/api";
import { useChatSession } from "@/hooks/useChatSession";
import { usePostMessageBridge } from "@/hooks/usePostMessageBridge";
import { ChatWidget } from "@/components/chat/ChatWidget";

vi.mock("@/lib/api", () => ({
  fetchCompanies: vi.fn(),
}));
vi.mock("@/hooks/useChatSession", () => ({
  useChatSession: vi.fn(),
}));
vi.mock("@/hooks/usePostMessageBridge", () => ({
  usePostMessageBridge: vi.fn(),
}));

const company = { slug: "technova", name: "TechNova Eletronicos", primaryColor: "#2563eb" };

function mockSession(overrides: Partial<ReturnType<typeof useChatSession>> = {}) {
  vi.mocked(useChatSession).mockReturnValue({
    messages: [],
    status: "idle",
    error: null,
    sendMessage: vi.fn(),
    retry: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  vi.mocked(fetchCompanies).mockResolvedValue([company]);
  vi.mocked(usePostMessageBridge).mockReturnValue({ notifyResize: vi.fn() });
  mockSession();
});

describe("ChatWidget", () => {
  it("avisa o notifyResize com o tamanho do launcher (fechado) e do painel menor (aberto), sem decidir fullscreen aqui", async () => {
    const notifyResize = vi.fn();
    vi.mocked(usePostMessageBridge).mockReturnValue({ notifyResize });
    const user = userEvent.setup();
    render(<ChatWidget companySlug="technova" />);

    const launcher = await screen.findByRole("button", { name: /abrir chat/i });
    expect(notifyResize).toHaveBeenCalledWith({ state: "closed", width: 72, height: 72 });

    await user.click(launcher);

    expect(notifyResize).toHaveBeenCalledWith({ state: "open", width: 360, height: 520 });
    expect(notifyResize).not.toHaveBeenCalledWith(expect.objectContaining({ layout: expect.anything() }));
  });

  it("sem logoUrl, mostra o nome da empresa como texto no cabecalho", async () => {
    const user = userEvent.setup();
    render(<ChatWidget companySlug="technova" />);
    await user.click(await screen.findByRole("button", { name: /abrir chat/i }));

    expect(screen.getByText("TechNova Eletronicos")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("com logoUrl, mostra a logo (svg) no lugar do nome no cabecalho e no launcher", async () => {
    vi.mocked(fetchCompanies).mockResolvedValue([{ ...company, logoUrl: "/logos/technova.svg" }]);
    const user = userEvent.setup();
    render(<ChatWidget companySlug="technova" />);

    const launcherLogo = await screen.findByRole("img", { name: /technova eletronicos/i });
    expect(launcherLogo).toHaveAttribute("src", "/logos/technova.svg");

    await user.click(screen.getByRole("button", { name: /abrir chat/i }));

    expect(screen.queryByText("TechNova Eletronicos")).not.toBeInTheDocument();
    const headerLogo = screen.getByRole("img", { name: /technova eletronicos/i });
    expect(headerLogo).toHaveAttribute("src", "/logos/technova.svg");
  });

  it("comeca fechado mostrando o launcher e abre o painel ao clicar", async () => {
    const user = userEvent.setup();
    render(<ChatWidget companySlug="technova" />);

    const launcher = await screen.findByRole("button", { name: /abrir chat/i });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(launcher);

    expect(await screen.findByRole("dialog", { name: /technova/i })).toBeInTheDocument();
  });

  it("nao renderiza nada quando a empresa nao e encontrada", async () => {
    vi.mocked(fetchCompanies).mockResolvedValue([]);
    const { container } = render(<ChatWidget companySlug="empresa-fantasma" />);

    await waitFor(() => expect(fetchCompanies).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("desabilita o composer e mostra o indicador de digitando durante o envio", async () => {
    mockSession({
      status: "sending",
      messages: [{ id: "1", role: "user", content: "Qual o prazo?", createdAt: "2026-01-01T00:00:00.000Z" }],
    });
    const user = userEvent.setup();
    render(<ChatWidget companySlug="technova" />);
    await user.click(await screen.findByRole("button", { name: /abrir chat/i }));

    expect(screen.getByRole("status", { name: /digitando/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: /enviar/i })).toBeDisabled();
  });

  it("chama sendMessage com o texto digitado e limpa o campo", async () => {
    const sendMessage = vi.fn();
    mockSession({ sendMessage });
    const user = userEvent.setup();
    render(<ChatWidget companySlug="technova" />);
    await user.click(await screen.findByRole("button", { name: /abrir chat/i }));

    const textbox = screen.getByRole("textbox");
    await user.type(textbox, "Voces entregam em Curitiba?");
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    expect(sendMessage).toHaveBeenCalledWith("Voces entregam em Curitiba?");
    expect(textbox).toHaveValue("");
  });

  it("mostra o banner de erro com Tentar novamente, que chama retry()", async () => {
    const retry = vi.fn();
    mockSession({ status: "error", error: "Falha ao enviar a mensagem.", retry });
    const user = userEvent.setup();
    render(<ChatWidget companySlug="technova" />);
    await user.click(await screen.findByRole("button", { name: /abrir chat/i }));

    expect(screen.getByText("Falha ao enviar a mensagem.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("Escape fecha o painel, chama reset() e devolve o foco pro launcher", async () => {
    const reset = vi.fn();
    mockSession({ reset });
    const user = userEvent.setup();
    render(<ChatWidget companySlug="technova" />);
    const launcher = await screen.findByRole("button", { name: /abrir chat/i });
    await user.click(launcher);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(reset).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.getByRole("button", { name: /abrir chat/i })).toHaveFocus());
  });

  it("tem role=log com aria-live na lista de mensagens", async () => {
    mockSession({
      messages: [{ id: "1", role: "assistant", content: "Ola! Como posso ajudar?", createdAt: "2026-01-01T00:00:00.000Z" }],
    });
    const user = userEvent.setup();
    render(<ChatWidget companySlug="technova" />);
    await user.click(await screen.findByRole("button", { name: /abrir chat/i }));

    const log = screen.getByRole("log");
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Ola! Como posso ajudar?")).toBeInTheDocument();
  });

  it("mantem o foco dentro do painel: Tab no ultimo elemento focavel volta pro primeiro", async () => {
    const user = userEvent.setup();
    render(<ChatWidget companySlug="technova" />);
    await user.click(await screen.findByRole("button", { name: /abrir chat/i }));

    const closeButton = screen.getByRole("button", { name: /fechar chat/i });
    const sendButton = screen.getByRole("button", { name: /enviar/i });
    sendButton.focus();
    expect(sendButton).toHaveFocus();

    await user.tab();

    expect(closeButton).toHaveFocus();
  });
});
