import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePostMessageBridge } from "@/hooks/usePostMessageBridge";

describe("usePostMessageBridge", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("envia mensagem de resize aberto pro window.parent com targetOrigin '*'", () => {
    const postMessageSpy = vi.spyOn(window.parent, "postMessage").mockImplementation(() => {});
    const { result } = renderHook(() => usePostMessageBridge());

    result.current.notifyResize({ state: "open", width: 360, height: 520 });

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        source: "chatbot-widget",
        type: "resize",
        state: "open",
        width: 360,
        height: 520,
      },
      "*",
    );
  });

  it("envia mensagem de resize fechado com o tamanho do launcher", () => {
    const postMessageSpy = vi.spyOn(window.parent, "postMessage").mockImplementation(() => {});
    const { result } = renderHook(() => usePostMessageBridge());

    result.current.notifyResize({ state: "closed", width: 72, height: 72 });

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        source: "chatbot-widget",
        type: "resize",
        state: "closed",
        width: 72,
        height: 72,
      },
      "*",
    );
  });
});
