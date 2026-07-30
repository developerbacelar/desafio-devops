# Front-end — Widget de chat embutivel

Next.js 15 + React 19 + Tailwind. Serve o widget de chat que qualquer empresa cadastrada
pode embutir no proprio site com um `<script>` no `<head>`.

## Como funciona

```
Site do cliente
  <script src="https://SEU_DOMINIO/widget.js" data-company="technova"></script>
        │
        ▼
  widget.js cria UM <iframe> fixo (canto inferior direito) apontando pra /embed/technova
        │
        ▼
  /embed/[companySlug] (esta app) renderiza o chat, consome a API do backend
  (GET /api/companies, POST /api/chat) e conversa com o script pai via postMessage
  pra pedir redimensionamento do iframe (botao fechado <-> painel aberto)
```

O `widget.js` e escrito em TypeScript (`src/widget/`) e compilado para um IIFE sem
dependencias via esbuild — o site cliente nao precisa de nenhum passo de build, so
colar a tag `<script>`.

A conversa (historico de mensagens) fica só em estado de React, enquanto o painel
estiver aberto; ao fechar, reseta. Não há persistência em localStorage/banco — isso
faz parte da base de conhecimento (SPRINT2) e do painel admin (Sprint 3), que ainda
não existem.

## Rodando localmente

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_BASE_URL apontando pro backend
npm install
npm run dev                  # http://localhost:3000
```

O backend precisa estar rodando (veja `../backend/README.md` / `../README.md`), por
padrão em `http://localhost:3333`.

## Testando o widget num site

```bash
npm run build   # gera public/widget.js e o build do Next
npm run dev      # ou npm start apos o build
```

Abra `http://localhost:3000/demo.html` — é uma página estática simulando o site de um
cliente (TechNova) com o widget já embutido, útil pra validar visualmente
abertura/fechamento, redimensionamento do iframe e troca de empresa (edite o atributo
`data-company` do `<script>` no arquivo).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o Next.js em modo desenvolvimento |
| `npm run build` | Gera `public/widget.js` (esbuild) e depois o build de produção do Next |
| `npm run build:widget` | Só recompila `public/widget.js` |
| `npm start` | Serve o build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Testes (Vitest + React Testing Library) |
| `npm run test:watch` | Testes em modo watch |

## Estrutura

```
src/
  app/
    embed/[companySlug]/   # pagina renderizada dentro do iframe do widget
  components/chat/         # ChatWidget, Launcher, ChatPanel, MessageList, Composer...
  hooks/
    useChatSession.ts       # estado da conversa (mensagens, envio, erro, retry)
    usePostMessageBridge.ts # comunicacao com o script pai (widget.js)
  lib/
    api.ts                  # cliente HTTP pro backend
    contrastColor.ts        # cor de texto legivel sobre a cor da empresa (WCAG)
  widget/
    logic.ts                 # funcoes puras usadas pelo loader (testadas)
    index.ts                 # bootstrap do loader (efeito no DOM), compilado pro public/widget.js
public/
  widget.js   # SAIDA DE BUILD - nao editar a mao, vem de src/widget/
  demo.html   # harness manual pra testar o widget embutido
```

## Fora de escopo (por enquanto)

- Upload de documentos, banco de dados, embeddings/RAG (`SPRINT2.md`).
- Painel administrativo, login/JWT, cadastro de empresa via UI (Sprint 3).
- Persistência de conversa além da aba aberta no navegador.
