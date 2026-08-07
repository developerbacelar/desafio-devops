import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { ingestDocument } from "../src/services/ingest.service.js";

const prisma = new PrismaClient();

async function main() {
  await prisma.company.upsert({
    where: { slug: "puc-pr" },
    update: {},
    create: {
      slug: "puc-pr",
      name: "Puc PR",
      primaryColor: "#0d9488",
      persona:
        "Você é a atendente virtual da PUCPR. Seja acolhedora, " +
        "prestativa e clara. Nunca dê respostas definitivas sobre bolsas " +
        "ou validação de matérias: oriente o estudante a abrir um protocolo oficial.",
    },
  });

  await prisma.company.upsert({
    where: { slug: "technova" },
    update: {},
    create: {
      slug: "technova",
      name: "TechNova Eletronicos",
      primaryColor: "#2563eb",
      persona:
        "Voce e o assistente virtual da TechNova Eletronicos, uma loja de " +
        "informatica e eletronicos. Seja cordial e objetivo, respondendo de forma " +
        "direta e sem enrolacao, mas cobrindo tudo que o cliente perguntou. Trate o cliente por voce.",
    },
  });

  await prisma.company.upsert({
    where: { slug: "clinica-sorriso" },
    update: {},
    create: {
      slug: "clinica-sorriso",
      name: "Clinica Sorriso",
      primaryColor: "#0d9488",
      persona:
        "Voce e a atendente virtual da Clinica Sorriso, uma clinica " +
        "odontologica. Seja acolhedora e clara. Nunca faca diagnosticos: " +
        "oriente o paciente a agendar uma avaliacao presencial.",
    },
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const seedDataDir = path.join(__dirname, "seed-data");
  const companies = await prisma.company.findMany({ select: { id: true, slug: true } });

  for (const company of companies) {
    const filename = `${company.slug}.md`;
    const filePath = path.join(seedDataDir, filename);
    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, "utf-8");
    await ingestDocument(company.id, filename, content);
    console.log(`Contexto ingerido para ${company.slug} (${filename}).`);
  }

  console.log("Seed concluido.");
}

main().finally(() => prisma.$disconnect());
