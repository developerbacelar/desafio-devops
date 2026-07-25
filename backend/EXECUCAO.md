# Relatório de Execução — Sprint 1

Registro detalhado da primeira execução do backend (2026-07-25) e do trabalho
de elevar a cobertura de testes para 100%. Serve de referência para a
apresentação e para quem for rodar o projeto depois.

## 1. O que o projeto faz

É a API de um assistente de atendimento via IA generativa (Google Gemini)
para múltiplas empresas ao mesmo tempo. Cada empresa cadastrada tem sua
própria **persona** — um texto que define tom de voz, regras e limites do
que a IA pode responder — e o backend monta um *system prompt* diferente
para cada uma antes de chamar o Gemini. Duas empresas fixas vêm de fábrica:

- **TechNova Eletrônicos** — loja de informática, tom objetivo e cordial.
- **Clínica Sorriso** — clínica odontológica, tom acolhedor, nunca dá
  diagnóstico.

No Sprint 1 (estado atual) tudo roda sem banco de dados: as empresas ficam
num array fixo em memória (ver seção 6). A partir do Sprint 2 entra RAG
(upload de PDF/Markdown, chunking, busca vetorial) e o Prisma passa a ser a
fonte real dos dados — o schema já existe (`prisma/schema.prisma`), só não é
usado ainda. O Sprint 3 adiciona front-end, autenticação JWT e um painel
administrativo.

