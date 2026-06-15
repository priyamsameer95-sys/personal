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
        system: {
          bg: '#FAFAFA',       
          surface: '#FFFFFF',  
          primary: '#1A1A1A',  
          secondary: '#525252',
          tertiary: '#8C8C8C', 
          outline: '#E5E5E5',  
          accent: '#0A56D9',   
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
