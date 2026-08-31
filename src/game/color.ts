const FALLBACK_RGB = "0,238,255";
const HEX_COLOR = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

/**
 * Converts a six-digit CSS hex color into the RGB channel string used by
 * `rgba()`. Invalid input returns a safe cyan fallback, preventing malformed
 * or injectable CSS values.
 */
export function hexToRgb(hex: string): string {
  const match = HEX_COLOR.exec(hex);
  return match
    ? `${Number.parseInt(match[1], 16)},${Number.parseInt(match[2], 16)},${Number.parseInt(match[3], 16)}`
    : FALLBACK_RGB;
}
