import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  secondary: "border border-slate-300 text-slate-700 hover:bg-slate-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

/** Classes visuais do Button, reutilizadas por links estilizados como botao (ex: Link "Nova empresa") para evitar aninhar <button> dentro de <a>. */
export function buttonClassName(variant: Variant = "primary", className = ""): string {
  return `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", type, ...props }: ButtonProps) {
  return (
    <button type={type ?? "button"} className={buttonClassName(variant, className)} {...props} />
  );
}
