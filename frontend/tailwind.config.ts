import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(240 15% 8%)",
        foreground: "hsl(210 20% 96%)",
        card: "hsla(240, 18%, 12%, 0.85)",
        cardForeground: "hsl(210 20% 96%)",
        muted: "hsla(240, 12%, 20%, 0.6)",
        accent: {
          100: "hsl(140 70% 60%)",
          200: "hsl(35 90% 62%)",
          300: "hsl(260 80% 65%)"
        }
      },
      borderRadius: {
        xl: "1.25rem"
      },
      boxShadow: {
        glow: "0 0 40px rgba(140, 220, 165, 0.25)",
        card: "0 25px 60px rgba(10, 10, 35, 0.65)"
      },
      backgroundImage: {
        "dashboard-grid": "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)"
      }
    }
  },
  plugins: [animate]
};

export default config;
