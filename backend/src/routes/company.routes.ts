import { Router } from "express";
import { listCompanies } from "../services/company.service.js";

export const companyRouter = Router();

companyRouter.get("/companies", (_req, res) => {
  const companies = listCompanies().map(({ slug, name, primaryColor }) => ({
    slug,
    name,
    primaryColor,
  }));
  res.json({ companies });
});
