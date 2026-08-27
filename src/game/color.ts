const FALLBACK_RGB = "0,238,255";
const HEX_COLOR = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

/**
 * Converts a trusted six-digit CSS hex color to the comma-separated channel
 * form used by rgba(). Invalid input falls back to the game's cyan accent so
 * it can never produce an injectable or malformed style value.
 */
export function hexToRgb(hex: string): string {
  const match = HEX_COLOR.exec(hex);
  return match
    ? `${Number.parseInt(match[1], 16)},${Number.parseInt(match[2], 16)},${Number.parseInt(match[3], 16)}`
    : FALLBACK_RGB;
}
