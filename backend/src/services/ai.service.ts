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

export interface AskParams {
  systemPrompt: string;
  question: string;
}

export async function ask({ systemPrompt, question }: AskParams): Promise<string> {
  const response = await getClient().models.generateContent({
    model: env.geminiModel,
    contents: question,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("A IA retornou uma resposta vazia.");
  }
  return text;
}
