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
  bg: string;
  bgHover: string;
  border: string;
  text: string;
  textDark: string;
}

export function getClientColor(clientId: string | null | undefined): ClientColor {
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

  return {
    hsl: `${h} ${s}% ${l}%`,
    bg: `hsl(${h} ${s}% ${l}% / 0.18)`,
    bgHover: `hsl(${h} ${s}% ${l}% / 0.30)`,
    border: `hsl(${h} ${s}% ${l}% / 0.55)`,
    text: `hsl(${h} ${s}% ${Math.max(l - 15, 20)}%)`,
    textDark: `hsl(${h} ${s}% ${Math.max(l - 25, 15)}%)`,
  };
}
