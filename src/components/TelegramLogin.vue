<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { supabase } from '../supabase'

const emit = defineEmits(['login'])
const isLoading = ref(false)
const errorMessage = ref('')

onMounted(() => {
  // Очистка контейнера перед вставкой (на случай хот-релоада)
  const container = document.getElementById('telegram-login-container')
  if (container) container.innerHTML = ''

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://telegram.org/js/telegram-widget.js?22'

  // ВАЖНО: Вставьте сюда НОВОГО бота
  script.setAttribute('data-telegram-login', 'fleeets_app_bot')
  script.setAttribute('data-size', 'large')
  script.setAttribute('data-radius', '10')
  script.setAttribute('data-userpic', 'false')

  // Гибридный подход: если JS отвалится, сработает редирект
  // Но мы перехватим событие через onauth
  script.setAttribute('data-onauth', 'onTelegramAuth(user)')
  script.setAttribute('data-request-access', 'write') // Можно вернуть для нового бота

  container?.appendChild(script)
})

// @ts-ignore
window.onTelegramAuth = async (telegramUser: any) => {
  console.log('Telegram User received:', telegramUser) // Лог для отладки
  isLoading.value = true
  errorMessage.value = ''

  try {
    // Вызов Edge Function (которую мы писали ранее)
    const { data, error } = await supabase.functions.invoke('telegram-auth', {
      body: { user: telegramUser },
    })

    if (error) throw error
    if (!data?.session) throw new Error('Session creation failed')

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
    if (sessionError) throw sessionError

    emit('login', data.user)
  } catch (err: any) {
    console.error(err)
    errorMessage.value = 'Ошибка: ' + (err.message || 'Неизвестная ошибка')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-wrapper">
    <div
      id="telegram-login-container"
      :class="{ disabled: isLoading }"
    ></div>
    <!-- Вывод ошибок на экран, чтобы не гадать -->
    <p
      v-if="errorMessage"
      class="error-text"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="isLoading"
      class="loading-text"
    >
      Входим...
    </p>
  </div>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.disabled {
  opacity: 0.5;
  pointer-events: none;
}
.error-text {
  color: #ff4444;
  font-size: 14px;
}
.loading-text {
  color: #666;
  font-size: 14px;
}
</style>
