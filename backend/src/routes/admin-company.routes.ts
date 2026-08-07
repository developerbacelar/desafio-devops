import { Router } from "express";
import { Prisma } from "@prisma/client";
import {
  createCompany,
  deleteCompany,
  findCompanyBySlug,
  listCompanies,
  rotateApiKey,
  updateCompany,
  validateCreateCompanyInput,
  validateUpdateCompanyInput,
} from "../services/company.service.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";
import { HttpError } from "../middlewares/error.middleware.js";

export const adminCompanyRouter = Router();

adminCompanyRouter.use("/admin/companies", requireAdmin);

adminCompanyRouter.get("/admin/companies", async (_req, res, next) => {
  try {
    res.json({ companies: await listCompanies() });
  } catch (err) {
    next(err);
  }
});

adminCompanyRouter.post("/admin/companies", async (req, res, next) => {
  try {
    let input;
    try {
      input = validateCreateCompanyInput(req.body);
    } catch (err) {
      throw new HttpError(400, (err as Error).message);
    }

    const { company, apiKey } = await createCompany(input);
    res.status(201).json({ company, apiKey });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      next(new HttpError(409, "Slug ja esta em uso."));
      return;
    }
    next(err);
  }
});

adminCompanyRouter.get("/admin/companies/:slug", async (req, res, next) => {
  try {
    const company = await findCompanyBySlug(req.params.slug);
    if (!company) {
      throw new HttpError(404, `Empresa "${req.params.slug}" nao encontrada.`);
    }
    res.json({ company });
  } catch (err) {
    next(err);
  }
});

adminCompanyRouter.put("/admin/companies/:slug", async (req, res, next) => {
  try {
    let input;
    try {
      input = validateUpdateCompanyInput(req.body);
    } catch (err) {
      throw new HttpError(400, (err as Error).message);
    }

    const company = await updateCompany(req.params.slug, input);
    res.json({ company });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      next(new HttpError(409, "Slug ja esta em uso."));
      return;
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      next(new HttpError(404, `Empresa "${req.params.slug}" nao encontrada.`));
      return;
    }
    next(err);
  }
});

adminCompanyRouter.post("/admin/companies/:slug/rotate-key", async (req, res, next) => {
  try {
    const { company, apiKey } = await rotateApiKey(req.params.slug);
    res.json({ company, apiKey });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      next(new HttpError(404, `Empresa "${req.params.slug}" nao encontrada.`));
      return;
    }
    next(err);
  }
});

adminCompanyRouter.delete("/admin/companies/:slug", async (req, res, next) => {
  try {
    await deleteCompany(req.params.slug);
    res.status(204).send();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      next(new HttpError(404, `Empresa "${req.params.slug}" nao encontrada.`));
      return;
    }
    next(err);
  }
});
