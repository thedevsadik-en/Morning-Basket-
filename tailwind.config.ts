import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        serif: ["var(--font-playfair)", "serif"],
      },
      colors: {
        background: "var(--background, #F6F1E4)",
        foreground: "var(--foreground, #23301B)",
        primary: {
          DEFAULT: "var(--primary, #2C5F2D)",
          foreground: "var(--primary-foreground, #FFFFFF)",
        },
        accent: {
          green: "#4A7C2D", // Leaf green
          brown: "#6B4423", // Soil brown
        },
        cta: "#C1502E", // Terracotta
      },
    },
  },
  plugins: [],
};

export default config;
