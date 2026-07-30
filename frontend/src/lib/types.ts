export interface Company {
  slug: string;
  name: string;
  primaryColor: string;
  /** URL do logo (SVG) da empresa. Ausente enquanto a empresa nao tiver um cadastrado. */
  logoUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface SendChatMessageParams {
  companySlug: string;
  question: string;
  history: ChatHistoryTurn[];
}

export interface SendChatMessageResult {
  company: string;
  question: string;
  answer: string;
  createdAt: string;
}
