/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hydrogen: {
          DEFAULT: '#4ade80', // Green 400
          glow: '#22c55e',
        },
        ocean: {
          DEFAULT: '#0ea5e9', // Sky 500
          deep: '#0f172a', // Slate 900
          surface: '#1e293b', // Slate 800
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
