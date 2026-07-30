import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL nao configurada.");
  }
  client ??= new PrismaClient();
  return client;
}
