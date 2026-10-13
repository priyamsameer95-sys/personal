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
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        serif: ["Newsreader", "Georgia", "serif"],
      },
      colors: {
        bg: "var(--paper)",
        text: "var(--ink)",
        muted: "var(--ink)",
        body: "var(--ink)",
        border: "var(--rule)",
        system: {
          bg: 'var(--paper)',
          surface: 'var(--paper-soft)',
          primary: 'var(--ink)',
          secondary: 'var(--muted)',
          tertiary: 'var(--muted)',
          outline: 'var(--rule)',
          accent: 'var(--ink)',
        }
      },
      boxShadow: {
        'material-soft': '0 2px 8px -2px rgba(0, 0, 0, 0.04), 0 8px 24px -4px rgba(0, 0, 0, 0.02)',
        'material-hover': '0 4px 12px -2px rgba(0, 0, 0, 0.06), 0 12px 32px -4px rgba(0, 0, 0, 0.04)',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.2, 0, 0, 1) forwards',
      }
    },
  },
  plugins: [],
};
export default config;
