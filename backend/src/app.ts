import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.routes.js";
import { companyRouter } from "./routes/company.routes.js";
import { chatRouter } from "./routes/chat.routes.js";
import { adminAuthRouter } from "./routes/admin-auth.routes.js";
import { adminCompanyRouter } from "./routes/admin-company.routes.js";
import { adminDocumentRouter } from "./routes/admin-document.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", healthRouter);
  app.use("/api", companyRouter);
  app.use("/api", chatRouter);
  app.use("/api", adminAuthRouter);
  app.use("/api", adminCompanyRouter);
  app.use("/api", adminDocumentRouter);

  app.use((_req, res) => res.status(404).json({ error: "Rota nao encontrada." }));
  app.use(errorMiddleware);

  return app;
}