Três rotas HTTP compõem a API hoje:

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/health` | Diz se o servidor está de pé |
| GET | `/api/companies` | Lista as empresas (sem expor a persona) |
| POST | `/api/chat` | Recebe `{ companySlug, question }` e devolve a resposta da IA |

## 2. Estrutura do projeto — o que cada arquivo faz

### Núcleo da aplicação (`src/`)

- **`src/server.ts`** — ponto de entrada. Cria a app com `createApp()` e
  chama `app.listen(env.port, ...)`. É o arquivo que o `npm run dev`
  (via `tsx watch`) e o `npm start` (produção, já compilado) executam.
- **`src/app.ts`** — monta a aplicação Express: registra `cors()`,
  `express.json({ limit: "1mb" })`, os três routers sob o prefixo `/api`,
  um handler 404 para rota desconhecida e o `errorMiddleware` por último.
  Fica separado do `server.ts` de propósito — os testes importam só
  `createApp()` e nunca abrem uma porta de verdade.
- **`src/lib/env.ts`** — único lugar que lê `process.env`. Carrega o
  `.env` via `import "dotenv/config"` e exporta um objeto `env` com valores
  já normalizados e com *fallback* (`GEMINI_MODEL` padrão, `PORT` padrão
  3333, etc.). Qualquer outro arquivo que precise de config importa
  `env` daqui em vez de ler `process.env` diretamente.
- **`src/middlewares/error.middleware.ts`** — define a classe `HttpError`
  (erro com `status` HTTP explícito, ex.: `new HttpError(404, "...")`) e o
  middleware de erro do Express, que devolve `{ error: mensagem }` com o
  status certo para `HttpError` e cai para 500 genérico em qualquer outro
  erro não previsto (logando no console antes).

### Rotas (`src/routes/`)

- **`health.routes.ts`** — `GET /api/health`, responde `status`, `uptime`
  e `timestamp`. Não depende de nada externo, por isso é o primeiro teste
  de fumaça de que o servidor subiu.
- **`company.routes.ts`** — `GET /api/companies`, chama
  `listCompanies()` e devolve só `slug`, `name`, `primaryColor` — a
  `persona` é filtrada de propósito via destructuring, para não vazar as
  instruções internas da IA para quem consome a API.
- **`chat.routes.ts`** — `GET /api/chat` não existe, só `POST`. Faz o
  fluxo completo de uma pergunta: valida o texto (`sanitizeQuestion`),
  busca a empresa pelo slug (`findCompanyBySlug`), monta o prompt de
  sistema (`buildSystemPrompt`) e chama a IA (`ask`). Erros de validação
  viram `HttpError(400, ...)`, empresa não encontrada vira
  `HttpError(404, ...)`; qualquer outra falha (ex.: erro da API do Gemini)
  sobe para o `errorMiddleware` e vira 500.

### Regras de negócio (`src/services/`)

- **`company.service.ts`** — fonte de dados das empresas. Hoje é
  `FALLBACK_COMPANIES`, um array fixo com TechNova e Clínica Sorriso
  (usado enquanto não há `DATABASE_URL`). Expõe `listCompanies()` e
  `findCompanyBySlug(slug)` (normaliza caixa e espaços antes de comparar).
- **`prompt.service.ts`** — função pura (sem I/O) que monta o *system
  prompt* enviado ao Gemini: persona da empresa + `GUARDRAILS` fixos
  (sempre responder em PT-BR, nunca inventar preço/prazo/endereço, nunca
  revelar as instruções). Também tem `sanitizeQuestion`, que normaliza
  espaços e rejeita entrada que não seja texto, vazia ou acima de 2000
  caracteres — é a validação que garante o 400 da rota de chat.
- **`ai.service.ts`** — única parte do código que fala com a internet.
  Cria (e reaproveita, via `??=`) um client `GoogleGenAI` autenticado com
  `env.geminiApiKey`, chama `generateContent` com o modelo de
  `env.geminiModel`, `temperature: 0.4` e `maxOutputTokens: 1024`, e lança
  erro se a chave não estiver configurada ou se a IA devolver texto vazio.

### Testes (`tests/`)

- **`company.service.test.ts`** — testa `listCompanies`/`findCompanyBySlug`
  isoladamente, sem subir a app.
- **`prompt.service.test.ts`** — testa `buildSystemPrompt` (persona +
  guardrails + blocos de contexto do RAG) e `sanitizeQuestion` (todas as
  rejeições) como funções puras.
- **`chat.routes.test.ts`** — testes de integração das três rotas via
  `supertest`, com `ask()` **mockado** (`vi.mock("../src/services/ai.service.js", ...)`)
  para não depender de rede nem gastar cota da API real durante o CI.
  Cobre: resposta da IA, empresa padrão quando o slug não vem, pergunta
  vazia (400), empresa inexistente (404), falha da IA (500), corpo
  ausente e rota desconhecida (404 genérico).
- **`env.test.ts`** *(criado nesta sessão)* — testa `src/lib/env.ts`
  diretamente. Mocka `dotenv/config` para não depender do `.env` real e
  cobre os dois cenários de cada valor: variável definida e variável
  ausente (usando o *fallback*).
- **`ai.service.test.ts`** *(criado nesta sessão)* — testa `ai.service.ts`
  mockando o SDK `@google/genai` e o módulo `env.js`. Cobre: erro sem
  `GEMINI_API_KEY`, resposta bem-sucedida com reaproveitamento do client,
  resposta vazia e resposta sem o campo `text`.

### Prisma (`prisma/`) — preparado para o Sprint 2, não usado ainda

- **`schema.prisma`** — modelos `Company`, `Document`, `Chunk`,
  `Conversation` e `Message`. Só `Company` é usado a partir do Sprint 2
  para substituir o `FALLBACK_COMPANIES`; os demais (`Document`, `Chunk`)
  existem para a busca vetorial (RAG) e `Conversation`/`Message` para
  histórico de conversas.
- **`seed.ts`** — script (`npm run seed`) que faz *upsert* das mesmas
  duas empresas do `FALLBACK_COMPANIES` na tabela `Company`, para quando
  o projeto passar a usar banco de verdade.

### Configuração e infraestrutura

- **`package.json`** — scripts (`dev`, `build`, `start`, `test`,
  `test:coverage`, `prisma:generate`, `prisma:migrate`, `seed`) e
  dependências. `type: "module"` deixa o projeto em ESM puro (por isso os
  imports internos usam `.js` mesmo apontando para arquivos `.ts`).
- **`tsconfig.json`** — `target: ES2022`, `module`/`moduleResolution:
  NodeNext` (ESM), `strict: true`. `tests/` fica fora do `include` do
  build de produção.
- **`vitest.config.ts`** — configura o Vitest: só arquivos em
  `tests/**/*.test.ts`, cobertura via provider `v8` sobre `src/**/*.ts`
  (excluindo `server.ts`, que só faz `app.listen`). Tem o *threshold*
  mínimo de cobertura — ver seção 9 para a mudança feita nele.
- **`.env.example`** — modelo das variáveis de ambiente, versionado.
  **`.env`** *(criado nesta sessão, não versionado — está no
  `.gitignore`)* — cópia com a chave real do Gemini preenchida.
- **`Dockerfile`** — build multi-stage: estágio `builder` instala tudo
  (`npm ci`), gera o Prisma Client e compila TS (`npm run build`); estágio
  `runner` instala só dependências de produção (`npm ci --omit=dev`),
  copia o `dist/` já compilado e expõe a porta 3333. Resulta numa imagem
  final sem TypeScript nem devDependencies.
- **`.dockerignore`** — evita copiar `node_modules`, `dist`, `coverage` e
  `.env` (segredo) para dentro da imagem.
- **`Insomnia_Postman.md`** — roteiro de testes manuais (as mesmas
  chamadas que fizemos por `curl` na seção 10), pensado para quem for
  testar pelo Insomnia ou Postman em vez de linha de comando.
- **`../.github/workflows/ci.yml`** — pipeline com três jobs em sequência:
  `qualidade` (instala, gera Prisma Client, compila, roda
  `test:coverage` e publica o relatório como artefato), `docker` (builda a
  imagem, só se `qualidade` passar) e `deploy` (dispara um webhook de
  deploy no Render, só na branch `main` e só se os dois anteriores
  passarem). Isso explica por que o threshold de cobertura importa: se
  cair abaixo do mínimo, o job `qualidade` falha e trava o pipeline antes
  de chegar no deploy.

## 3. Pré-requisitos verificados

```bash
node --version
# v22.20.0
```

O projeto exige Node 22+ (ESM puro, `type: "module"` no `package.json`, sem
transpilação de módulos). A versão instalada atende ao requisito.

## 4. Instalação de dependências

```bash
cd backend
npm install
```

Resultado: 302 pacotes instalados sem erro de build. O `npm audit` apontou
10 vulnerabilidades (3 moderadas, 5 altas, 2 críticas) em dependências
transitivas — nenhuma delas impede a execução do projeto, mas é um ponto
válido para citar numa avaliação de qualidade ("dívida técnica conhecida,
não bloqueante").

## 5. Variáveis de ambiente

```bash
cp .env.example .env
```

| Variável | Valor usado | Observação |
|---|---|---|
| `GEMINI_API_KEY` | fornecida pelo usuário | não versionada, fica só em `.env` |
| `GEMINI_MODEL` | `gemini-flash-latest` | alterado — ver seção 8 |
| `PORT` | `3333` | valor padrão do `.env.example` |
| `DATABASE_URL` | vazio | opcional no Sprint 1 (ver seção 6) |
| `JWT_SECRET` | vazio | só usado a partir do Sprint 3 |

## 6. Por que não precisou de banco de dados

O `README.md` cita PostgreSQL + Prisma na stack, mas no Sprint 1 as empresas
vêm de um array fixo em memória:

`src/services/company.service.ts`
```ts
export const FALLBACK_COMPANIES: Company[] = [ /* technova, clinica-sorriso */ ];

