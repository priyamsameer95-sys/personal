import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["B612", "system-ui", "sans-serif"],
        mono: ["B612 Mono", "ui-monospace", "monospace"],
        serif: ["Newsreader", "Georgia", "serif"],
      },
      colors: {
        bg: "#FAFAFA",
        text: "#1A1A1A",
        muted: "#8C8C8C",
        body: "#525252",
        border: "rgba(229,229,229,0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
