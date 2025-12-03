<script setup lang="ts">
import { FileQuestion } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { supabase } from '../supabase'

// const props = defineProps<{
//   botName: string
// }>()

const emit = defineEmits(['login'])

onMounted(() => {
  // Создаем скрипт виджета Telegram динамически
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://telegram.org/js/telegram-widget.js?22'

  // Настройки виджета
  script.setAttribute('data-telegram-login', 'fleeets_auth_bot')
  script.setAttribute('data-size', 'large')
  script.setAttribute('data-radius', '10')
  script.setAttribute('data-request-access', 'write')
  script.setAttribute('data-userpic', 'false')

  // Важно: коллбек функция, которую вызовет Telegram
  script.setAttribute('data-onauth', 'onTelegramAuth(user)')

  // Вставляем кнопку в div
  document.getElementById('telegram-login-container')?.appendChild(script)
})

// Глобальная функция, чтобы Telegram мог до неё достучаться
// @ts-ignore
window.onTelegramAuth = async (userData: any) => {
  // Валидация Telegram data (обязательно для безопасности: проверьте hash с bot token)
  // Получите bot token из env (VITE_TELEGRAM_BOT_TOKEN или аналогично)
  const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN // Добавьте в .env и vite.config
  if (!botToken) {
    console.error('Bot token not found')
    return
  }

  // Telegram validation: создайте check string и сравните hash
  const checkString = Object.keys(userData)
    .filter((key) => key !== 'hash')
    .map((key) => `${key}=${userData[key]}`)
    .sort()
    .join('\n')

  const crypto = await import('crypto') // Для хэша (если в браузере, используйте Web Crypto API)
  const secretKey = crypto.createHash('sha256').update(botToken).digest()
  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex')

  if (hmac !== userData.hash) {
    console.error('Invalid Telegram hash')
    return // Не авторизуем, если подделка
  }

  // Если валидно, авторизуем через Supabase (custom token)
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'telegram',
    token: JSON.stringify(userData), // Или userData.hash + '|' + userData.auth_date
  })

  if (error) {
    console.error('Supabase auth error:', error)
    return
  }

  console.log('Telegram auth success:', data)
  emit('login', userData) // Если нужно emit для UI
}

const devLogin = () => {
  const fakeUser = {
    id: 123456789,
    first_name: 'DevUser',
    username: 'developer',
    auth_date: Math.floor(Date.now() / 1000),
    hash: 'fake_hash_for_testing',
  }
  emit('login', fakeUser)
}
</script>

<template>
  <div
    id="telegram-login-container"
    class="login-wrapper"
  ></div>
  <button
    @click="devLogin"
    class="dev-btn"
  >
    <FileQuestion class="w-8 h-8" />
  </button>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  /* margin-top: 20px; */
}
.dev-btn {
  position: absolute;
  top: 0;
  right: 0;
  /* background: #333; */
  /* border: 1px dashed #555; */
  /* padding: 5px 10px; */
  color: #555;
  border-radius: 12px;
  cursor: pointer;
}
</style>
