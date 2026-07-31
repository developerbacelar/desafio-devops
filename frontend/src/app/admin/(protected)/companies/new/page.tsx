"use client";

import { useRouter } from "next/navigation";
import { CompanyForm, type CompanyFormValues } from "@/components/admin/CompanyForm";
import { createCompany } from "@/lib/adminApi";

const EMPTY_VALUES: CompanyFormValues = { slug: "", name: "", persona: "", primaryColor: "", logoUrl: "" };

export default function NewCompanyPage() {
  const router = useRouter();

  async function handleSubmit(values: CompanyFormValues) {
    await createCompany({
      slug: values.slug,
      name: values.name,
      persona: values.persona,
      primaryColor: values.primaryColor,
      logoUrl: values.logoUrl || undefined,
    });
    router.push("/admin");
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Nova empresa</h1>
      <CompanyForm mode="create" initialValues={EMPTY_VALUES} submitLabel="Criar empresa" onSubmit={handleSubmit} />
    </div>
  );
}
