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

const DEFAULT_MAX_OUTPUT_TOKENS = 1536;
const RETRY_MAX_OUTPUT_TOKENS = 2048;
const TRUNCATION_RETRY_INSTRUCTION =
  "\n\nSua resposta anterior foi cortada antes de terminar. Responda novamente do zero, " +
  "de forma direta e sem enrolacao, mas garanta que a resposta fique completa e correta " +
  "- nao deixe de incluir nenhuma informacao necessaria.";

function extractText(text: string | null | undefined): string {
  const trimmed = text?.trim();
  if (!trimmed) {
    throw new Error("A IA retornou uma resposta vazia.");
  }
  return trimmed;
}

async function askGemini({ systemPrompt, question, history = [] }: AskParams): Promise<string> {
  const client = getGeminiClient();
  const contents = toGeminiContents(history, question);

  const first = await client.models.generateContent({
    model: env.geminiModel,
    contents,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.3,
      maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    },
  });

  if (first.candidates?.[0]?.finishReason !== "MAX_TOKENS") {
    return extractText(first.text);
  }

  const retry = await client.models.generateContent({
    model: env.geminiModel,
    contents,
    config: {
      systemInstruction: systemPrompt + TRUNCATION_RETRY_INSTRUCTION,
      temperature: 0.3,
      maxOutputTokens: RETRY_MAX_OUTPUT_TOKENS,
    },
  });

  return extractText(retry.text);
}

async function askGroq({ systemPrompt, question, history = [] }: AskParams): Promise<string> {
  const client = getGroqClient();

  const first = await client.chat.completions.create({
    model: env.groqModel,
    messages: toGroqMessages(systemPrompt, history, question),
    temperature: 0.3,
    max_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
  });

  if (first.choices[0]?.finish_reason !== "length") {
    return extractText(first.choices[0]?.message?.content);
  }

  const retry = await client.chat.completions.create({
    model: env.groqModel,
    messages: toGroqMessages(systemPrompt + TRUNCATION_RETRY_INSTRUCTION, history, question),
    temperature: 0.3,
    max_tokens: RETRY_MAX_OUTPUT_TOKENS,
  });

  return extractText(retry.choices[0]?.message?.content);
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
