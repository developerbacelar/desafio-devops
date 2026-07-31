import { randomUUID } from "node:crypto";
import type { Document } from "@prisma/client";
import { getPrisma } from "../lib/prisma.js";
import { chunkMarkdown } from "./chunk.service.js";
import { embed } from "./embedding.service.js";

/**
 * Ingesta um texto de contexto (Markdown) de uma empresa: divide em chunks,
 * gera embeddings e persiste. Reseed e idempotente — apaga o Document (e seus
 * Chunks, via cascade) da mesma empresa+arquivo antes de inserir de novo.
 */
export async function ingestDocument(
  companyId: string,
  filename: string,
  content: string,
): Promise<Document | null> {
  const chunks = chunkMarkdown(content);
  if (chunks.length === 0) return null;

  const vectors = await embed(chunks, false);
  const prisma = getPrisma();

  await prisma.document.deleteMany({ where: { companyId, filename } });

  const document = await prisma.document.create({
    data: { companyId, filename, mimeType: "text/markdown", status: "ready" },
  });

  for (let i = 0; i < chunks.length; i++) {
    const id = randomUUID();
    const vector = `[${vectors[i].join(",")}]`;
    await prisma.$executeRaw`
      INSERT INTO "Chunk" (id, "documentId", "companyId", content, position, embedding)
      VALUES (${id}, ${document.id}, ${companyId}, ${chunks[i]}, ${i}, ${vector}::vector)
    `;
  }

  return document;
}
