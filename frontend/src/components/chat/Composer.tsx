"use client";

import { forwardRef, useState, type KeyboardEvent } from "react";

interface ComposerProps {
  disabled: boolean;
  onSend: (text: string) => void;
  accentColor: string;
  accentTextColor: string;
}

export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  { disabled, onSend, accentColor, accentTextColor },
  ref,
) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex gap-2 border-t border-slate-200 p-3">
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder="Escreva sua mensagem..."
        className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        style={{ backgroundColor: accentColor, color: accentTextColor }}
        className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        Enviar
      </button>
    </div>
  );
});
