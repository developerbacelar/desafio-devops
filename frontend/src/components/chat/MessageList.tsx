"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface MessageListProps {
  messages: ChatMessage[];
  isSending: boolean;
  accentColor: string;
}

export function MessageList({ messages, isSending, accentColor }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isSending]);

  return (
    <div role="log" aria-live="polite" aria-relevant="additions" className="flex-1 space-y-2 overflow-y-auto p-3">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} accentColor={accentColor} />
      ))}
      {isSending && <TypingIndicator />}
      <div ref={endRef} />
    </div>
  );
}
