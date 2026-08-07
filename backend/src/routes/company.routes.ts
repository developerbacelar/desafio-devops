import { Router } from "express";
import { findCompanyForWidget } from "../services/company.service.js";
import { HttpError } from "../middlewares/error.middleware.js";

export const companyRouter = Router();

// Antes esta rota listava TODAS as empresas publicamente (GET /api/companies).
// Isso permitia enumerar todos os clientes cadastrados sem autenticacao.
// Agora exige a chave do widget e devolve so a empresa daquele slug.
companyRouter.get("/companies/:slug", async (req, res, next) => {
  try {
    const company = await findCompanyForWidget(req.params.slug, req.header("X-Widget-Key"));
    if (!company) {
      throw new HttpError(403, "Chave de API ausente ou invalida para esta empresa.");
    }
    const { slug, name, primaryColor, logoUrl } = company;
    res.json({ company: { slug, name, primaryColor, logoUrl } });
  } catch (err) {
    next(err);
  }
});
