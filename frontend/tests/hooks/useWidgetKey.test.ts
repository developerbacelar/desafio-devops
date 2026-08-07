import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { useWidgetKey } from "@/hooks/useWidgetKey";

describe("useWidgetKey", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "parent", { value: window, configurable: true });
    window.history.replaceState(null, "", "/");
  });

  it("quando embutido em iframe, manda ready pro parent e resolve a chave recebida via init", async () => {
    const fakeParent = { postMessage: vi.fn() };
    Object.defineProperty(window, "parent", { value: fakeParent, configurable: true });

    const { result } = renderHook(() => useWidgetKey());

    expect(fakeParent.postMessage).toHaveBeenCalledWith({ source: "chatbot-widget", type: "ready" }, "*");
    expect(result.current).toBeNull();

    window.dispatchEvent(
      new MessageEvent("message", { data: { source: "chatbot-widget", type: "init", key: "wk_abc" } }),
    );

    await waitFor(() => expect(result.current).toBe("wk_abc"));
  });

  it("ignora mensagens que nao tem o formato esperado", () => {
    const fakeParent = { postMessage: vi.fn() };
    Object.defineProperty(window, "parent", { value: fakeParent, configurable: true });
    const { result } = renderHook(() => useWidgetKey());

    window.dispatchEvent(new MessageEvent("message", { data: { source: "outra-coisa" } }));

    expect(result.current).toBeNull();
  });

  it("fora de um iframe (window.parent === window), usa ?key= da query string", () => {
    window.history.replaceState(null, "", "/embed/technova?key=wk_dev_direct");

    const { result } = renderHook(() => useWidgetKey());

    expect(result.current).toBe("wk_dev_direct");
  });

  it("fora de um iframe sem ?key=, fica null", () => {
    window.history.replaceState(null, "", "/embed/technova");

    const { result } = renderHook(() => useWidgetKey());

    expect(result.current).toBeNull();
  });
});
