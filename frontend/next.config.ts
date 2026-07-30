import type { NextConfig } from "next";

// GUARDA-CORPO: a rota /embed e renderizada dentro de um <iframe> em sites de
// terceiros. Next.js nao seta X-Frame-Options nem uma CSP restritiva por
// padrao, entao nenhuma acao e necessaria hoje - mas se uma CSP global for
// adicionada aqui no futuro, ela precisa excluir "/embed/:path*" (ou incluir
// "frame-ancestors *" para essa rota), senao o widget para de funcionar em
// qualquer site que nao seja este.
const nextConfig: NextConfig = {};

export default nextConfig;
