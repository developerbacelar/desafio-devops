import "dotenv/config";

export const env = {
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  port: Number(process.env.PORT) || 3333,
  databaseUrl: process.env.DATABASE_URL ?? "",
  isTest: process.env.NODE_ENV === "test",
  adminEmail: process.env.ADMIN_EMAIL ?? "",
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
};
