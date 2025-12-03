<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { FileQuestion } from 'lucide-vue-next'
import { supabase } from '../supabase'

// const props = defineProps<{
//   botName: string
// }>()

const emit = defineEmits(['login'])
const isLoading = ref(false)
const errorMessage = ref('')

onMounted(() => {
  // Настраиваем скрипт виджета
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://telegram.org/js/telegram-widget.js?22'

  // Убедитесь, что имя бота совпадает с BotFather (без @)
  // Лучше брать из env, но для теста можно хардкодом
  script.setAttribute('data-telegram-login', 'fleeets_auth_bot')
  script.setAttribute('data-size', 'large')
  script.setAttribute('data-radius', '12')
  script.setAttribute('data-request-access', 'write')
  script.setAttribute('data-userpic', 'false')
  script.setAttribute('data-onauth', 'onTelegramAuth(user)')

  document.getElementById('telegram-login-container')?.appendChild(script)
})

// Глобальная функция, чтобы Telegram мог до неё достучаться
// @ts-ignore
window.onTelegramAuth = async (telegramUser: any) => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    // Вызываем нашу Edge Function
    const { data, error } = await supabase.functions.invoke('telegram-auth', {
      body: { user: telegramUser },
    })

    if (error) throw error
    if (!data.session) throw new Error('No session returned')

    // Устанавливаем сессию в локальный клиент Supabase
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    if (sessionError) throw sessionError

    // Успех!
    console.log('Logged in via Telegram', data.user)
    emit('login', data.user)
  } catch (err: any) {
    console.error('Login failed', err)
    errorMessage.value = 'Ошибка входа: ' + err.message
  } finally {
    isLoading.value = false
  }
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
  <div
    v-if="isLoading"
    class="text-sm text-gray-500"
  >
    Вход...
  </div>
  <div
    v-if="errorMessage"
    class="text-sm text-red-500"
  >
    {{ errorMessage }}
  </div>
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
