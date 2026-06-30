/**
 * Generate a consistent, visually distinct color for each client.
 * Uses a curated HSL palette that works well in both light and dark UI.
 */

const PALETTE = [
  { h: 210, s: 85, l: 55 }, // blue
  { h: 340, s: 82, l: 55 }, // pink
  { h: 160, s: 80, l: 45 }, // green
  { h: 30,  s: 90, l: 55 }, // orange
  { h: 270, s: 75, l: 60 }, // purple
  { h: 190, s: 90, l: 45 }, // cyan
  { h: 10,  s: 85, l: 55 }, // red-orange
  { h: 50,  s: 90, l: 50 }, // yellow
  { h: 320, s: 70, l: 55 }, // magenta
  { h: 140, s: 75, l: 45 }, // emerald
  { h: 260, s: 80, l: 60 }, // violet
  { h: 20,  s: 90, l: 55 }, // amber
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export interface ClientColor {
  hsl: string;
  hex: string;
  bg: string;
  bgHover: string;
  border: string;
  text: string;
  textDark: string;
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => {
    const c = lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function buildColor(h: number, s: number, l: number): ClientColor {
  return {
    hsl: `${h} ${s}% ${l}%`,
    bg: `hsl(${h} ${s}% ${l}% / 0.18)`,
    bgHover: `hsl(${h} ${s}% ${l}% / 0.30)`,
    border: `hsl(${h} ${s}% ${l}% / 0.55)`,
    text: `hsl(${h} ${s}% ${Math.max(l - 15, 20)}%)`,
    textDark: `hsl(${h} ${s}% ${Math.max(l - 25, 15)}%)`,
  };
}

export function getClientColor(clientId: string | null | undefined, override?: string | null): ClientColor {
  if (override) {
    const hsl = hexToHsl(override);
    if (hsl) return buildColor(hsl.h, hsl.s, hsl.l);
  }

  if (!clientId) {
    return {
      hsl: "220 10% 60%",
      bg: "hsl(220 10% 60% / 0.18)",
      bgHover: "hsl(220 10% 60% / 0.28)",
      border: "hsl(220 10% 60% / 0.50)",
      text: "hsl(220 10% 40%)",
      textDark: "hsl(220 10% 30%)",
    };
  }

  const idx = hashString(clientId) % PALETTE.length;
  const { h, s, l } = PALETTE[idx];
  return buildColor(h, s, l);
}
