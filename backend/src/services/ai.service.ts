import type { Content } from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { env } from "../lib/env.js";

let geminiClient: GoogleGenAI | null = null;
let groqClient: Groq | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!env.geminiApiKey) {
    throw new Error("GEMINI_API_KEY nao configurada.");
  }
  geminiClient ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
  return geminiClient;
}

function getGroqClient(): Groq {
  groqClient ??= new Groq({ apiKey: env.groqApiKey });
  return groqClient;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AskParams {
  systemPrompt: string;
  question: string;
  history?: ChatTurn[];
}

function toGeminiContents(history: ChatTurn[], question: string): Content[] {
  const turns: Content[] = history.map((turn) => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [{ text: turn.content }],
  }));
  turns.push({ role: "user", parts: [{ text: question }] });
  return turns;
}

function toGroqMessages(
  systemPrompt: string,
  history: ChatTurn[],
  question: string,
): Groq.Chat.ChatCompletionMessageParam[] {
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [{ role: "system", content: systemPrompt }];
  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.content });
  }
  messages.push({ role: "user", content: question });
  return messages;
}

function extractText(text: string | null | undefined): string {
  const trimmed = text?.trim();
  if (!trimmed) {
    throw new Error("A IA retornou uma resposta vazia.");
  }
  return trimmed;
}

async function askGemini({ systemPrompt, question, history = [] }: AskParams): Promise<string> {
  const response = await getGeminiClient().models.generateContent({
    model: env.geminiModel,
    contents: toGeminiContents(history, question),
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  });

  return extractText(response.text);
}

async function askGroq({ systemPrompt, question, history = [] }: AskParams): Promise<string> {
  const response = await getGroqClient().chat.completions.create({
    model: env.groqModel,
    messages: toGroqMessages(systemPrompt, history, question),
    temperature: 0.3,
    max_tokens: 1024,
  });

  return extractText(response.choices[0]?.message?.content);
}

export async function ask(params: AskParams): Promise<string> {
  try {
    return await askGemini(params);
  } catch (err) {
    if (!env.groqApiKey) {
      throw err;
    }
    console.warn("Gemini falhou, tentando fallback Groq:", (err as Error).message);
    return await askGroq(params);
  }
}
