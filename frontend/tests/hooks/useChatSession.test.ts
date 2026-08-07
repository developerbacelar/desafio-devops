import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendChatMessage } from "@/lib/api";
import { useChatSession } from "@/hooks/useChatSession";

vi.mock("@/lib/api", () => ({
  sendChatMessage: vi.fn(),
}));

const TEST_API_KEY = "wk_test_key";

describe("useChatSession", () => {
  beforeEach(() => {
    vi.mocked(sendChatMessage).mockReset();
  });

  it("comeca em estado idle sem mensagens", () => {
    const { result } = renderHook(() => useChatSession("technova", TEST_API_KEY));
    expect(result.current.messages).toEqual([]);
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("adiciona a mensagem do usuario e depois a resposta do assistente", async () => {
    vi.mocked(sendChatMessage).mockResolvedValue({
      company: "technova",
      question: "Qual o prazo?",
      answer: "5 dias uteis.",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const { result } = renderHook(() => useChatSession("technova", TEST_API_KEY));

    await act(async () => {
      await result.current.sendMessage("Qual o prazo?");
    });

    expect(result.current.messages).toEqual([
      expect.objectContaining({ role: "user", content: "Qual o prazo?" }),
      expect.objectContaining({ role: "assistant", content: "5 dias uteis." }),
    ]);
    expect(result.current.status).toBe("idle");
  });

  it("a segunda chamada de sendMessage envia o historico da primeira troca completa", async () => {
    vi.mocked(sendChatMessage)
      .mockResolvedValueOnce({
        company: "technova",
        question: "Qual o prazo?",
        answer: "5 dias uteis.",
        createdAt: "2026-01-01T00:00:00.000Z",
      })
      .mockResolvedValueOnce({
        company: "technova",
        question: "E frete gratis?",
        answer: "Sim, acima de R$ 200.",
        createdAt: "2026-01-01T00:00:01.000Z",
      });
    const { result } = renderHook(() => useChatSession("technova", TEST_API_KEY));

    await act(async () => {
      await result.current.sendMessage("Qual o prazo?");
    });
    await act(async () => {
      await result.current.sendMessage("E frete gratis?");
    });

    expect(sendChatMessage).toHaveBeenNthCalledWith(
      1,
      {
        companySlug: "technova",
        question: "Qual o prazo?",
        history: [],
      },
      TEST_API_KEY,
    );
    expect(sendChatMessage).toHaveBeenNthCalledWith(
      2,
      {
        companySlug: "technova",
        question: "E frete gratis?",
        history: [
          { role: "user", content: "Qual o prazo?" },
          { role: "assistant", content: "5 dias uteis." },
        ],
      },
      TEST_API_KEY,
    );
  });

  it("em caso de erro mantem a mensagem do usuario e entra em status error", async () => {
    vi.mocked(sendChatMessage).mockRejectedValue(new Error("Falha ao enviar a mensagem."));
    const { result } = renderHook(() => useChatSession("technova", TEST_API_KEY));

    await act(async () => {
      await result.current.sendMessage("Qual o prazo?");
    });

    expect(result.current.messages).toEqual([expect.objectContaining({ role: "user", content: "Qual o prazo?" })]);
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Falha ao enviar a mensagem.");
  });

  it("retry() reenvia a pergunta que falhou sem duplicar a bolha do usuario", async () => {
    vi.mocked(sendChatMessage)
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({
        company: "technova",
        question: "Qual o prazo?",
        answer: "5 dias uteis.",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
    const { result } = renderHook(() => useChatSession("technova", TEST_API_KEY));

    await act(async () => {
      await result.current.sendMessage("Qual o prazo?");
    });
    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.messages).toEqual([
      expect.objectContaining({ role: "user", content: "Qual o prazo?" }),
      expect.objectContaining({ role: "assistant", content: "5 dias uteis." }),
    ]);
    expect(result.current.status).toBe("idle");
    expect(sendChatMessage).toHaveBeenCalledTimes(2);
    expect(sendChatMessage).toHaveBeenNthCalledWith(
      2,
      {
        companySlug: "technova",
        question: "Qual o prazo?",
        history: [],
      },
      TEST_API_KEY,
    );
  });

  it("reset() volta ao estado inicial", async () => {
    vi.mocked(sendChatMessage).mockResolvedValue({
      company: "technova",
      question: "Qual o prazo?",
      answer: "5 dias uteis.",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const { result } = renderHook(() => useChatSession("technova", TEST_API_KEY));

    await act(async () => {
      await result.current.sendMessage("Qual o prazo?");
    });
    act(() => {
      result.current.reset();
    });

    await waitFor(() => {
      expect(result.current.messages).toEqual([]);
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });
});
