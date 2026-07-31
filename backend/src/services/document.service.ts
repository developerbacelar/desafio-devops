import { getPrisma } from "../lib/prisma.js";

export interface DocumentSummary {
  id: string;
  filename: string;
  status: string;
  createdAt: Date;
}

export async function listDocuments(companyId: string): Promise<DocumentSummary[]> {
  return getPrisma().document.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    select: { id: true, filename: true, status: true, createdAt: true },
  });
}

export async function deleteDocument(id: string): Promise<void> {
  await getPrisma().document.delete({ where: { id } });
}
