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
        sans: ["var(--font-sans)", "var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-serif)", "var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
      },
      colors: {
        background: "var(--background, #F8F6F0)",
        foreground: "var(--foreground, #2C332D)",
        primary: {
          DEFAULT: "var(--primary, #1E3324)",
          foreground: "var(--primary-foreground, #F8F6F0)",
        },
        heritage: {
          cream: "#F8F6F0",
          creamMuted: "#F0EDE6",
          forest: "#1E3324",
          forestDark: "#142419",
          moss: "#2D4A35",
          charcoal: "#2C332D",
          slateOlive: "#5A6E5F",
          grayGreen: "#4A5D4E",
          border: "#EAE6DF",
          borderSoft: "#E8E4DC",
          borderLight: "#E2DED6",
        },
      },
      transitionDuration: {
        "400": "400ms",
      },
    },
  },
  plugins: [],
};

export default config;
