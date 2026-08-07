import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { generateApiKey } from "../src/services/company.service.js";

const prisma = new PrismaClient();

/** Escreve e espera o flush completo antes de deixar o processo terminar - console.log
 * pode truncar a ultima linha quando stdout e um pipe (nao um TTY) e o processo termina
 * logo em seguida, o que perderia a unica copia em texto puro de uma chave gerada. */
function writeAndFlush(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    process.stdout.write(text + "\n", (err) => (err ? reject(err) : resolve()));
  });
}

/**
 * Gera e imprime uma chave de API nova para cada empresa que ainda nao tem
 * uma (apiKeyHash nulo). A chave em texto puro so aparece aqui, uma vez -
 * o banco so guarda o hash. Rode contra o Postgres local para testar; contra
 * o Neon de producao, so com autorizacao explicita (DATABASE_URL apontando
 * pra la), pois isso e uma mudanca em dados reais de clientes.
 */
async function main() {
  const companies = await prisma.company.findMany({
    where: { apiKeyHash: null },
    select: { id: true, slug: true, name: true },
  });

  if (companies.length === 0) {
    await writeAndFlush("Nenhuma empresa sem chave de API. Nada a fazer.");
    return;
  }

  const lines: string[] = [];
  for (const company of companies) {
    const apiKey = generateApiKey();
    const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");
    await prisma.company.update({ where: { id: company.id }, data: { apiKeyHash } });
    lines.push(`${company.slug} (${company.name}): ${apiKey}`);
  }
  lines.push('\nGuarde essas chaves agora — elas nao aparecem de novo. Atualize o <script data-key="..."> de cada site antes do proximo deploy do backend.');

  // Uma unica escrita no final (nao uma por empresa): reduz drasticamente o
  // risco de truncamento e ainda assim aguarda o callback de flush do stream.
  await writeAndFlush(lines.join("\n"));
}

main()
  .catch(async (err: unknown) => {
    await writeAndFlush(`ERRO: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
