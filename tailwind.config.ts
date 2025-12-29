import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}', // Не забудь добавить features, если их нет!
  ],
  prefix: '',
  theme: {
    // ... твои настройки темы ...
  },
  plugins: [typography],
  future: {
    hoverOnlyWhenSupported: true,
  },
} satisfies Config

export default config
