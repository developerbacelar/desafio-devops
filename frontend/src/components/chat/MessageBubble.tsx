import type { ChatMessage } from "@/lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
  accentColor: string;
}

export function MessageBubble({ message, accentColor }: MessageBubbleProps) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
          isUser ? "bg-slate-800 text-white" : "border-l-4 bg-slate-100 text-slate-900"
        }`}
        style={isUser ? undefined : { borderLeftColor: accentColor }}
      >
        {message.content}
      </div>
    </div>
  );
}