export function listCompanies(): Company[] {
  return FALLBACK_COMPANIES;
}
```

O comentário no próprio arquivo confirma: *"A partir do Sprint 2 a fonte
oficial passa a ser a tabela Company."* Por isso `DATABASE_URL` vazio não
impede a API de subir — o Prisma só entra em cena a partir do Sprint 2 (o
schema já existe em `prisma/schema.prisma`, ver seção 2).

## 7. Checagem de tipos e testes (primeira rodada)

```bash
npx tsc --noEmit
```
Sem saída — 0 erros de compilação. Nenhuma correção foi necessária.

```bash
npm run test:coverage
```

Resultado nessa primeira rodada:
- 3 arquivos de teste, **20/20 testes passando**
- Cobertura: **80% statements/lines, 90.9% branches, 77.77% funcs**
- Threshold configurado em `vitest.config.ts` era 50% em todas as
  métricas — a cobertura real já ficava acima dele

O `stderr` com `[erro nao tratado] Error: timeout` que aparece durante a
suíte é esperado: é o teste `retorna 500 quando a IA falha`, que simula uma
falha da IA de propósito e verifica se o `error.middleware.ts` loga e
responde 500 corretamente.

`src/lib/env.ts` e `src/services/ai.service.ts` apareciam com 0% de
cobertura nessa rodada porque nenhum teste os importava de verdade — o
único consumidor de ambos (`chat.routes.test.ts`) mockava `ai.service.ts`
inteiro, então nem ele nem o `env.ts` que ele importa chegavam a executar.
Isso foi corrigido na seção 9.

## 8. Bug encontrado e corrigido: modelo Gemini descontinuado

### Sintoma
Primeira chamada a `POST /api/chat` retornou `500 Erro interno do servidor`.

### Investigação (causa raiz, não sintoma)
O middleware de erro (`error.middleware.ts`) loga qualquer erro não tratado
com `console.error` antes de responder 500. O log do servidor mostrou:

```
ApiError: {"error":{"code":404,"message":"This model models/gemini-2.5-flash
is no longer available to new users. Please update your code to use a newer
model...","status":"NOT_FOUND"}}
```

O `.env.example` do esqueleto do projeto define `GEMINI_MODEL=gemini-2.5-flash`
como padrão, mas a Google descontinuou esse modelo para chaves de API novas
(mesmo ele ainda aparecendo em `ListModels`).

### Verificação empírica (sem adivinhar)
Consultei a própria API do Gemini com a chave do usuário:

```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
```

E testei candidatos reais contra o endpoint `generateContent`:

| Modelo testado | Resultado |
|---|---|
| `gemini-flash-latest` | ✅ respondeu normalmente |
| `gemini-2.0-flash` | ❌ 403 `PERMISSION_DENIED` |
| `gemini-3-flash-preview` | ✅ respondeu, mas é *preview* |

### Correção aplicada
`backend/.env` (arquivo local, não versionado):
```diff
- GEMINI_MODEL=gemini-2.5-flash
+ GEMINI_MODEL=gemini-flash-latest
```

`gemini-flash-latest` é o alias oficial mantido pela Google que sempre
aponta para o modelo flash vigente — evita que o projeto quebre de novo
quando a Google aposentar a próxima versão numerada.

**Nota:** `.env.example` e o `README.md` da raiz ainda citam
`gemini-2.5-flash` como padrão. Isso não foi alterado porque a correção foi
feita apenas no `.env` local (fora do controle de versão); se quiser
propagar a correção para quem clonar o repositório depois, é preciso
atualizar esses dois arquivos também.

## 9. Cobertura elevada para 100%

Pedido posterior: subir a cobertura real (não só o threshold) para 100% em
todas as métricas. Passos:

1. **`tests/env.test.ts`** (novo) — cobre `src/lib/env.ts` de verdade,
   mockando `dotenv/config` para controlar `process.env` sem depender do
   `.env` real, testando cada variável com e sem valor definido.
2. **`tests/ai.service.test.ts`** (novo) — cobre `src/services/ai.service.ts`
   de verdade, mockando o SDK `@google/genai` e o módulo `env.js`. Casos:
   erro sem `GEMINI_API_KEY`, resposta bem-sucedida (com verificação de
   que o client é reaproveitado entre chamadas, por causa do `??=` no
   código), resposta vazia e resposta sem campo `text`.
3. **`tests/chat.routes.test.ts`** — teste novo para `POST /api/chat`
   sem corpo na requisição.
4. **`src/routes/chat.routes.ts`** — o teste do item 3 revelou um branch
   que não fechava: `const { ... } = req.body ?? {}`. Investigando,
   confirmei com um script isolado que `express.json()` (registrado em
   `app.ts` antes das rotas) **sempre** inicializa `req.body` como objeto,
   mesmo em requisições sem corpo — então o lado direito do `??` é
   inalcançável na aplicação real. Em vez de forçar um teste artificial
   que bypassasse o Express só para cobrir esse branch, removi o código
   morto:
   ```diff
   - const { companySlug = "technova", question: rawQuestion } = req.body ?? {};
   + const { companySlug = "technova", question: rawQuestion } = req.body;
   ```
5. **`vitest.config.ts`** — threshold subido de 50% para 100% em
   `lines`, `functions`, `branches` e `statements`, já com a cobertura
   real sustentando o valor.

Resultado final (`npm run test:coverage`, exit code 0):

```
Test Files  5 passed (5)
     Tests  27 passed (27)

 % Coverage report from v8
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |     100 |      100 |     100 |     100 |
-------------------|---------|----------|---------|---------|
```

## 10. Validação das rotas (chamadas reais, com o servidor rodando)

```bash
npm run dev
# API rodando em http://localhost:3333
```

### GET /api/health
```bash
curl -s http://localhost:3333/api/health
```
```json
{"status":"ok","uptime":6,"timestamp":"2026-07-25T16:36:58.872Z"}
```
`HTTP 200`

### GET /api/companies
```bash
curl -s http://localhost:3333/api/companies
```
```json
{"companies":[
  {"slug":"technova","name":"TechNova Eletronicos","primaryColor":"#2563eb"},
  {"slug":"clinica-sorriso","name":"Clinica Sorriso","primaryColor":"#0d9488"}
]}
```
`HTTP 200` — o campo `persona` **não** é exposto, porque
`company.routes.ts` faz destructuring explícito de só `slug`, `name` e
`primaryColor` antes de responder.

### POST /api/chat — TechNova (persona "loja de eletrônicos, objetiva")
```bash
curl -X POST http://localhost:3333/api/chat \
  -H "Content-Type: application/json" \
  -d '{"companySlug":"technova","question":"Voces entregam em Curitiba?"}'
```
```json
{
  "company": "technova",
  "question": "Voces entregam em Curitiba?",
  "answer": "Olá! Seja bem-vindo à TechNova Eletrônicos.\n\nNo momento, não tenho a informação exata sobre a disponibilidade de entregas para a região de Curitiba em meu sistema.\n\nPara que você tenha uma resposta precisa sobre fretes e prazos, posso encaminhar a sua conversa para um de nossos atendentes humanos. Você gostaria que eu faça esse direcionamento agora?",
  "createdAt": "2026-07-25T16:39:23.243Z"
}
```
`HTTP 200`. Observação relevante: a IA não inventou um prazo de entrega,
respeitando o guardrail *"Nunca invente precos, prazos, enderecos ou
politicas da empresa"* definido em `prompt.service.ts`.

### POST /api/chat — Clínica Sorriso (persona "clínica, acolhedora")
```bash
curl -X POST http://localhost:3333/api/chat \
  -H "Content-Type: application/json" \
  -d '{"companySlug":"clinica-sorriso","question":"Voces atendem convenio?"}'
```
```json
{
  "company": "clinica-sorriso",
  "question": "Voces atendem convenio?",
  "answer": "Olá! Seja muito bem-vindo(a) à Clínica Sorriso! 😊\n\nNo momento, eu não tenho a lista atualizada de todos os convênios que aceitamos por aqui.\n\nPara que eu não te passe nenhuma informação incorreta, posso encaminhar a sua conversa para um de nossos atendentes humanos? Eles poderão verificar se atendemos o seu plano específico e tirar todas as suas dúvidas!\n\nSe quiser, já me informe qual é o seu convênio para eu deixar registrado para a nossa equipe.",
  "createdAt": "2026-07-25T16:39:57.832Z"
}
```
`HTTP 200`. Tom claramente diferente do da TechNova (mais acolhedor, usa
emoji), provando que a persona por empresa funciona de fato — não é um
prompt genérico.

**Nota sobre uma falha intermitente:** na primeira tentativa dessa chamada,
a API respondeu `403 SERVICE_DISABLED` ("Gemini API has not been used in
project ... or it is disabled ... wait a few minutes and retry"). Repeti a
chamada duas vezes em seguida e ambas funcionaram normalmente — a própria
mensagem de erro já indicava que era um problema de propagação do lado da
Google, não um bug no código. Não foi necessária nenhuma correção.

### Casos de erro

Pergunta vazia:
```bash
curl -X POST http://localhost:3333/api/chat \
  -H "Content-Type: application/json" \
  -d '{"companySlug":"technova","question":""}'
```
```json
{"error":"A pergunta nao pode estar vazia."}
```
`HTTP 400`

Empresa inexistente:
```bash
curl -X POST http://localhost:3333/api/chat \
  -H "Content-Type: application/json" \
  -d '{"companySlug":"empresa-fantasma","question":"Voces existem?"}'
```
```json
{"error":"Empresa \"empresa-fantasma\" nao encontrada."}
```
`HTTP 404`

Ambos os erros são lançados como `HttpError` nas rotas (`chat.routes.ts`) e
tratados de forma centralizada pelo `error.middleware.ts`, que devolve
`{ error: mensagem }` com o status correto.

## 11. Passo a passo para testar no Postman

Alternativa às chamadas por `curl` da seção 10, para quem preferir a
interface do Postman na apresentação. Pressupõe o servidor rodando
(`npm run dev`, seção 10).

### 11.1 Criar o ambiente (Environment)

1. No Postman, clique no ícone de engrenagem (⚙️) no canto superior
   direito → **Environments** → **+**.
2. Nomeie como `Assistente IA - Local`.
3. Adicione uma variável:
   - **Variable**: `baseUrl`
   - **Initial value** e **Current value**: `http://localhost:3333`
4. Salve e selecione esse environment no seletor no canto superior direito
   (para poder usar `{{baseUrl}}` nas requisições).

### 11.2 Criar a Collection

1. **Collections** (menu lateral) → **+** → nomeie `Assistente IA
   Multiempresa`.
2. Todas as requisições abaixo vão dentro dela (botão **Add request**
   ou **Save** direto na collection ao criar cada uma).

### 11.3 Request 1 — Health check

1. **New request** → método `GET` → URL `{{baseUrl}}/api/health`.
2. Não precisa de headers nem body. Clique **Send**.
3. **Esperado**: status `200 OK`, corpo:
   ```json
   { "status": "ok", "uptime": <número>, "timestamp": "<ISO date>" }
   ```

### 11.4 Request 2 — Listar empresas

1. **New request** → `GET` → `{{baseUrl}}/api/companies`.
2. **Send**.
3. **Esperado**: status `200 OK`, corpo com as duas empresas
   (`technova`, `clinica-sorriso`), cada uma só com `slug`, `name` e
   `primaryColor`. Confirme visualmente que **não** existe o campo
   `persona` na resposta — é o ponto que prova que a rota filtra dados
   internos antes de responder.

### 11.5 Request 3 — Chat com a TechNova

1. **New request** → método `POST` → `{{baseUrl}}/api/chat`.
2. Aba **Headers**: adicione `Content-Type: application/json` (o Postman
   costuma preencher isso sozinho ao escolher o tipo de body no passo 3).
3. Aba **Body** → selecione **raw** → tipo **JSON** → cole:
   ```json
   {
     "companySlug": "technova",
     "question": "Voces entregam em Curitiba?"
   }
   ```
4. **Send**.
5. **Esperado**: status `200 OK`, corpo com `company: "technova"` e um
   `answer` gerado pela IA no tom objetivo da loja de eletrônicos, sem
   inventar prazo de entrega.

### 11.6 Request 4 — Chat com a Clínica Sorriso (mesma rota, persona diferente)

1. Duplique a Request 3 (botão direito → **Duplicate**) ou crie uma nova
   igual, mudando só o body:
   ```json
   {
     "companySlug": "clinica-sorriso",
     "question": "Voces atendem convenio?"
   }
   ```
2. **Send**.
3. **Esperado**: status `200 OK`, `company: "clinica-sorriso"` e um
   `answer` com tom acolhedor, claramente diferente do tom da Request 3 —
   essa comparação lado a lado é o jeito mais direto de mostrar que a
   persona muda por empresa sem alterar código.

### 11.7 Request 5 — Erro: pergunta vazia (400)

1. Duplique a Request 3, troque o body para:
   ```json
   { "companySlug": "technova", "question": "" }
   ```
2. **Send**.
3. **Esperado**: status `400 Bad Request`, corpo
   `{ "error": "A pergunta nao pode estar vazia." }`.

### 11.8 Request 6 — Erro: empresa inexistente (404)

1. Duplique a Request 3, troque o body para:
   ```json
   { "companySlug": "empresa-fantasma", "question": "Voces existem?" }
   ```
2. **Send**.
3. **Esperado**: status `404 Not Found`, corpo
   `{ "error": "Empresa \"empresa-fantasma\" nao encontrada." }`.

### 11.9 Dica para a apresentação

Salve as seis requisições na collection e monte um **Runner** (botão
direito na collection → **Run collection**) para disparar todas em
sequência durante a demonstração, em vez de clicar uma a uma. O arquivo
`Insomnia_Postman.md` (raiz do `backend/`) tem o mesmo roteiro em formato
resumido, útil como cola rápida durante a defesa.

## 12. O que não foi feito (fora do escopo desta rodada)

- Nenhum commit foi criado — todas as mudanças (`.env` criado,
  `GEMINI_MODEL` ajustado, testes novos, `chat.routes.ts` simplificado,
  threshold subido) ficam locais até validação/aprovação.
- `.env.example` e `README.md` não foram atualizados com o novo valor de
  `GEMINI_MODEL` — ficou como sugestão em aberto (seção 8).
- Frontend, RAG (Sprint 2) e autenticação JWT (Sprint 3) estão fora do
  escopo desta validação, conforme o roadmap do `README.md`.
