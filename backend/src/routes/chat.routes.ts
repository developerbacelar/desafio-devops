import { Router } from "express";
import { findCompanyBySlug } from "../services/company.service.js";
import { buildSystemPrompt, sanitizeQuestion } from "../services/prompt.service.js";
import { ask } from "../services/ai.service.js";
import { HttpError } from "../middlewares/error.middleware.js";

export const chatRouter = Router();

chatRouter.post("/chat", async (req, res, next) => {
  try {
    const { companySlug = "technova", question: rawQuestion } = req.body;

    let question: string;
    try {
      question = sanitizeQuestion(rawQuestion);
    } catch (err) {
      throw new HttpError(400, (err as Error).message);
    }

    const company = findCompanyBySlug(String(companySlug));
    if (!company) {
      throw new HttpError(404, `Empresa "${companySlug}" nao encontrada.`);
    }

    const systemPrompt = buildSystemPrompt(company);
    const answer = await ask({ systemPrompt, question });

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
