import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageBubble } from "@/components/chat/MessageBubble";

describe("MessageBubble", () => {
  it("quebra palavras/links longos em vez de estourar a largura da bolha", () => {
    const message = {
      id: "1",
      role: "assistant" as const,
      content: "https://chat.whatsapp.com/BUjcbDNaDtk3kKGLmXAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    render(<MessageBubble message={message} accentColor="#2563eb" />);

    const bubble = screen.getByText(message.content);
    // min-w-0 e essencial aqui: sem ele, o item flex nao encolhe abaixo da
    // largura intrinseca do conteudo (a URL inteira), e break-words sozinho
    // nao tem efeito nenhum - bug classico de flexbox com texto longo.
    expect(bubble.className).toMatch(/min-w-0/);
    expect(bubble.className).toMatch(/break-words/);
  });
});
