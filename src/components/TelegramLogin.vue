<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { supabase } from '../supabase' // Импорт клиента
import { Send } from 'lucide-vue-next'

const emit = defineEmits(['login'])
const isLoading = ref(false)
const errorMessage = ref('')

// Имя вашего бота (для ссылки)
const BOT_USERNAME = 'fleeets_app_bot'

onMounted(async () => {
  // Проверяем, вернулся ли пользователь по ссылке из Телеграма
  // URL будет типа: /?id=123&first_name=Max&hash=...
  const params = new URLSearchParams(window.location.search)

  if (params.has('hash') && params.has('id')) {
    await handleLoginFromUrl(params)
  }
})

const handleLoginFromUrl = async (params: URLSearchParams) => {
  isLoading.value = true
  // Собираем объект user из параметров URL
  const telegramUser: any = {}
  params.forEach((value, key) => {
    telegramUser[key] = value
  })

  // Чистим URL, чтобы параметры не висели
  window.history.replaceState({}, document.title, window.location.pathname)

  try {
    // ВЫЗЫВАЕМ ТУ ЖЕ ФУНКЦИЮ АВТОРИЗАЦИИ, ЧТО МЫ ПИСАЛИ В ПРОШЛЫЙ РАЗ
    // (telegram-auth). Она проверит хэш и выдаст сессию.
    const { data, error } = await supabase.functions.invoke('telegram-auth', {
      body: { user: telegramUser },
    })

    if (error) throw error
    if (!data.session) throw new Error('No session returned')

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    if (sessionError) throw sessionError

    emit('login', data.user)
    console.log('Login success via Deep Link!')
  } catch (err: any) {
    console.error('Deep link login error:', err)
    errorMessage.value = err.message
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <!-- Кнопка вместо виджета -->
    <a
      :href="`https://t.me/${BOT_USERNAME}?start=login`"
      class="telegram-btn"
      target="_blank"
    >
      <Send class="w-5 h-5 mr-2" />
      Войти через Telegram
    </a>

    <div
      v-if="isLoading"
      class="text-sm text-gray-500"
    >
      Авторизация...
    </div>
    <div
      v-if="errorMessage"
      class="text-red-500 text-sm"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.telegram-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #24a1de;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.2s;
}
.telegram-btn:hover {
  opacity: 0.9;
}
</style>
