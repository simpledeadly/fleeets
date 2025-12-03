<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Send } from 'lucide-vue-next'
import { useAuth } from '../composables/useAuth'

// Мы просто сообщаем наверх: "Есть данные для входа"
const emit = defineEmits(['login'])
const { startRealtimeAuth, user } = useAuth()

// Имя вашего бота (проверьте, чтобы совпадало с тем, что в BotFather)
const BOT_USERNAME = 'fleeets_app_bot'

const loginUrl = ref('')
const isWaiting = ref(false)

onMounted(() => {
  // 1. Генерируем сессию сразу при маунте (или можно по клику)
  const sessionId = startRealtimeAuth()

  // 2. Формируем ссылку: t.me/bot?start=UUID
  loginUrl.value = `https://t.me/${BOT_USERNAME}?start=${sessionId}`

  // Начинаем ждать (визуально можно показать спиннер или просто ждать)
  isWaiting.value = true
})

// Следим за юзером: если он появился (через Realtime), значит вход успешен
watch(user, (newUser) => {
  if (newUser) {
    emit('login', newUser) // Сообщаем App.vue, чтобы убрать сплеш
  }
})
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <!-- Кнопка-ссылка (Deep Link) -->
    <!-- target="_blank" нужен, чтобы Telegram открылся в новом окне/приложении, 
         а текущая вкладка осталась ждать возврата (или редиректа) -->
    <a
      :href="loginUrl"
      class="telegram-btn group relative overflow-hidden"
      target="_blank"
    >
      <div class="flex items-center gap-2 relative z-10">
        <Send
          class="w-5 h-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
        <span>Войти через Telegram</span>
      </div>

      <!-- Анимация ожидания (опционально) -->
      <div
        v-if="isWaiting"
        class="absolute bottom-0 left-0 h-1 bg-white/20 w-full animate-pulse"
      ></div>
    </a>

    <!-- Текст-подсказка -->
    <p class="text-[13px] text-white/40 font-medium text-center max-w-[200px] leading-tight">
      Нажмите кнопку и запустите бота. <br />Вход произойдет автоматически.
    </p>
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
  transform: translateY(-1px);
}

.telegram-btn:active {
  transform: translateY(1px);
}
</style>
