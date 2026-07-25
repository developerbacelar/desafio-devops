# Assistente IA Multiempresa

Sistema web de atendimento automatizado com IA generativa (Google Gemini).
Cada empresa cadastrada tem sua propria persona e, a partir do Sprint 2,
sua propria base de conhecimento alimentada por PDF ou Markdown (RAG).

## Integrantes

| Nome | Papel |
|---|---|
| Marco Aurelio Bacelar | Back-end |
| Marco Aurelio Bacelar | Front-end |
| Marco Aurelio Bacelar | DevOps |
| Marco Aurelio Bacelar | QA |

## Stack

- **Back-end:** Node.js + Express + TypeScript
- **Banco:** PostgreSQL + Prisma (pgvector a partir do Sprint 2)
- **IA:** Google Gemini (`gemini-flash-latest`)
- **Front-end:** Next.js 15 + React 19 + Tailwind
- **Testes:** Vitest + Supertest (cobertura minima 50%)
- **CI/CD:** GitHub Actions + Docker
- **Deploy:** back-end no Render, front-end na Vercel

## Rodando localmente

```bash
cd backend
cp .env.example .env      # preencha GEMINI_API_KEY
npm install
npm run dev               # http://localhost:3333
```

Chave gratuita do Gemini: https://aistudio.google.com/apikey

## Endpoints

| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/api/health` | Status do servidor |
| GET | `/api/companies` | Lista as empresas atendidas |
| POST | `/api/chat` | Envia pergunta e recebe resposta da IA |

Exemplo:

```bash
curl -X POST http://localhost:3333/api/chat \
  -H "Content-Type: application/json" \
  -d '{"companySlug":"technova","question":"Voces entregam em Curitiba?"}'
```

## Testes

```bash
npm test              # roda os testes
npm run test:coverage # gera o relatorio de cobertura em coverage/
```

## Roadmap

- **Sprint 1** — servidor, integracao com Gemini, personas por empresa, CI, Docker
- **Sprint 2** — upload de PDF/Markdown, chunking, embeddings, busca vetorial (RAG)
- **Sprint 3** — front-end, autenticacao JWT, painel administrativo
