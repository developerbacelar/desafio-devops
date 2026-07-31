import { getPrisma } from "../lib/prisma.js";
import { embed } from "./embedding.service.js";

interface ChunkRow {
  content: string;
  score: number;
}

const MIN_SCORE = 0.5;

/**
 * Busca os trechos mais relevantes de UMA empresa para a pergunta, por
 * distancia de cosseno no pgvector. O filtro por companyId e obrigatorio —
 * sem ele, uma empresa recebe contexto de outra.
 */
export async function retrieveContext(
  companyId: string,
  question: string,
  topK = 5,
): Promise<ChunkRow[]> {
  const [queryVector] = await embed([question], true);
  const vector = `[${queryVector.join(",")}]`;

  const rows = await getPrisma().$queryRaw<ChunkRow[]>`
    SELECT content, 1 - (embedding <=> ${vector}::vector) AS score
    FROM "Chunk"
    WHERE "companyId" = ${companyId}
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${topK}
  `;

  return rows.filter((row) => row.score >= MIN_SCORE);
}
