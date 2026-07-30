import type { RefObject } from "react";
import type { ChatMessage } from "@/lib/types";
import { getReadableTextColor } from "@/lib/contrastColor";
import { MessageList } from "./MessageList";
import { ErrorBanner } from "./ErrorBanner";
import { Composer } from "./Composer";

interface ChatPanelProps {
  companyName: string;
  primaryColor: string;
  logoUrl?: string;
  messages: ChatMessage[];
  status: "idle" | "sending" | "error";
  error: string | null;
  onClose: () => void;
  onSend: (text: string) => void;
  onRetry: () => void;
  composerRef: RefObject<HTMLTextAreaElement | null>;
}

export function ChatPanel({
  companyName,
  primaryColor,
  logoUrl,
  messages,
  status,
  error,
  onClose,
  onSend,
  onRetry,
  composerRef,
}: ChatPanelProps) {
  const headerTextColor = getReadableTextColor(primaryColor);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Chat com ${companyName}`}
      className="flex h-full w-full flex-col overflow-hidden bg-white shadow-xl"
    >
      <header
        style={{ backgroundColor: primaryColor, color: headerTextColor }}
        className="flex shrink-0 items-center justify-between px-4 py-3"
      >
        {logoUrl ? (
          // next/image exigiria configurar remotePatterns pra dominios de logo que
          // ainda nao se conhece (cada empresa podera hospedar o proprio SVG).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={companyName} className="h-7 max-w-[60%] object-contain" />
        ) : (
          <span className="font-medium">{companyName}</span>
        )}
        <button type="button" onClick={onClose} aria-label="Fechar chat" className="text-xl leading-none">
          &times;
        </button>
      </header>
      <MessageList messages={messages} isSending={status === "sending"} accentColor={primaryColor} />
      {status === "error" && error ? <ErrorBanner message={error} onRetry={onRetry} /> : null}
      <Composer
        ref={composerRef}
        disabled={status === "sending"}
        onSend={onSend}
        accentColor={primaryColor}
        accentTextColor={headerTextColor}
      />
    </div>
  );
}
