import { GoogleGenAI } from "@google/genai";
import { env } from "../lib/env.js";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!env.geminiApiKey) {
    throw new Error("GEMINI_API_KEY nao configurada.");
  }
  client ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

/** Gera um embedding por texto de entrada. isQuery=true na pergunta, false na ingestao. */
export async function embed(texts: string[], isQuery: boolean): Promise<number[][]> {
  const response = await getClient().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: texts,
    config: {
      taskType: isQuery ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });

  if (!response.embeddings) {
    throw new Error("A API de embeddings nao retornou resultados.");
  }
  return response.embeddings.map((e) => {
    if (!e.values) {
      throw new Error("A API de embeddings retornou um vetor vazio.");
    }
    return e.values;
  });
}
