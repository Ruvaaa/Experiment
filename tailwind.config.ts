import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pink: {
          DEFAULT: '#E879A0',
          hover: '#D5447A',
          light: '#FDF2F6',
          muted: '#F9E8EF',
        },
        neutral: {
          950: '#0F0F0F',
        },
        page: '#FAFAF9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        lg: '10px',
      },
    },
  },
  plugins: [],
} satisfies Config
