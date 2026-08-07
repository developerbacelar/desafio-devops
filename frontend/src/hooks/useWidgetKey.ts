"use client";

import { useEffect, useState } from "react";

interface WidgetInitMessage {
  source: "chatbot-widget";
  type: "init";
  key: string;
}

function isInitMessage(event: MessageEvent): event is MessageEvent<WidgetInitMessage> {
  return (
    typeof event.data === "object" &&
    event.data !== null &&
    event.data.source === "chatbot-widget" &&
    event.data.type === "init" &&
    typeof event.data.key === "string"
  );
}

/**
 * Recebe a chave de API do widget via handshake postMessage com o script pai
 * (manda "ready", espera "init" com a chave) — nunca pela URL do iframe, pra
 * nao vazar via Referer de recursos de terceiros que a pagina hospedeira carregue.
 * Fora de um iframe (visita direta, ex.: dev local sem o widget.js), cai pro
 * `?key=` da query string, so pra permitir teste manual.
 */
export function useWidgetKey(): string | null {
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    if (window.parent === window) {
      setKey(new URLSearchParams(window.location.search).get("key"));
      return;
    }

    function handleMessage(event: MessageEvent) {
      if (!isInitMessage(event)) return;
      setKey(event.data.key);
    }

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ source: "chatbot-widget", type: "ready" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return key;
}
