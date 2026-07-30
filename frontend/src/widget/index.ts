// Bootstrap do widget: efeito colateral no DOM do site hospedeiro.
// Nao tem teste unitario proprio (glue code) - a logica pura que ele usa
// (parseConfig/isTrustedMessage/computeIframeCss) esta em ./logic.ts e e
// testada la. Verificacao manual via public/demo.html.
import { computeIframeCss, isTrustedMessage, parseConfig } from "./logic";

declare global {
  interface Window {
    __CHATBOT_WIDGET_MOUNTED__?: boolean;
  }
}

const IFRAME_ID = "chatbot-widget-iframe";

function resolveScriptElement(): HTMLScriptElement | null {
  if (document.currentScript instanceof HTMLScriptElement) {
    return document.currentScript;
  }
  const scripts = Array.from(document.querySelectorAll("script[src]")) as HTMLScriptElement[];
  return scripts.reverse().find((el) => el.src.includes("/widget.js")) ?? null;
}

function mount() {
  if (window.__CHATBOT_WIDGET_MOUNTED__ || document.getElementById(IFRAME_ID)) {
    return;
  }

  const scriptEl = resolveScriptElement();
  if (!scriptEl) {
    console.error("[chatbot-widget] nao foi possivel localizar a propria tag <script>.");
    return;
  }

  const config = parseConfig(scriptEl);
  if (!config) {
    console.error('[chatbot-widget] atributo "data-company" ausente na tag <script>.');
    return;
  }

  window.__CHATBOT_WIDGET_MOUNTED__ = true;

  const iframe = document.createElement("iframe");
  iframe.id = IFRAME_ID;
  iframe.src = config.embedUrl;
  iframe.title = "Chat";
  iframe.style.border = "none";
  iframe.style.background = "transparent";
  iframe.style.zIndex = "2147483000";
  iframe.style.boxShadow = "0 4px 24px rgba(0, 0, 0, 0.2)";
  iframe.style.transition = "width .25s ease, height .25s ease, border-radius .25s ease";

  Object.assign(iframe.style, {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    width: "72px",
    height: "72px",
    borderRadius: "50%",
  });

  window.addEventListener("message", (event) => {
    if (!isTrustedMessage(event, config.embedOrigin)) return;
    // window aqui e o da pagina hospedeira (widget.js roda no contexto pai) -
    // e por isso que a decisao de fullscreen tem que ser tomada aqui, nunca
    // dentro do iframe (que so enxerga o proprio innerWidth, ja pequeno quando
    // fechado).
    const hostViewport = { width: window.innerWidth, height: window.innerHeight };
    Object.assign(iframe.style, computeIframeCss(event.data, hostViewport));
  });

  const append = () => document.body.appendChild(iframe);
  if (document.body) {
    append();
  } else {
    document.addEventListener("DOMContentLoaded", append);
  }
}

mount();
