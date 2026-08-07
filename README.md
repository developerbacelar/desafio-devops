# Assistente IA Multiempresa

Widget de chat com IA generativa que qualquer empresa cadastrada embute no próprio site, com painel administrativo para gerenciar persona, marca e base de conhecimento (RAG).

[![CI/CD](https://github.com/developerbacelar/desafio-devops/actions/workflows/ci.yml/badge.svg)](https://github.com/developerbacelar/desafio-devops/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-22-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?logo=next.js&logoColor=white)

## Índice

- [Sobre o projeto](#sobre-o-projeto)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts disponíveis](#scripts-disponíveis)
- [Testes](#testes)
- [Qualidade de código](#qualidade-de-código)
- [Deploy](#deploy)
- [Documentação específica](#documentação-específica)
- [Convenções e contribuição](#convenções-e-contribuição)
- [Solução de problemas](#solução-de-problemas)

## Sobre o projeto

Cada empresa cliente cadastra uma persona (tom de voz, regras de atendimento) e uma cor de marca, e recebe um widget de chat embutível via uma única tag `<script>`. O widget conversa com um backend Express que monta o prompt de sistema a partir da persona, aplica um conjunto de guardrails contra manipulação/prompt injection, e responde usando o Google Gemini — com fallback automático para a Groq quando a chamada ao Gemini falha.

A partir do momento em que a empresa recebe documentos (PDF, Markdown ou texto simples) via painel administrativo, o backend passa a aumentar cada resposta com trechos relevantes desses documentos (RAG): o texto é dividido em blocos, cada bloco vira um embedding armazenado no PostgreSQL com a extensão `pgvector`, e a pergunta do usuário é comparada por similaridade de cosseno contra os blocos da própria empresa antes de ser enviada à IA.

O painel administrativo (`/admin`) é protegido por um único usuário administrador configurado via variáveis de ambiente (sem cadastro de múltiplas contas): nele é possível criar/editar empresas e enviar/remover os documentos que alimentam o RAG de cada uma.

O público-alvo é o time que desenvolve e opera o produto — o repositório reúne o backend da API, o frontend (widget + painel) e a infraestrutura de banco/CI necessários para rodar tudo localmente ou em produção.

## Stack

| Camada | Tecnologia | Versão | Papel no projeto |
|---|---|---|---|
| Backend | Node.js | 22 | Runtime da API (CI e Docker fixam essa versão) |
| Backend | Express | ^4.21 | Framework HTTP da API |
| Backend | TypeScript | ^5.7 | Tipagem estática do backend |
| Backend | Prisma | ^6.2 | ORM e migrations sobre o PostgreSQL |
| Backend | PostgreSQL + pgvector | 16 (imagem `pgvector/pgvector:pg16`) | Banco relacional e armazenamento/busca de embeddings |
| Backend | `@google/genai` (Gemini) | ^1.37 | Geração de resposta e embeddings (`gemini-embedding-001`) |
| Backend | `groq-sdk` | ^1.5 | Fallback de geração de resposta quando o Gemini falha |
| Backend | jsonwebtoken + bcryptjs | ^9.0 / ^3.0 | Autenticação do admin único (JWT + hash de senha) |
| Backend | multer + pdf-parse | ^2.2 / ^1.1 | Upload e extração de texto de documentos |
| Backend | Vitest + Supertest | ^2.1 / ^7.0 | Testes de unidade e de rota, com cobertura |
| Frontend | Next.js (App Router) | 15.5.22 | Widget de chat (`/embed/:slug`) e painel admin (`/admin`) |
| Frontend | React | 19.2.8 | UI dos dois pedaços do frontend |
| Frontend | Tailwind CSS | ^3.4 | Estilização |
| Frontend | esbuild | ^0.24 | Compila `src/widget/` em `public/widget.js` (IIFE, sem dependências) |
| Frontend | Zod | ^4.4 | Validação do formulário de empresa no painel |
| Frontend | Vitest + Testing Library | ^2.1 / ^16.1 | Testes de componentes, hooks e páginas |
| Infra | Docker | — | Empacota o backend para produção (`backend/Dockerfile`) |
| Infra | Docker Compose | — | Sobe o PostgreSQL + pgvector localmente (`docker-compose.yml`) |
| Infra | GitHub Actions | — | CI: testes/cobertura, lint/typecheck, build da imagem Docker e deploy hook |

## Arquitetura

```mermaid
flowchart LR
    subgraph Cliente["Site do cliente"]
        Script["&lt;script src=widget.js data-company=slug&gt;"]
    end

    subgraph FE["Frontend — Next.js"]
        Widget["widget.js (loader, gera o iframe)"]
        Embed["/embed/[companySlug] (chat)"]
        Admin["/admin/* (painel administrativo)"]
    end

    subgraph BE["Backend — Express API"]
        Routes["Rotas /api/*"]
        Services["Services (chat, RAG, auth, empresa)"]
    end

    DB[(PostgreSQL + pgvector)]
    Gemini["Google Gemini\n(chat + embeddings)"]
    Groq["Groq\n(fallback de chat)"]

    Script --> Widget
    Widget -- "cria iframe" --> Embed
    Widget <-- "postMessage (resize)" --> Embed
    Embed -- "GET /api/companies\nPOST /api/chat" --> Routes
    Admin -- "POST /api/admin/login\nCRUD /api/admin/*" --> Routes
    Routes --> Services
    Services --> DB
    Services -- pergunta/contexto --> Gemini
    Services -. "fallback se Gemini falhar" .-> Groq
```

Uma pergunta feita no widget percorre o sistema assim: o `widget.js` carregado no site do cliente cria um `<iframe>` apontando para `/embed/[companySlug]`; essa página React busca a empresa em `GET /api/companies` e envia cada pergunta (com o histórico da conversa atual) para `POST /api/chat`. No backend, a rota resolve a empresa pelo slug, busca no PostgreSQL (via `pgvector`) os trechos de documentos mais relevantes para a pergunta, monta um prompt de sistema (persona da empresa + guardrails fixos + trechos recuperados) e chama o Gemini; se a chamada falhar e houver `GROQ_API_KEY` configurada, tenta novamente com a Groq. A resposta volta como JSON para o widget, que a exibe e atualiza o histórico local em memória (não persistido). No painel admin, o fluxo de dados é o mesmo backend, mas autenticado por JWT: o administrador loga em `POST /api/admin/login`, recebe um token guardado em `sessionStorage`, e usa esse token em todo CRUD de empresas e documentos.

## Estrutura do repositório

```
.
├── backend/            # API Express (rotas, services de IA/RAG, Prisma, testes) — ver backend/README.md
├── frontend/            # Next.js: widget embutível + painel admin — ver frontend/README.md
├── docker-compose.yml   # Sobe PostgreSQL + pgvector para desenvolvimento local
├── .github/workflows/   # Pipeline de CI/CD (GitHub Actions)
├── SPRINT1.md            # Registro do escopo entregue no Sprint 1
├── SPRINT2.md            # Registro do escopo entregue no Sprint 2
└── SPRINT3.md            # Vazio no momento desta documentação
```

## Como rodar

Pré-requisitos:

- Node.js 22.x e npm (a mesma versão usada no CI e no Dockerfile)
- Docker e Docker Compose (para o PostgreSQL com `pgvector`) — ou uma instância PostgreSQL 16 com a extensão `vector` já habilitada (ex.: Neon, Supabase)
- Uma chave de API do Google Gemini (gratuita em https://aistudio.google.com/apikey)

```bash
# 1. Clonar o repositório
git clone https://github.com/developerbacelar/desafio-devops.git
cd desafio-devops

# 2. Subir o banco (PostgreSQL + extensão pgvector)
docker compose up -d

# 3. Configurar e instalar o backend
cd backend
cp .env.example .env        # preencha ao menos GEMINI_API_KEY; DATABASE_URL já aponta pro Docker Compose
npm install
npx prisma migrate dev      # aplica as migrations no banco local
npm run seed                # cria as empresas de exemplo (puc-pr, technova, clinica-sorriso) e ingere o contexto de puc-pr
npm run dev                 # API em http://localhost:3333

# 4. Em outro terminal, configurar e instalar o frontend
cd ../frontend
cp .env.example .env.local  # NEXT_PUBLIC_API_BASE_URL=http://localhost:3333 (valor padrão do arquivo)
npm install
npm run dev                 # Next.js em http://localhost:3000
```

Com os dois serviços no ar:

- Painel admin: http://localhost:3000/admin — exige `ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH`/`JWT_SECRET` preenchidos em `backend/.env` (veja o comentário em `backend/.env.example` para gerar o hash da senha).
- Widget isolado para teste manual: `cd frontend && npm run build && npm run dev`, depois abra `http://localhost:3000/demo.html`.
- Sem `DATABASE_URL` configurada, a API ainda responde `GET /api/companies` e `POST /api/chat` usando três empresas fixas em memória (sem RAG, sem painel admin funcional).

## Variáveis de ambiente

### Backend (`backend/.env`, a partir de `backend/.env.example`)

| Variável | Obrigatória | Onde é usada | Descrição | Exemplo |
|---|---|---|---|---|
| `GEMINI_API_KEY` | Sim, para respostas de IA | `src/services/ai.service.ts`, `src/services/embedding.service.ts` | Chave da API do Google Gemini, usada para gerar respostas e embeddings | `AIzaSy...` |
| `GEMINI_MODEL` | Não — sugerido como `gemini-flash-latest` no `.env.example`, mas se a variável ficar totalmente ausente o código usa `gemini-3.5-flash` (ver `src/lib/env.ts`) | `src/services/ai.service.ts` | Modelo Gemini usado para gerar as respostas do chat | `gemini-flash-latest` |
| `GROQ_API_KEY` | Não | `src/services/ai.service.ts` | Chave da API da Groq; sem ela, o fallback fica desativado e uma falha do Gemini vira erro | `gsk_...` |
| `GROQ_MODEL` | Não (default `llama-3.3-70b-versatile`) | `src/services/ai.service.ts` | Modelo usado no fallback via Groq | `llama-3.3-70b-versatile` |
| `PORT` | Não (default `3333`) | `src/server.ts` | Porta em que a API Express escuta | `3333` |
| `DATABASE_URL` | Não em modo demo; obrigatória para RAG e painel admin | `src/lib/prisma.ts` | String de conexão do PostgreSQL (precisa da extensão `vector`) | `postgresql://chatbot:chatbot@localhost:5432/chatbot` |
| `ADMIN_EMAIL` | Sim, para usar o painel admin | `src/routes/admin-auth.routes.ts` | E-mail do administrador único | `admin@example.com` |
| `ADMIN_PASSWORD_HASH` | Sim, para usar o painel admin | `src/routes/admin-auth.routes.ts` | Hash bcrypt da senha do administrador (gere com o comando comentado no `.env.example`) | `$2a$10$...` |
| `JWT_SECRET` | Sim, para usar o painel admin | `src/middlewares/auth.middleware.ts`, `src/routes/admin-auth.routes.ts` | Segredo usado para assinar/validar os tokens JWT do painel | `uma-string-longa-e-aleatoria` |

### Frontend (`frontend/.env.local`, a partir de `frontend/.env.example`)

| Variável | Obrigatória | Onde é usada | Descrição | Exemplo |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Sim | `src/lib/api.ts`, `src/lib/adminApi.ts` | URL base do backend consumida pelo widget e pelo painel admin | `http://localhost:3333` |

## Scripts disponíveis

### Backend (`backend/package.json`)

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe a API em modo desenvolvimento (`tsx watch src/server.ts`) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Roda o build de produção (`node dist/server.js`) |
| `npm test` | Roda a suíte de testes (`vitest run`) |
| `npm run test:coverage` | Roda os testes com relatório de cobertura em `backend/coverage/` |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate` | Aplica migrations em desenvolvimento (`prisma migrate dev`) |
| `npm run seed` | Popula empresas de exemplo e ingere o contexto de `prisma/seed-data/` |

### Frontend (`frontend/package.json`)

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o Next.js em modo desenvolvimento |
| `npm run build` | Gera `public/widget.js` (esbuild) e depois o build de produção do Next |
| `npm run build:widget` | Recompila só `public/widget.js` |
| `npm start` | Serve o build de produção do Next |
| `npm run lint` | ESLint (regras do Next.js) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Roda a suíte de testes (`vitest run`) |
| `npm run test:watch` | Testes em modo watch |

## Testes

- **Backend**: `cd backend && npm test` (ou `npm run test:coverage`). O `vitest.config.ts` exige 100% de cobertura em `lines`, `functions`, `branches` e `statements` sobre `src/**/*.ts` (exceto `src/server.ts` e `src/lib/prisma.ts`) — o comando falha se a cobertura cair abaixo disso.
- **Frontend**: `cd frontend && npm test` (Vitest + Testing Library + jsdom, sem rede real — `fetch` e `next/navigation` são mockados nos testes).
- **Manual da API**: `backend/Insomnia_Postman.md` traz requisições prontas (health check, listar empresas, conversar, casos de erro esperados).
- **Manual do widget**: `frontend/public/demo.html`, servido junto do Next em desenvolvimento/produção.

## Qualidade de código

- Backend: TypeScript em modo `strict`; não há linter configurado (sem ESLint/Prettier no diretório `backend/`).
- Frontend: `npm run lint` (ESLint com `next/core-web-vitals` e `next/typescript`) e `npm run typecheck` (`tsc --noEmit`); `public/widget.js` é excluído do lint por ser artefato de build.
- Não há hooks de Git (Husky ou similar) configurados neste repositório — lint e testes rodam apenas manualmente e no CI.

## Deploy

O workflow `.github/workflows/ci.yml` roda em todo push e em pull requests para `main`, com quatro jobs:

1. **qualidade** (backend): `npm ci`, gera o Prisma Client, compila TypeScript, roda `npm run test:coverage` e publica o relatório de cobertura como artefato.
2. **frontend**: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
3. **docker** (depende de `qualidade`): builda a imagem `desafio-ia-backend` a partir de `backend/Dockerfile`.
4. **deploy** (depende de `qualidade` e `docker`, só em push para `main`): dispara um deploy hook do Render via `curl` contra o secret `RENDER_DEPLOY_HOOK`.

Isso cobre o deploy automático do **backend** no Render. Não há, neste repositório, um job de deploy nem arquivo de configuração (`vercel.json` ou equivalente) para o frontend — como esse serviço é publicado está registrado em "Lacunas encontradas" na resposta do chat que acompanha esta documentação, não neste README.

## Documentação específica

- [backend/README.md](backend/README.md) — arquitetura interna, modelo de dados, referência da API, autenticação e regras de negócio.
- [frontend/README.md](frontend/README.md) — rotas, componentes, estado/dados e integração com a API.

## Convenções e contribuição

O histórico de commits deste repositório segue o padrão [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `test:`, ...), com mensagens curtas em português. Não há um `CONTRIBUTING.md`, template de PR ou branch protegida documentados no repositório; os commits recentes foram feitos diretamente. Ao contribuir, mantenha esse padrão de commit e rode os testes/lint relevantes antes de abrir um PR — o CI cobre backend e frontend em qualquer branch.

## Solução de problemas

| Sintoma | Causa provável | Correção |
|---|---|---|
| `Error: DATABASE_URL nao configurada.` ao chamar rotas de admin | `DATABASE_URL` ausente/vazia em `backend/.env` | Suba o banco (`docker compose up -d`) e preencha `DATABASE_URL` no `.env` do backend |
| `POST /api/chat` responde 500 mesmo com `GEMINI_API_KEY` preenchida | Chave inválida e `GROQ_API_KEY` não configurada (sem fallback) | Confira a chave em https://aistudio.google.com/apikey ou configure `GROQ_API_KEY` como fallback |
| Login em `/admin/login` sempre retorna "Credenciais invalidas." | `ADMIN_PASSWORD_HASH` não corresponde à senha digitada, ou `ADMIN_EMAIL` com espaços/maiúsculas diferentes | Gere o hash com `node -e "console.log(require('bcryptjs').hashSync('SUA_SENHA', 10))"` a partir do backend e copie exatamente para `.env` |
| Painel admin fica em branco / redireciona sempre para login | `NEXT_PUBLIC_API_BASE_URL` do frontend não aponta para o backend rodando, ou token expirado (JWT de 24h) | Confirme a URL em `frontend/.env.local` e faça login novamente |
| Upload de documento retorna 400 "Arquivo invalido ou maior que 10MB" | Arquivo maior que o limite do `multer` ou tipo fora de PDF/Markdown/texto puro | Envie um `.pdf`, `.md` ou `.txt` de até 10MB |
| `npx prisma migrate dev` falha com erro de extensão `vector` | Banco sem a extensão `pgvector` habilitada | Use a imagem `pgvector/pgvector:pg16` do `docker-compose.yml` (já roda `backend/docker/init-pgvector.sql`) ou habilite `CREATE EXTENSION vector;` manualmente no banco gerenciado |
