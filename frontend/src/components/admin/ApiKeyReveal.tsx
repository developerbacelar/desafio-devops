"use client";

import { useState } from "react";
import { Button } from "@/components/admin/ui/Button";

interface ApiKeyRevealProps {
  apiKey: string;
  onDismiss: () => void;
  dismissLabel?: string;
}

/** Mostra uma chave de API em texto puro uma unica vez (criacao/rotacao) — ela nao volta a aparecer depois disso. */
export function ApiKeyReveal({ apiKey, onDismiss, dismissLabel = "Continuar" }: ApiKeyRevealProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h2 className="text-sm font-semibold text-amber-900">Chave de API gerada</h2>
      <p className="text-sm text-amber-800">
        Copie agora e adicione ao <code>data-key</code> do script embutido no site do cliente — essa
        chave não será mostrada de novo.
      </p>
      <code className="break-all rounded-lg bg-white px-3 py-2 text-sm">{apiKey}</code>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={handleCopy}>
          {copied ? "Copiado!" : "Copiar chave"}
        </Button>
        <Button type="button" onClick={onDismiss}>
          {dismissLabel}
        </Button>
      </div>
    </div>
  );
}
