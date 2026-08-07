"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CompanyForm, type CompanyFormValues } from "@/components/admin/CompanyForm";
import { DocumentManager } from "@/components/admin/DocumentManager";
import { ApiKeyReveal } from "@/components/admin/ApiKeyReveal";
import { ConfirmDeleteDialog } from "@/components/admin/ui/ConfirmDeleteDialog";
import { Button } from "@/components/admin/ui/Button";
import { deleteCompany, fetchAdminCompany, rotateApiKey, updateCompany } from "@/lib/adminApi";

export default function EditCompanyPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug as string;
  const [initialValues, setInitialValues] = useState<CompanyFormValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    fetchAdminCompany(slug)
      .then((company) =>
        setInitialValues({
          slug: company.slug,
          name: company.name,
          persona: company.persona,
          primaryColor: company.primaryColor,
          logoUrl: company.logoUrl ?? "",
        }),
      )
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Falha ao carregar a empresa."));
  }, [slug]);

  async function handleSubmit(values: CompanyFormValues) {
    await updateCompany(slug, {
      slug: values.slug !== slug ? values.slug : undefined,
      name: values.name,
      persona: values.persona,
      primaryColor: values.primaryColor,
      logoUrl: values.logoUrl,
    });
  }

  async function handleDeleteCompany() {
    await deleteCompany(slug);
    router.replace("/admin");
  }

  async function handleRotateApiKey() {
    setRotateError(null);
    setRotating(true);
    try {
      const result = await rotateApiKey(slug);
      setNewApiKey(result.apiKey);
    } catch (err) {
      setRotateError(err instanceof Error ? err.message : "Falha ao gerar uma nova chave.");
    } finally {
      setRotating(false);
    }
  }

  if (loadError) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {loadError}
      </p>
    );
  }

  if (!initialValues) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Editar empresa</h1>
        <CompanyForm mode="edit" initialValues={initialValues} submitLabel="Salvar" onSubmit={handleSubmit} />
      </div>
      <DocumentManager companySlug={slug} />
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Chave de API do widget</h2>
        <p className="text-sm text-slate-700">
          Gerar uma nova chave invalida a chave atual imediatamente — o widget instalado no site
          desta empresa para de funcionar até o <code>data-key</code> do script ser atualizado.
        </p>
        {newApiKey ? (
          <ApiKeyReveal apiKey={newApiKey} onDismiss={() => setNewApiKey(null)} dismissLabel="Fechar" />
        ) : (
          <>
            {rotateError ? (
              <p role="alert" className="text-sm text-red-600">
                {rotateError}
              </p>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              className="w-fit"
              disabled={rotating}
              onClick={handleRotateApiKey}
            >
              {rotating ? "Gerando..." : "Gerar nova chave"}
            </Button>
          </>
        )}
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <h2 className="text-sm font-semibold text-red-900">Zona de risco</h2>
        <p className="text-sm text-red-700">
          Excluir a empresa remove permanentemente seus documentos e conversas. Essa ação não pode
          ser desfeita.
        </p>
        <Button variant="danger" className="w-fit" onClick={() => setShowDeleteDialog(true)}>
          Excluir empresa
        </Button>
      </div>
      {showDeleteDialog ? (
        <ConfirmDeleteDialog
          companyName={initialValues.name}
          onConfirm={handleDeleteCompany}
          onClose={() => setShowDeleteDialog(false)}
        />
      ) : null}
    </div>
  );
}
