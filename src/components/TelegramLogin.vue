<script setup lang="ts">
import { onMounted } from 'vue'
import { Send } from 'lucide-vue-next'

// Мы просто сообщаем наверх: "Есть данные для входа"
const emit = defineEmits(['login'])

// Имя вашего бота (проверьте, чтобы совпадало с тем, что в BotFather)
const BOT_USERNAME = 'fleeets_app_bot'

onMounted(() => {
  // 1. Проверяем URL на наличие параметров от Telegram
  const params = new URLSearchParams(window.location.search)

  if (params.has('hash') && params.has('id')) {
    // 2. Собираем объект пользователя из параметров
    const telegramUser: Record<string, string> = {}
    params.forEach((value, key) => {
      telegramUser[key] = value
    })

    // 3. Отправляем данные родителю (LoginView -> App).
    // Мы НЕ вызываем здесь API и не перезагружаем страницу.
    emit('login', telegramUser)
  }
})
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <!-- Кнопка-ссылка (Deep Link) -->
    <!-- target="_blank" нужен, чтобы Telegram открылся в новом окне/приложении, 
         а текущая вкладка осталась ждать возврата (или редиректа) -->
    <a
      :href="`https://t.me/${BOT_USERNAME}?start=login`"
      class="telegram-btn group"
    >
      <Send
        class="w-5 h-5 mr-2 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
      <span>Войти через Telegram</span>
    </a>

    <!-- Текст-подсказка -->
    <p class="text-[13px] text-white/40 font-medium">Быстро и безопасно</p>
  </div>
</template>

<style scoped>
.telegram-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #24a1de;
  color: white;
  padding: 12px 28px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(36, 161, 222, 0.25);
}

.telegram-btn:hover {
  background-color: '#1b8xb9';
  box-shadow: 0 6px 16px rgba(36, 161, 222, 0.4);
  transform: translateY(-1px);
}

.telegram-btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(36, 161, 222, 0.2);
}
</style>
