import { Router } from "express";
import { listCompanies } from "../services/company.service.js";

export const companyRouter = Router();

companyRouter.get("/companies", async (_req, res, next) => {
  try {
    const companies = (await listCompanies()).map(({ slug, name, primaryColor }) => ({
      slug,
      name,
      primaryColor,
    }));
    res.json({ companies });
  } catch (err) {
    next(err);
  }
});
