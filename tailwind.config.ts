import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chrome: {
          50: '#f5f7fb',
          100: '#d9e0ea',
          200: '#a7b3c4',
          300: '#73839a',
          400: '#526175',
          500: '#3a4556',
          600: '#242c38',
          700: '#1b212b',
          800: '#131820',
          900: '#0c1016',
        },
      },
      boxShadow: {
        panel: '0 20px 60px rgba(0, 0, 0, 0.28)',
        insetGlass: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      backdropBlur: {
        xl: '24px',
      },
      fontFamily: {
        sans: ['SF Pro Display', 'SF Pro Text', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
