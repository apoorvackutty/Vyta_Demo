import type { Config } from 'tailwindcss';
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        plum: { 100: '#F1E6EE', 700: '#56264D', 800: '#431C3C', 900: '#2A1A28' },
        terracotta: { 500: '#C3735A', 700: '#9A4F38' },
        cream: { 100: '#F7F3EC', 200: '#EEE8DC' },
        paper: '#FFFDF9', line: '#DED3CB', muted: '#5E5260',
        ok: { fg: '#2F5D4E', bg: '#DDEBE4' },
        watch: { fg: '#8A5A00', bg: '#F6E7C8' },
        attn: { fg: '#9A4F38', bg: '#F6DDD3' },
        danger: { fg: '#8E1F2B', bg: '#F7D9DC' },
        info: { fg: '#2F5D8A', bg: '#DCE8F3' },
        neutral: { fg: '#5E5260', bg: '#ECE6E2' },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: { card: '0 1px 2px rgba(42,26,40,.06), 0 4px 12px rgba(42,26,40,.06)' },
      borderRadius: { card: '12px', mcard: '20px' },
    },
  },
  plugins: [],
} satisfies Config;
