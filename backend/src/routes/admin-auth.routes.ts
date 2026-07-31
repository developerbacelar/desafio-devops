import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { HttpError } from "../middlewares/error.middleware.js";

export const adminAuthRouter = Router();

adminAuthRouter.post("/admin/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
      throw new HttpError(400, "Email e senha sao obrigatorios.");
    }

    const emailMatches = email.trim().toLowerCase() === env.adminEmail.trim().toLowerCase();
    const passwordMatches = env.adminPasswordHash
      ? await bcrypt.compare(password, env.adminPasswordHash)
      : false;

    if (!emailMatches || !passwordMatches) {
      throw new HttpError(401, "Credenciais invalidas.");
    }

    const token = jwt.sign({ email: env.adminEmail, role: "admin" }, env.jwtSecret, {
      expiresIn: "24h",
    });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});
