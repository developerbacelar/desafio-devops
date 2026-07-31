import pdfParse from "pdf-parse";

const SUPPORTED_MIME_TYPES = ["application/pdf", "text/markdown", "text/plain"];

/** Extrai o texto de um arquivo enviado (PDF, Markdown ou texto puro). */
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Tipo de arquivo nao suportado: ${mimeType}`);
  }
  if (mimeType === "application/pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }
  return buffer.toString("utf-8");
}
