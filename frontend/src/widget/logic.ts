import type { WidgetResizeMessage } from "@/hooks/usePostMessageBridge";

export interface WidgetConfig {
  companySlug: string;
  apiKey: string;
  embedOrigin: string;
  embedUrl: string;
}

/** Le a config do proprio <script> (data-company, data-key) e deriva a origem/URL do embed a partir do seu src. */
export function parseConfig(scriptEl: HTMLScriptElement): WidgetConfig | null {
  const companySlug = scriptEl.getAttribute("data-company");
  const apiKey = scriptEl.getAttribute("data-key");
  if (!companySlug || !apiKey) {
    return null;
  }
  try {
    const url = new URL(scriptEl.src);
    return {
      companySlug,
      apiKey,
      embedOrigin: url.origin,
      embedUrl: `${url.origin}/embed/${companySlug}`,
    };
  } catch {
    return null;
  }
}

/** Valida que uma mensagem recebida via postMessage veio do embed conhecido e tem o formato esperado. */
export function isTrustedMessage(
  event: MessageEvent,
  expectedOrigin: string,
): event is MessageEvent<WidgetResizeMessage> {
  return (
    event.origin === expectedOrigin &&
    typeof event.data === "object" &&
    event.data !== null &&
    event.data.source === "chatbot-widget" &&
    event.data.type === "resize"
  );
}

export interface WidgetReadyMessage {
  source: "chatbot-widget";
  type: "ready";
}

/**
 * Valida a mensagem que o iframe manda pro script pai assim que carrega,
 * pedindo a chave de API (entregue via postMessage, nunca na URL do iframe,
 * pra nao vazar em Referer de recursos de terceiros que a pagina hospedeira
 * carregue).
 */
export function isReadyMessage(
  event: MessageEvent,
  expectedOrigin: string,
): event is MessageEvent<WidgetReadyMessage> {
  return (
    event.origin === expectedOrigin &&
    typeof event.data === "object" &&
    event.data !== null &&
    event.data.source === "chatbot-widget" &&
    event.data.type === "ready"
  );
}

const CLOSED_SIZE = "72px";
const OFFSET = "16px";
const FULLSCREEN_BREAKPOINT = 480;

export interface Viewport {
  width: number;
  height: number;
}

export interface IframeCss {
  position: "fixed";
  top: string;
  left: string;
  right: string;
  bottom: string;
  width: string;
  height: string;
  borderRadius: string;
}

/**
 * Traduz uma WidgetResizeMessage no CSS a aplicar no elemento <iframe> do host.
 * O viewport recebido aqui e sempre o da pagina hospedeira (medido por quem chama
 * esta funcao, widget.js, via window.innerWidth/innerHeight do proprio contexto) -
 * nunca o innerWidth do iframe, que comeca pequeno (fechado) e daria falso-positivo
 * de fullscreen sempre que o chat abre.
 *
 * top/left sao sempre explicitos (mesmo "auto") porque Object.assign so sobrescreve
 * as chaves presentes: se um estado anterior tivesse deixado top/left setados sem
 * este retorno os "limpar", o iframe ficaria preso no canto errado ao fechar.
 */
export function computeIframeCss(msg: WidgetResizeMessage, hostViewport: Viewport): IframeCss {
  if (msg.state === "closed") {
    return {
      position: "fixed",
      top: "auto",
      left: "auto",
      right: OFFSET,
      bottom: OFFSET,
      width: CLOSED_SIZE,
      height: CLOSED_SIZE,
      borderRadius: "50%",
    };
  }

  const isFullscreen = hostViewport.width <= FULLSCREEN_BREAKPOINT;
  if (isFullscreen) {
    return {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      width: "100%",
      height: "100%",
      borderRadius: "0",
    };
  }

  return {
    position: "fixed",
    top: "auto",
    left: "auto",
    right: OFFSET,
    bottom: OFFSET,
    width: `${msg.width}px`,
    height: `${msg.height}px`,
    borderRadius: "16px",
  };
}
