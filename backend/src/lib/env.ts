import "dotenv/config";

export const env = {
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
  port: Number(process.env.PORT) || 3333,
  databaseUrl: process.env.DATABASE_URL ?? "",
  isTest: process.env.NODE_ENV === "test",
};
