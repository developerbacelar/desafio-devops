"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CompanyForm, type CompanyFormValues } from "@/components/admin/CompanyForm";
import { ApiKeyReveal } from "@/components/admin/ApiKeyReveal";
import { createCompany } from "@/lib/adminApi";

const EMPTY_VALUES: CompanyFormValues = { slug: "", name: "", persona: "", primaryColor: "", logoUrl: "" };

export default function NewCompanyPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState<string | null>(null);

  async function handleSubmit(values: CompanyFormValues) {
    const result = await createCompany({
      slug: values.slug,
      name: values.name,
      persona: values.persona,
      primaryColor: values.primaryColor,
      logoUrl: values.logoUrl || undefined,
    });
    // So navega quando o admin confirmar que copiou a chave (ApiKeyReveal.onDismiss):
    // ela nao aparece de novo depois disso.
    setApiKey(result.apiKey);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Nova empresa</h1>
      {apiKey ? (
        <ApiKeyReveal apiKey={apiKey} onDismiss={() => router.push("/admin")} />
      ) : (
        <CompanyForm mode="create" initialValues={EMPTY_VALUES} submitLabel="Criar empresa" onSubmit={handleSubmit} />
      )}
    </div>
  );
}
