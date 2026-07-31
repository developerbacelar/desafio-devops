import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { HttpError } from "./error.middleware.js";

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    next(new HttpError(401, "Token de autenticacao ausente."));
    return;
  }

  try {
    jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    next(new HttpError(401, "Token invalido ou expirado."));
  }
}
