const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function expandShorthand(hex: string): string {
  return hex.length === 3
    ? hex
        .split("")
        .map((c) => c + c)
        .join("")
    : hex;
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const normalized = expandShorthand(hex.replace("#", ""));
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** Retorna a cor de texto (preto ou branco) legivel sobre um fundo hex, seguindo a formula de luminancia do WCAG. */
export function getReadableTextColor(hex: string): "#000000" | "#ffffff" {
  if (!HEX_PATTERN.test(hex)) {
    throw new Error(`Cor hex invalida: "${hex}".`);
  }
  return relativeLuminance(hex) > 0.179 ? "#000000" : "#ffffff";
}
