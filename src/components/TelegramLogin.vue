<script setup lang="ts">
import { onMounted } from 'vue'

const props = defineProps<{
  botName: string
}>()

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
window.onTelegramAuth = (user: any) => {
  emit('login', user)
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
    🕵️‍♂️ Dev Fake Login
  </button>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
.dev-btn {
  background: #333;
  color: #aaa;
  border: 1px dashed #555;
  padding: 5px 10px;
  cursor: pointer;
}
</style>
