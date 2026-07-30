import type { Company, SendChatMessageParams, SendChatMessageResult } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch(`${API_BASE_URL}/api/companies`);
  if (!res.ok) {
    throw new Error("Nao foi possivel carregar as empresas.");
  }
  const body = await res.json();
  return body.companies;
}

export async function sendChatMessage(params: SendChatMessageParams): Promise<SendChatMessageResult> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Falha ao enviar a mensagem.");
  }

  return res.json();
}
