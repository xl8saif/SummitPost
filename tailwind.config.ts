import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05080f',
          900: '#070c15',
          850: '#0a1120',
          800: '#0f1829',
          700: '#182640',
          600: '#243753',
        },
        mint: { 300: '#6ee7c8', 400: '#34d399', 500: '#10b981' },
        sky2: { 300: '#7dd3fc', 400: '#38bdf8' },
        amber2: { 300: '#fcd34d', 400: '#fbbf24' },
      },
      fontFamily: {
        sans: ['"Segoe UI Variable Text"', 'Inter', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Segoe UI Variable Display"', '"Segoe UI"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 44px -14px rgba(52, 211, 153, 0.5)',
        card: '0 24px 60px -34px rgba(0, 0, 0, 0.95)',
      },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
      },
      animation: {
        rise: 'rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
