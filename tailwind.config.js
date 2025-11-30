/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        glass: 'rgba(30, 30, 30, 0.6)',
        glassBorder: 'rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: [],
}
