"use client";

import { forwardRef } from "react";
import { getReadableTextColor } from "@/lib/contrastColor";

interface LauncherProps {
  companyName: string;
  primaryColor: string;
  logoUrl?: string;
  onClick: () => void;
}

export const Launcher = forwardRef<HTMLButtonElement, LauncherProps>(function Launcher(
  { companyName, primaryColor, logoUrl, onClick },
  ref,
) {
  const textColor = getReadableTextColor(primaryColor);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label="Abrir chat"
      style={{ backgroundColor: primaryColor, color: textColor }}
      className="fixed bottom-0 right-0 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full shadow-lg"
    >
      {logoUrl ? (
        // next/image exigiria configurar remotePatterns pra dominios de logo que
        // ainda nao se conhece (cada empresa podera hospedar o proprio SVG).
        // Tamanho fixo (nao h-full/w-full): o iframe host anima seu proprio
        // tamanho ao abrir/fechar, e um launcher que preenche 100% do box
        // acompanharia essa animacao, fazendo a logo "inchar" antes de encolher.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={companyName} className="h-full w-full object-contain p-1.5" />
      ) : (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 4h16v12H7l-3 3V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
});
