// Layout minimo: esta rota so e visitada dentro do <iframe> do widget, entao
// nao tem chrome de site (nav, footer etc). Ver GUARDA-CORPO em next.config.ts
// sobre nao adicionar headers que impecam o framing cross-origin aqui.
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
