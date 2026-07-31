import { Router } from "express";
import multer from "multer";
import { Prisma } from "@prisma/client";
import { findCompanyBySlug } from "../services/company.service.js";
import { extractText } from "../services/extract.service.js";
import { ingestDocument } from "../services/ingest.service.js";
import { listDocuments, deleteDocument } from "../services/document.service.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";
import { HttpError } from "../middlewares/error.middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const adminDocumentRouter = Router();

adminDocumentRouter.use("/admin/companies/:slug/documents", requireAdmin);
adminDocumentRouter.use("/admin/documents", requireAdmin);

adminDocumentRouter.post(
  "/admin/companies/:slug/documents",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        next(new HttpError(400, "Arquivo invalido ou maior que 10MB."));
        return;
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const company = await findCompanyBySlug(req.params.slug);
      if (!company) {
        throw new HttpError(404, `Empresa "${req.params.slug}" nao encontrada.`);
      }
      if (!req.file) {
        throw new HttpError(400, "Nenhum arquivo enviado.");
      }

      let text: string;
      try {
        text = await extractText(req.file.buffer, req.file.mimetype);
      } catch (err) {
        throw new HttpError(400, (err as Error).message);
      }

      const document = await ingestDocument(company.id, req.file.originalname, text);
      if (!document) {
        throw new HttpError(400, "O arquivo nao gerou nenhum conteudo aproveitavel.");
      }

      res.status(201).json({
        document: {
          id: document.id,
          filename: document.filename,
          status: document.status,
          createdAt: document.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

adminDocumentRouter.get("/admin/companies/:slug/documents", async (req, res, next) => {
  try {
    const company = await findCompanyBySlug(req.params.slug);
    if (!company) {
      throw new HttpError(404, `Empresa "${req.params.slug}" nao encontrada.`);
    }
    const documents = await listDocuments(company.id);
    res.json({ documents });
  } catch (err) {
    next(err);
  }
});

adminDocumentRouter.delete("/admin/documents/:id", async (req, res, next) => {
  try {
    await deleteDocument(req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      next(new HttpError(404, "Documento nao encontrado."));
      return;
    }
    next(err);
  }
});
