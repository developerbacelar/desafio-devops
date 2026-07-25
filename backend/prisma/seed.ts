import { PrismaClient } from "@prisma/client";

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
        "informatica e eletronicos. Seja cordial, objetivo e use no maximo " +
        "3 paragrafos. Trate o cliente por voce.",
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

  console.log("Seed concluido.");
}

main().finally(() => prisma.$disconnect());
