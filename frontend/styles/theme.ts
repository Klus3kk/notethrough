export const palette = {
  background: "hsl(240 15% 8%)",
  foreground: "hsl(210 20% 96%)",
  accents: {
    lime: "hsl(140 70% 60%)",
    amber: "hsl(35 90% 62%)",
    violet: "hsl(260 80% 65%)"
  }
} as const;

export const radii = {
  card: "1.25rem",
  pill: "999px"
} as const;

export const shadows = {
  card: "0 25px 60px rgba(10, 10, 35, 0.65)",
  glow: "0 0 40px rgba(127, 196, 255, 0.25)"
} as const;
