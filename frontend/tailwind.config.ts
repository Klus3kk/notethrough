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
        background: "#0b111d",
        foreground: "#f7f9fd",
        surface: "#162033",
        glow: "#213149",
        accent: {
          coral: "#ff8a5c",
          lime: "#a0f075",
          teal: "#4dd6d0"
        }
      },
      boxShadow: {
        panel: "0 40px 90px rgba(7, 10, 18, 0.65)"
      },
      backgroundImage: {
        aurora:
          "radial-gradient(circle at 20% 20%, rgba(73, 201, 188, 0.3), transparent 45%), radial-gradient(circle at 80% 0%, rgba(255, 138, 92, 0.25), transparent 40%), linear-gradient(130deg, #0b111d 0%, #11182a 35%, #1b1530 100%)"
      }
    }
  },
  plugins: [animate]
};

export default config;
