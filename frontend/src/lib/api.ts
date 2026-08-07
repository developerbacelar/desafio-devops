import type { Company, SendChatMessageParams, SendChatMessageResult } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function fetchCompany(slug: string, apiKey: string): Promise<Company> {
  const res = await fetch(`${API_BASE_URL}/api/companies/${slug}`, {
    headers: { "X-Widget-Key": apiKey },
  });
  if (!res.ok) {
    throw new Error("Nao foi possivel carregar a empresa.");
  }
  const body = await res.json();
  return body.company;
}

export async function sendChatMessage(
  params: SendChatMessageParams,
  apiKey: string,
): Promise<SendChatMessageResult> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Widget-Key": apiKey },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Falha ao enviar a mensagem.");
  }

  return res.json();
}
