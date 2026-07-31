# Front-end — Widget de chat + Painel admin

Next.js 15 + React 19 + Tailwind. Um único projeto, dois pedaços independentes:

- **Widget de chat** — qualquer empresa cadastrada embute no próprio site com um
  `<script>` no `<head>`.
- **Painel admin** (`/admin/*`) — login do administrador único, cadastro/edição de
  empresa (persona, cor, logo) e upload/gestão dos documentos que alimentam o RAG.

Os dois só compartilham a API do backend — o bundle JS de cada um é separado (o
Next.js faz code-splitting por rota, e o `widget.js` é um artefato de build à parte,
ver abaixo).

## Como funciona

### Widget

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

O `widget.js` é escrito em TypeScript (`src/widget/`) e compilado para um IIFE sem
dependências via esbuild — o site cliente não precisa de nenhum passo de build, só
colar a tag `<script>`.

A conversa (histórico de mensagens) fica só em estado de React enquanto o painel
estiver aberto; ao fechar, reseta. Cada pergunta envia o histórico da troca atual pro
backend (`POST /api/chat` aceita `history`), que usa isso pra manter contexto
multi-turno na conversa com a IA.

### Painel admin

```
/admin/login              — publica, formulario email+senha
/admin                    — lista de empresas (protegida)
/admin/companies/new      — criar empresa (protegida)
/admin/companies/[slug]   — editar empresa + documentos (protegida)
```

Login chama `POST /api/admin/login` e guarda o JWT retornado em `sessionStorage`
(sobrevive a F5 na mesma aba, some ao fechar a aba). As rotas protegidas ficam sob o
route group `(protected)`, cujo `layout.tsx` roda no cliente: checa o token ao montar
e redireciona pra `/admin/login` se não houver um. Toda chamada de API que responde
`401` (token ausente/expirado) também limpa a sessão e redireciona — não depende só do
guard inicial.

## Rodando localmente

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_BASE_URL apontando pro backend
npm install
npm run dev                  # http://localhost:3000
```

O backend precisa estar rodando (veja `../backend/README.md` / `../README.md`), por
padrão em `http://localhost:3333`. Para usar o painel admin, o backend também precisa
ter `ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH`/`JWT_SECRET` configurados no `backend/.env`
(veja o comentário lá pra gerar o hash da senha).

## Como testar

**Suite automatizada** (Vitest + React Testing Library, sem rede real — tudo mocka
`fetch`/`next/navigation`):

```bash
npm test              # roda toda a suite (widget + admin)
npm run test:watch    # modo watch
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint (regras do Next)
npm run build          # build de producao + public/widget.js
```

**Widget, manualmente** — veja a seção seguinte (`demo.html`).

**Painel admin, manualmente** — com o backend rodando e as env vars de admin
configuradas:

1. `npm run dev`, abra `http://localhost:3000/admin` → sem login, redireciona pra
   `/admin/login`.
2. Entre com o email/senha do `backend/.env` (`ADMIN_EMAIL` + a senha em texto puro
   que gerou o `ADMIN_PASSWORD_HASH`). Senha errada → mensagem de erro, sem sair da
   tela.
3. Login certo → vai pra `/admin`, mostra as empresas já cadastradas.
4. "Nova empresa" → preenche slug/nome/persona/cor (validado com Zod antes de
   enviar) → volta pra lista com a empresa nova.
5. "Editar" numa empresa → muda persona/cor, salva → "Salvo com sucesso." aparece.
6. Na mesma tela de edição, envie um `.md`/`.pdf`/`.txt` pequeno na seção
   Documentos → aparece na tabela com status `ready`. Pergunte algo respondível por
   esse documento em `/embed/<slug>` (ou via `POST /api/chat`) pra confirmar que o
   RAG usou o contexto enviado.
7. Remova o documento → some da tabela (pede confirmação antes).
8. F5 na página → continua logado (token em `sessionStorage`). Feche a aba e abra
   `/admin` de novo → pede login (a sessão não sobrevive entre abas/fechamento).

## Testando o widget num site

```bash
npm run build   # gera public/widget.js e o build do Next
npm run dev      # ou npm start apos o build
```

Abra `http://localhost:3000/demo.html` — é uma página estática simulando o site de um
cliente com o widget já embutido, útil pra validar visualmente abertura/fechamento,
redimensionamento do iframe e troca de empresa (edite o atributo `data-company` do
`<script>` no arquivo).

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
    embed/[companySlug]/          # pagina do widget, renderizada dentro do iframe
    admin/
      login/page.tsx              # login do admin (rota publica)
      (protected)/layout.tsx      # AuthGuard client-side + nav (Empresas | Sair)
      (protected)/page.tsx        # lista de empresas
      (protected)/companies/new/page.tsx        # criar empresa
      (protected)/companies/[slug]/page.tsx     # editar empresa + documentos
  components/
    chat/          # ChatWidget, Launcher, ChatPanel, MessageList, Composer...
    admin/         # CompanyForm (create/edit, validacao com Zod), DocumentManager
  hooks/
    useChatSession.ts       # estado da conversa (mensagens, envio, erro, retry)
    usePostMessageBridge.ts # comunicacao com o script pai (widget.js)
  lib/
    api.ts          # cliente HTTP publico (widget): /api/companies, /api/chat
    adminAuth.ts     # token do admin em sessionStorage (get/set/clear/isAuthenticated)
    adminApi.ts      # cliente HTTP do painel admin (/api/admin/*), trata 401 global
    contrastColor.ts # cor de texto legivel sobre a cor da empresa (WCAG)
  widget/
    logic.ts    # funcoes puras usadas pelo loader (testadas)
    index.ts    # bootstrap do loader (efeito no DOM), compilado pro public/widget.js
public/
  widget.js   # SAIDA DE BUILD - nao editar a mao, vem de src/widget/
  demo.html   # harness manual pra testar o widget embutido
tests/
  espelha a estrutura de src/ (tests/lib, tests/hooks, tests/widget, tests/components,
  tests/components/admin, tests/app/admin)
```

## Fora de escopo (por enquanto)

- Múltiplos administradores / contas de usuário (só o admin único via env vars).
- Cobrança/pagamento.
- Upload de imagem de logo (só URL externa).
- Edição de conteúdo de um documento já enviado (só enviar/listar/remover).
- Persistência de conversa do widget além da aba aberta no navegador.
