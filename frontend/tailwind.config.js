/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: 'var(--color-brand)',
          600: 'var(--color-brand-hover)',
          700: 'var(--color-brand-dark)',
        },
        dark: {
          950: 'var(--bg-main)', // main bg
          900: 'var(--bg-sidebar)', // secondary bg
          850: 'var(--border-color)', // borders / outlines
          800: 'var(--bg-card)', // card / sidebar
          700: 'var(--border-color)', // borders / dividers
          600: 'var(--border-hover)',
          200: 'var(--text-main)', // text
          400: 'var(--text-muted)', // text-muted
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Lora', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
