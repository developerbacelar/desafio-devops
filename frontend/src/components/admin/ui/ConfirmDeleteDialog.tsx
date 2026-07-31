"use client";

import { useState } from "react";
import { Button } from "./Button";

interface ConfirmDeleteDialogProps {
  companyName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ConfirmDeleteDialog({ companyName, onConfirm, onClose }: ConfirmDeleteDialogProps) {
  const [typedName, setTypedName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const canConfirm = typedName === companyName;

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir a empresa.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Excluir {companyName}?</h2>
        <p className="mt-2 text-sm text-slate-600">
          Essa acao e irreversivel. Documentos e conversas dessa empresa tambem serao apagados.
          Digite <strong>{companyName}</strong> para confirmar.
        </p>
        <label className="mt-4 flex flex-col gap-1 text-sm" htmlFor="confirm-delete-name">
          Nome da empresa
          <input
            id="confirm-delete-name"
            value={typedName}
            onChange={(event) => setTypedName(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={!canConfirm || submitting}>
            {submitting ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      </div>
    </div>
  );
}
