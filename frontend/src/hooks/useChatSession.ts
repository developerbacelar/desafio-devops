"use client";

import { useCallback, useReducer } from "react";
import { sendChatMessage } from "@/lib/api";
import type { ChatHistoryTurn, ChatMessage } from "@/lib/types";

const MAX_HISTORY_MESSAGES = 30;

type Status = "idle" | "sending" | "error";

interface PendingRetry {
  question: string;
  history: ChatHistoryTurn[];
}

interface State {
  messages: ChatMessage[];
  status: Status;
  error: string | null;
  pendingRetry: PendingRetry | null;
}

type Action =
  | { type: "send-start"; message: ChatMessage }
  | { type: "send-success"; message: ChatMessage }
  | { type: "send-error"; error: string; question: string; history: ChatHistoryTurn[] }
  | { type: "retry-start" }
  | { type: "reset" };

const initialState: State = {
  messages: [],
  status: "idle",
  error: null,
  pendingRetry: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "send-start":
      return {
        ...state,
        messages: [...state.messages, action.message],
        status: "sending",
        error: null,
        pendingRetry: null,
      };
    case "send-success":
      return {
        ...state,
        messages: [...state.messages, action.message],
        status: "idle",
        error: null,
        pendingRetry: null,
      };
    case "send-error":
      return {
        ...state,
        status: "error",
        error: action.error,
        pendingRetry: { question: action.question, history: action.history },
      };
    case "retry-start":
      return { ...state, status: "sending", error: null };
    case "reset":
      return initialState;
  }
}

function makeMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() };
}

function toHistory(messages: ChatMessage[]): ChatHistoryTurn[] {
  return messages.slice(-MAX_HISTORY_MESSAGES).map(({ role, content }) => ({ role, content }));
}

export interface UseChatSessionResult {
  messages: ChatMessage[];
  status: Status;
  error: string | null;
  sendMessage: (question: string) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
}

export function useChatSession(companySlug: string): UseChatSessionResult {
  const [state, dispatch] = useReducer(reducer, initialState);

  const sendMessage = useCallback(
    async (question: string) => {
      const history = toHistory(state.messages);
      dispatch({ type: "send-start", message: makeMessage("user", question) });
      try {
        const { answer } = await sendChatMessage({ companySlug, question, history });
        dispatch({ type: "send-success", message: makeMessage("assistant", answer) });
      } catch (err) {
        dispatch({ type: "send-error", error: (err as Error).message, question, history });
      }
    },
    [companySlug, state.messages],
  );

  const retry = useCallback(async () => {
    if (!state.pendingRetry) return;
    const { question, history } = state.pendingRetry;
    dispatch({ type: "retry-start" });
    try {
      const { answer } = await sendChatMessage({ companySlug, question, history });
      dispatch({ type: "send-success", message: makeMessage("assistant", answer) });
    } catch (err) {
      dispatch({ type: "send-error", error: (err as Error).message, question, history });
    }
  }, [companySlug, state.pendingRetry]);

  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  return { messages: state.messages, status: state.status, error: state.error, sendMessage, retry, reset };
}
