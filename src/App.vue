<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from './supabase'
import TelegramLogin from './components/TelegramLogin.vue'

const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME
const user = ref<any>(null)

const handleLogin = async (telegramUser: any) => {
  console.log('Logging in via Supabase Function...')

  // 1. Вызываем нашу функцию
  const { data, error } = await supabase.functions.invoke('telegram-auth', {
    body: { user: telegramUser },
  })

  if (error) {
    alert('Ошибка входа: ' + error.message)
    return
  }

  // 2. Если функция вернула сессию, сохраняем её в клиенте
  if (data?.access_token) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })

    if (sessionError) {
      console.error('Ошибка установки сессии', sessionError)
    } else {
      console.log('Успешный вход!', data.user)
      // Тут можно перезагрузить страницу или обновить стейт
      user.value = data.user
    }
  }
}
</script>

<template>
  <div class="container">
    <div v-if="!user">
      <h1>Добро пожаловать в Fleeets</h1>
      <p>Пожалуйста, войдите, чтобы синхронизировать заметки.</p>

      <!-- Кнопка входа -->
      <TelegramLogin
        :botName="botName"
        @login="handleLogin"
      />
    </div>

    <div v-else>
      <h1>Привет, {{ user.first_name }}!</h1>
      <pre>{{ user }}</pre>
      <button @click="user = null">Выйти</button>
    </div>
  </div>
</template>

<style>
body {
  background: #1e1e1e;
  color: white;
  font-family: sans-serif;
}
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 50px;
}
</style>
