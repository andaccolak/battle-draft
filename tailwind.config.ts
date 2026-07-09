import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rarity: {
          common: "#9ca3af",
          uncommon: "#4ade80",
          rare: "#60a5fa",
          epic: "#c084fc",
          legendary: "#fb923c"
        }
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-5px)" },
          "80%": { transform: "translateX(5px)" }
        },
        floatUp: {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-60px)", opacity: "0" }
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 12px 2px rgba(251,146,60,0.5)" },
          "50%": { boxShadow: "0 0 28px 8px rgba(251,146,60,0.9)" }
        }
      },
      animation: {
        shake: "shake 0.4s ease-in-out",
        floatUp: "floatUp 1s ease-out forwards",
        pulseGlow: "pulseGlow 1.6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
