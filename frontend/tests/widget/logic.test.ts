import { describe, expect, it } from "vitest";
import { computeIframeCss, isTrustedMessage, parseConfig } from "@/widget/logic";

function makeScript(attrs: { src?: string; dataCompany?: string }): HTMLScriptElement {
  const el = document.createElement("script");
  if (attrs.src) el.src = attrs.src;
  if (attrs.dataCompany) el.setAttribute("data-company", attrs.dataCompany);
  return el;
}

describe("parseConfig", () => {
  it("le data-company e deriva a origem/URL do embed a partir do src do script", () => {
    const script = makeScript({ src: "https://chat.example.com/widget.js", dataCompany: "technova" });
    expect(parseConfig(script)).toEqual({
      companySlug: "technova",
      embedOrigin: "https://chat.example.com",
      embedUrl: "https://chat.example.com/embed/technova",
    });
  });

  it("retorna null quando data-company esta ausente", () => {
    const script = makeScript({ src: "https://chat.example.com/widget.js" });
    expect(parseConfig(script)).toBeNull();
  });
});

describe("isTrustedMessage", () => {
  const validMessage = { source: "chatbot-widget", type: "resize", state: "open", width: 360, height: 520 };

  it("retorna true quando origem e formato batem", () => {
    const event = new MessageEvent("message", { origin: "https://chat.example.com", data: validMessage });
    expect(isTrustedMessage(event, "https://chat.example.com")).toBe(true);
  });

  it("retorna false quando a origem nao bate", () => {
    const event = new MessageEvent("message", { origin: "https://outro-site.com", data: validMessage });
    expect(isTrustedMessage(event, "https://chat.example.com")).toBe(false);
  });

  it("retorna false quando o source da mensagem nao e chatbot-widget", () => {
    const event = new MessageEvent("message", {
      origin: "https://chat.example.com",
      data: { ...validMessage, source: "outra-coisa" },
    });
    expect(isTrustedMessage(event, "https://chat.example.com")).toBe(false);
  });

  it("retorna false quando data nao e um objeto", () => {
    const event = new MessageEvent("message", { origin: "https://chat.example.com", data: "nao e objeto" });
    expect(isTrustedMessage(event, "https://chat.example.com")).toBe(false);
  });
});

// A decisao de fullscreen usa o viewport do HOST (medido por widget.js, que roda
// na pagina pai) -- nunca o innerWidth do proprio iframe, que comeca pequeno
// (fechado) e daria falso-positivo de fullscreen sempre que o chat abre.
describe("computeIframeCss", () => {
  const desktopViewport = { width: 1280, height: 800 };
  const phoneViewport = { width: 375, height: 700 };

  it("retorna um circulo pequeno no canto inferior direito quando fechado, sem top/left residual", () => {
    const css = computeIframeCss({ source: "chatbot-widget", type: "resize", state: "closed", width: 0, height: 0 }, desktopViewport);
    expect(css).toEqual({
      position: "fixed",
      top: "auto",
      left: "auto",
      right: "16px",
      bottom: "16px",
      width: "72px",
      height: "72px",
      borderRadius: "50%",
    });
  });

  it("retorna um circulo pequeno no canto mesmo com viewport estreito (fechado nunca e fullscreen)", () => {
    const css = computeIframeCss({ source: "chatbot-widget", type: "resize", state: "closed", width: 0, height: 0 }, phoneViewport);
    expect(css.width).toBe("72px");
    expect(css.borderRadius).toBe("50%");
  });

  it("retorna as dimensoes da mensagem quando aberto e o viewport do host e largo (floating)", () => {
    const css = computeIframeCss(
      { source: "chatbot-widget", type: "resize", state: "open", width: 360, height: 520 },
      desktopViewport,
    );
    expect(css).toEqual({
      position: "fixed",
      top: "auto",
      left: "auto",
      right: "16px",
      bottom: "16px",
      width: "360px",
      height: "520px",
      borderRadius: "16px",
    });
  });

  it("retorna tela cheia quando aberto e o viewport do host e estreito, mesmo o iframe estando fechado no momento da medicao", () => {
    const css = computeIframeCss(
      { source: "chatbot-widget", type: "resize", state: "open", width: 360, height: 520 },
      phoneViewport,
    );
    expect(css).toEqual({
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      width: "100%",
      height: "100%",
      borderRadius: "0",
    });
  });
});
