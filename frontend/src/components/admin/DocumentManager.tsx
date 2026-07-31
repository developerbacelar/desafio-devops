"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Trash2, Upload } from "lucide-react";
import { deleteDocument, fetchDocuments, uploadDocument, type AdminDocument } from "@/lib/adminApi";
import { Badge } from "@/components/admin/ui/Badge";
import { Button } from "@/components/admin/ui/Button";

interface DocumentManagerProps {
  companySlug: string;
}

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  processing: "info",
  ready: "success",
  error: "danger",
};

export function DocumentManager({ companySlug }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<AdminDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function loadDocuments() {
    fetchDocuments(companySlug)
      .then(setDocuments)
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar os documentos."));
  }

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companySlug]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      await uploadDocument(companySlug, file);
      loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar o documento.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remover este documento?")) return;
    try {
      await deleteDocument(id);
      loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover o documento.");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Documentos</h2>
      <label className="flex w-fit flex-col gap-1 text-sm">
        <span className="flex items-center gap-1">
          <Upload className="h-4 w-4" />
          Enviar documento
        </span>
        <input type="file" accept=".pdf,.md,.txt" onChange={handleFileChange} disabled={uploading} />
      </label>
      {uploading ? <p className="text-sm text-slate-500">Enviando...</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {documents ? (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-2">Arquivo</th>
              <th className="py-2">Status</th>
              <th className="py-2">Enviado em</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b border-slate-100">
                <td className="py-2">{doc.filename}</td>
                <td className="py-2">
                  <Badge tone={STATUS_TONE[doc.status] ?? "neutral"}>{doc.status}</Badge>
                </td>
                <td className="py-2">{new Date(doc.createdAt).toLocaleDateString("pt-BR")}</td>
                <td className="py-2 text-right">
                  <Button variant="secondary" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
