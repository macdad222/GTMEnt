/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Comcast-inspired palette with a sophisticated, consulting-firm feel
        brand: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b9dfff',
          300: '#7cc4ff',
          400: '#36a5ff',
          500: '#0084f4',
          600: '#0066cc',
          700: '#0052a5',
          800: '#004488',
          900: '#003366',
          950: '#001a33',
        },
        accent: {
          50: '#fef7ec',
          100: '#fdecd3',
          200: '#fad5a5',
          300: '#f6b86d',
          400: '#f19432',
          500: '#ec7612',
          600: '#d45a0a',
          700: '#b0400c',
          800: '#8f3311',
          900: '#752c11',
          950: '#401406',
        },
        slate: {
          850: '#172033',
          950: '#0a0f1a',
        },
      },
      fontFamily: {
        sans: ['Söhne', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Neue Haas Grotesk Display', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['Söhne Mono', 'SF Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}

