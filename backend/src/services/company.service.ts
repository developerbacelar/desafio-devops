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
  /** Quantidade de documentos da empresa. So populado por listCompanies(). */
  documentCount?: number;
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
    documentCount: 0,
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
    documentCount: 0,
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
    documentCount: 0,
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
  _count?: { documents: number };
}

function toCompany(record: CompanyRecord): Company {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    persona: record.persona,
    primaryColor: record.primaryColor,
    logoUrl: record.logoUrl ?? undefined,
    documentCount: record._count?.documents,
  };
}

export async function listCompanies(): Promise<Company[]> {
  if (!env.databaseUrl) {
    return FALLBACK_COMPANIES;
  }
  const companies = await getPrisma().company.findMany({
    include: { _count: { select: { documents: true } } },
  });
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

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

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

/** Valida e normaliza os dados de criacao de uma empresa nova. */
export function validateCreateCompanyInput(input: unknown): CreateCompanyInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("Dados da empresa invalidos.");
  }
  const { slug, name, persona, primaryColor, logoUrl } = input as Record<string, unknown>;

  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
    throw new Error("Slug invalido. Use letras minusculas, numeros e hifens (ex: minha-empresa).");
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Nome e obrigatorio.");
  }
  if (typeof persona !== "string" || persona.trim().length === 0) {
    throw new Error("Persona e obrigatoria.");
  }
  if (typeof primaryColor !== "string" || !COLOR_PATTERN.test(primaryColor)) {
    throw new Error("Cor primaria invalida. Use o formato #rrggbb.");
  }
  if (logoUrl !== undefined && typeof logoUrl !== "string") {
    throw new Error("logoUrl deve ser um texto.");
  }

  return {
    slug,
    name: name.trim(),
    persona: persona.trim(),
    primaryColor,
    logoUrl: logoUrl ? (logoUrl as string).trim() : undefined,
  };
}

/** Valida e normaliza os dados de atualizacao (parcial) de uma empresa existente. */
export function validateUpdateCompanyInput(input: unknown): UpdateCompanyInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("Dados da empresa invalidos.");
  }
  const { slug, name, persona, primaryColor, logoUrl } = input as Record<string, unknown>;
  const result: UpdateCompanyInput = {};

  if (slug !== undefined) {
    if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
      throw new Error("Slug invalido. Use letras minusculas, numeros e hifens (ex: minha-empresa).");
    }
    result.slug = slug;
  }
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Nome e obrigatorio.");
    }
    result.name = name.trim();
  }
  if (persona !== undefined) {
    if (typeof persona !== "string" || persona.trim().length === 0) {
      throw new Error("Persona e obrigatoria.");
    }
    result.persona = persona.trim();
  }
  if (primaryColor !== undefined) {
    if (typeof primaryColor !== "string" || !COLOR_PATTERN.test(primaryColor)) {
      throw new Error("Cor primaria invalida. Use o formato #rrggbb.");
    }
    result.primaryColor = primaryColor;
  }
  if (logoUrl !== undefined) {
    if (typeof logoUrl !== "string") {
      throw new Error("logoUrl deve ser um texto.");
    }
    result.logoUrl = logoUrl.trim();
  }

  if (Object.keys(result).length === 0) {
    throw new Error("Nenhum campo para atualizar.");
  }

  return result;
}

export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  const record = await getPrisma().company.create({
    data: {
      slug: input.slug,
      name: input.name,
      persona: input.persona,
      primaryColor: input.primaryColor,
      logoUrl: input.logoUrl,
    },
  });
  return toCompany(record);
}

export async function updateCompany(slug: string, input: UpdateCompanyInput): Promise<Company> {
  const { logoUrl, ...rest } = input;
  const data = { ...rest, ...(logoUrl !== undefined ? { logoUrl: logoUrl || null } : {}) };
  const record = await getPrisma().company.update({ where: { slug }, data });
  return toCompany(record);
}

export async function deleteCompany(slug: string): Promise<void> {
  await getPrisma().company.delete({ where: { slug } });
}
