import { getPrisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";

export interface Company {
  id: string;
  slug: string;
  name: string;
  persona: string;
  primaryColor: string;
  /** URL do logo (SVG) da empresa. Ausente enquanto a empresa nao tiver um cadastrado. */
  logoUrl?: string;
}

/**
 * Empresas usadas quando DATABASE_URL nao esta configurada.
 * Com DATABASE_URL setada, listCompanies/findCompanyBySlug leem do Prisma.
 */
export const FALLBACK_COMPANIES: Company[] = [
  {
    id: "puc-pr",
    slug: "puc-pr",
    name: "Puc PR",
    primaryColor: "#0d9488",
    persona:
      "Você é a atendente virtual da PUCPR. Seja acolhedora, " +
      "prestativa e clara. Nunca dê respostas definitivas sobre bolsas " +
      "ou validação de matérias: oriente o estudante a abrir um protocolo oficial.",
  },
  {
    id: "technova",
    slug: "technova",
    name: "TechNova Eletronicos",
    primaryColor: "#2563eb",
    persona:
      "Voce e o assistente virtual da TechNova Eletronicos, uma loja de " +
      "informatica e eletronicos. Seja cordial, objetivo e use no maximo " +
      "3 paragrafos. Trate o cliente por voce.",
  },
  {
    id: "clinica-sorriso",
    slug: "clinica-sorriso",
    name: "Clinica Sorriso",
    primaryColor: "#0d9488",
    persona:
      "Voce e a atendente virtual da Clinica Sorriso, uma clinica " +
      "odontologica. Seja acolhedora e clara. Nunca faca diagnosticos: " +
      "oriente o paciente a agendar uma avaliacao presencial.",
  },
];

interface CompanyRecord {
  id: string;
  slug: string;
  name: string;
  persona: string;
  primaryColor: string;
  logoUrl?: string | null;
}

function toCompany(record: CompanyRecord): Company {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    persona: record.persona,
    primaryColor: record.primaryColor,
    logoUrl: record.logoUrl ?? undefined,
  };
}

export async function listCompanies(): Promise<Company[]> {
  if (!env.databaseUrl) {
    return FALLBACK_COMPANIES;
  }
  const companies = await getPrisma().company.findMany();
  return companies.map(toCompany);
}

export async function findCompanyBySlug(slug: string): Promise<Company | null> {
  const normalized = slug.trim().toLowerCase();

  if (!env.databaseUrl) {
    return FALLBACK_COMPANIES.find((c) => c.slug === normalized) ?? null;
  }

  const company = await getPrisma().company.findUnique({ where: { slug: normalized } });
  return company ? toCompany(company) : null;
}
