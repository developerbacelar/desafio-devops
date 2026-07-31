import { clearToken, getToken } from "./adminAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export interface AdminCompany {
  id: string;
  slug: string;
  name: string;
  persona: string;
  primaryColor: string;
  logoUrl?: string;
  documentCount?: number;
}

export interface CreateCompanyInput {
  slug: string;
  name: string;
  persona: string;
  primaryColor: string;
  logoUrl?: string;
}

export interface UpdateCompanyInput {
  slug?: string;
  name?: string;
  persona?: string;
  primaryColor?: string;
  logoUrl?: string;
}

export interface AdminDocument {
  id: string;
  filename: string;
  status: string;
  createdAt: string;
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error ?? fallback;
}

async function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/admin/login";
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  return res;
}

export async function adminLogin(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Falha ao entrar."));
  }
  const body = await res.json();
  return body.token;
}

export async function fetchAdminCompanies(): Promise<AdminCompany[]> {
  const res = await adminFetch("/api/admin/companies");
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Nao foi possivel carregar as empresas."));
  }
  const body = await res.json();
  return body.companies;
}

export async function fetchAdminCompany(slug: string): Promise<AdminCompany> {
  const res = await adminFetch(`/api/admin/companies/${slug}`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Empresa nao encontrada."));
  }
  const body = await res.json();
  return body.company;
}

export async function createCompany(input: CreateCompanyInput): Promise<AdminCompany> {
  const res = await adminFetch("/api/admin/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Falha ao criar a empresa."));
  }
  const body = await res.json();
  return body.company;
}

export async function updateCompany(slug: string, input: UpdateCompanyInput): Promise<AdminCompany> {
  const res = await adminFetch(`/api/admin/companies/${slug}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Falha ao atualizar a empresa."));
  }
  const body = await res.json();
  return body.company;
}

export async function deleteCompany(slug: string): Promise<void> {
  const res = await adminFetch(`/api/admin/companies/${slug}`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Falha ao excluir a empresa."));
  }
}

export async function fetchDocuments(slug: string): Promise<AdminDocument[]> {
  const res = await adminFetch(`/api/admin/companies/${slug}/documents`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Nao foi possivel carregar os documentos."));
  }
  const body = await res.json();
  return body.documents;
}

export async function uploadDocument(slug: string, file: File): Promise<AdminDocument> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await adminFetch(`/api/admin/companies/${slug}/documents`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Falha ao enviar o documento."));
  }
  const body = await res.json();
  return body.document;
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await adminFetch(`/api/admin/documents/${id}`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Falha ao remover o documento."));
  }
}
