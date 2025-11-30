/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Raleway', 'sans-serif'],
      },
      colors: {
        bg: '#09090b', // Глубокий черный
        surface: '#18181b', // Чуть светлее
        dim: '#71717a', // Серый текст

        // Возвращаем базу, если она пропала
        white: '#ffffff',
        black: '#000000',
        transparent: 'transparent',
      },
    },
  },
  plugins: [],
}
