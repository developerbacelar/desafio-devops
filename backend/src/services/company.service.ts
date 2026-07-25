export interface Company {
  slug: string;
  name: string;
  persona: string;
  primaryColor: string;
}

/**
 * Empresas usadas quando o banco ainda nao esta configurado.
 * A partir do Sprint 2 a fonte oficial passa a ser a tabela Company.
 */
export const FALLBACK_COMPANIES: Company[] = [
  {
    slug: "puc-pr",
    name: "Puc PR",
    primaryColor: "#0d9488",
    persona:
      "Você é a atendente virtual da PUCPR. Seja acolhedora, " +
      "prestativa e clara. Nunca dê respostas definitivas sobre bolsas " +
      "ou validação de matérias: oriente o estudante a abrir um protocolo oficial.",
  },
  {
    slug: "technova",
    name: "TechNova Eletronicos",
    primaryColor: "#2563eb",
    persona:
      "Voce e o assistente virtual da TechNova Eletronicos, uma loja de " +
      "informatica e eletronicos. Seja cordial, objetivo e use no maximo " +
      "3 paragrafos. Trate o cliente por voce.",
  },
  {
    slug: "clinica-sorriso",
    name: "Clinica Sorriso",
    primaryColor: "#0d9488",
    persona:
      "Voce e a atendente virtual da Clinica Sorriso, uma clinica " +
      "odontologica. Seja acolhedora e clara. Nunca faca diagnosticos: " +
      "oriente o paciente a agendar uma avaliacao presencial.",
  },
];

export function listCompanies(): Company[] {
  return FALLBACK_COMPANIES;
}

export function findCompanyBySlug(slug: string): Company | null {
  const normalized = slug.trim().toLowerCase();
  return FALLBACK_COMPANIES.find((c) => c.slug === normalized) ?? null;
}
