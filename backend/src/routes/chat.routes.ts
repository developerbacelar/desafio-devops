import { Router } from "express";
import { findCompanyForWidget } from "../services/company.service.js";
import { buildSystemPrompt, sanitizeHistory, sanitizeQuestion } from "../services/prompt.service.js";
import { ask } from "../services/ai.service.js";
import { retrieveContext } from "../services/retrieval.service.js";
import { env } from "../lib/env.js";
import { HttpError } from "../middlewares/error.middleware.js";

export const chatRouter = Router();

chatRouter.post("/chat", async (req, res, next) => {
  try {
    const { companySlug = "technova", question: rawQuestion, history: rawHistory } = req.body;

    // Chave invalida/ausente sempre responde 403, mesmo se o slug nao existir:
    // nao da pra diferenciar "chave errada" de "empresa inexistente", senao
    // um atacante consegue enumerar quais slugs sao validos por tentativa e erro.
    const company = await findCompanyForWidget(String(companySlug), req.header("X-Widget-Key"));
    if (!company) {
      throw new HttpError(403, "Chave de API ausente ou invalida para esta empresa.");
    }

    let question: string;
    try {
      question = sanitizeQuestion(rawQuestion);
    } catch (err) {
      throw new HttpError(400, (err as Error).message);
    }

    let history: ReturnType<typeof sanitizeHistory>;
    try {
      history = sanitizeHistory(rawHistory);
    } catch (err) {
      throw new HttpError(400, (err as Error).message);
    }

    const chunks = env.databaseUrl ? await retrieveContext(company.id, question) : [];
    const systemPrompt = buildSystemPrompt(company, chunks);
    const answer = await ask({ systemPrompt, question, history });

    res.json({
      company: company.slug,
      question,
      answer,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
