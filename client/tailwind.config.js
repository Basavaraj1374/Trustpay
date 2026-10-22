/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#0071e3',
          700: '#0059b5',
          900: '#001b3f',
        },
        'tp-canvas': '#F5F5F7',
        'tp-card': '#FFFFFF',
        'tp-primary': '#0071E3',
        'tp-text': '#1D1D1F',
        'tp-secondary': '#86868B',
        'tp-tertiary': '#A1A1A6',
        'tp-success': '#34C759',
        'tp-warning': '#FF9F0A',
        'tp-danger': '#FF3B30',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
