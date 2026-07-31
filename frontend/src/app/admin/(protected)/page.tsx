"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteCompany, fetchAdminCompanies, type AdminCompany } from "@/lib/adminApi";
import { getReadableTextColor } from "@/lib/contrastColor";
import { StatCard } from "@/components/admin/ui/StatCard";
import { Button, buttonClassName } from "@/components/admin/ui/Button";
import { ConfirmDeleteDialog } from "@/components/admin/ui/ConfirmDeleteDialog";

export default function CompanyListPage() {
  const [companies, setCompanies] = useState<AdminCompany[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<AdminCompany | null>(null);

  useEffect(() => {
    fetchAdminCompanies()
      .then(setCompanies)
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar as empresas."));
  }, []);

  async function handleDelete(slug: string) {
    await deleteCompany(slug);
    setCompanies((current) => current?.filter((company) => company.slug !== slug) ?? current);
    setCompanyToDelete(null);
  }

  const totalDocuments = companies?.reduce((sum, company) => sum + (company.documentCount ?? 0), 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Empresas</h1>
        <Link href="/admin/companies/new" className={buttonClassName("primary")}>
          <Plus className="h-4 w-4" />
          Nova empresa
        </Link>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {companies ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard icon={Building2} label="Empresas" value={companies.length} />
            <StatCard icon={FileText} label="Documentos" value={totalDocuments} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <div key={company.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: company.primaryColor }}
                    className="h-3 w-3 shrink-0 rounded-full"
                  />
                  <span className="font-semibold text-slate-900">{company.name}</span>
                </div>
                <p className="text-sm text-slate-500">{company.slug}</p>
                <span
                  style={{ backgroundColor: company.primaryColor, color: getReadableTextColor(company.primaryColor) }}
                  className="w-fit rounded-full px-2 py-1 text-xs"
                >
                  {company.documentCount ?? 0} documento(s)
                </span>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <Link
                    href={`/admin/companies/${company.slug}`}
                    aria-label={`Editar ${company.name}`}
                    className={buttonClassName("secondary")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <Button
                    variant="danger"
                    aria-label={`Excluir ${company.name}`}
                    onClick={() => setCompanyToDelete(company)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {companyToDelete ? (
        <ConfirmDeleteDialog
          companyName={companyToDelete.name}
          onConfirm={() => handleDelete(companyToDelete.slug)}
          onClose={() => setCompanyToDelete(null)}
        />
      ) : null}
    </div>
  );
}
