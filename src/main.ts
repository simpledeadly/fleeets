// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/css/styles.css'
import App from './App.vue'
import posthog from 'posthog-js'

const app = createApp(App)
const pinia = createPinia()

posthog.init('phc_rKnQJUs0QQJY0zyRobbossNMek0QqtGtRQyhrEQ5WzU', {
  api_host: window.location.origin + '/api/telemetry', // Или "https://us.i.posthog.com", смотри что дадут
  person_profiles: 'identified_only', // Экономит деньги на бесплатном тарифе
  capture_pageview: true, // Мы включим это вручную через роутер (см. ниже), так точнее для SPA
})

app.use(pinia)
app.mount('#app')
