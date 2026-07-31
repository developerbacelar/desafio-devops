import { Router } from "express";
import { findCompanyBySlug } from "../services/company.service.js";
import { buildSystemPrompt, sanitizeHistory, sanitizeQuestion } from "../services/prompt.service.js";
import { ask } from "../services/ai.service.js";
import { retrieveContext } from "../services/retrieval.service.js";
import { env } from "../lib/env.js";
import { HttpError } from "../middlewares/error.middleware.js";

export const chatRouter = Router();

chatRouter.post("/chat", async (req, res, next) => {
  try {
    const { companySlug = "technova", question: rawQuestion, history: rawHistory } = req.body;

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

    const company = await findCompanyBySlug(String(companySlug));
    if (!company) {
      throw new HttpError(404, `Empresa "${companySlug}" nao encontrada.`);
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
