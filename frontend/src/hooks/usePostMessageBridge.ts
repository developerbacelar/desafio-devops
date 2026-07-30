"use client";

import { useCallback } from "react";

export interface WidgetResizeMessage {
  source: "chatbot-widget";
  type: "resize";
  state: "open" | "closed";
  width: number;
  height: number;
}

export interface UsePostMessageBridgeResult {
  notifyResize: (params: Omit<WidgetResizeMessage, "source" | "type">) => void;
}

/**
 * Fala com o script pai (widget.js) via postMessage para pedir redimensionamento do iframe.
 * Nao decide layout (floating/fullscreen) aqui: quem decide isso e o widget.js, porque
 * so ele conhece o viewport real da pagina hospedeira (o iframe nao pode medir isso de
 * forma confiavel, ja que o proprio innerWidth do iframe muda conforme ele e redimensionado).
 */
export function usePostMessageBridge(): UsePostMessageBridgeResult {
  const notifyResize = useCallback((params: Omit<WidgetResizeMessage, "source" | "type">) => {
    const message: WidgetResizeMessage = { source: "chatbot-widget", type: "resize", ...params };
    // targetOrigin "*": o iframe nao sabe de antemao o dominio do site cliente,
    // e o payload so carrega estado de UI (nao ha dado sensivel).
    window.parent.postMessage(message, "*");
  }, []);

  return { notifyResize };
}
