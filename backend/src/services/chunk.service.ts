/** Divide o texto em blocos com sobreposicao, preservando contexto nas bordas. */
export function chunkText(text: string, size = 1000, overlap = 200): string[] {
  if (size <= overlap) throw new Error("O tamanho deve ser maior que a sobreposicao.");

  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length === 0) return [];

  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += size - overlap) {
    const piece = clean.slice(i, i + size).trim();
    if (piece.length > 50) chunks.push(piece);
  }
  return chunks;
}

/** Para Markdown, quebrar por cabecalho antes do tamanho fixo preserva o sentido. */
export function chunkMarkdown(md: string, size = 1000, overlap = 200): string[] {
  const sections = md.split(/^(?=#{1,3}\s)/m).filter((s) => s.trim().length > 0);
  return sections.flatMap((section) =>
    section.length <= size ? [section.trim()] : chunkText(section, size, overlap),
  );
}
