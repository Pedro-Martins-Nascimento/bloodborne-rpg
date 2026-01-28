/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blood: {
          light: '#ff4d4d',
          DEFAULT: '#8a0b0b',
          dark: '#4a0404',
          glass: 'rgba(138, 11, 11, 0.3)'
        },
        yharnam: {
          dark: '#0a0a0a', // Quase preto
          paper: '#1a1a1a', // Cinza papel velho escuro
          border: '#3d3d3d',
          text: '#a8a29e',
        },
        gold: {
          DEFAULT: '#c5a059', // Dourado envelhecido
          dim: '#856a35',
          glow: '#ffd700'
        }
      },
      fontFamily: {
        gothic: ['"Cinzel"', 'serif'],     // Títulos
        body: ['"EB Garamond"', 'serif'],  // Textos
      },
      backgroundImage: {
        'fog-texture': "url('https://www.transparenttextures.com/patterns/stardust.png')", // Textura leve de ruído
      },
      boxShadow: {
        'red-glow': '0 0 15px rgba(138, 11, 11, 0.5)',
        'gold-glow': '0 0 10px rgba(197, 160, 89, 0.3)',
      }
    },
  },
  plugins: [],
}