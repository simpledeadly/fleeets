<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { Send } from 'lucide-vue-next'
import { useAuth } from '../composables/useAuth'

// Мы просто сообщаем наверх: "Есть данные для входа"
const emit = defineEmits(['login'])
const { startPollingAuth, user } = useAuth()

// Имя вашего бота (проверьте, чтобы совпадало с тем, что в BotFather)
const BOT_USERNAME = 'fleeets_app_bot'
const loginUrl = ref('')
let stopPolling: (() => void) | undefined

onMounted(async () => {
  // Запускаем процесс: получаем ID и начинаем опрос
  const { sessionId, stop } = await startPollingAuth()
  stopPolling = stop

  loginUrl.value = `https://t.me/${BOT_USERNAME}?start=${sessionId}`
})

onUnmounted(() => {
  if (stopPolling) stopPolling()
})

watch(user, (newUser) => {
  if (newUser) emit('login', newUser)
})
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <a
      :href="loginUrl"
      class="telegram-btn group relative"
      target="_blank"
    >
      <div class="flex items-center gap-2">
        <Send class="w-5 h-5" />
        <span>Войти через Telegram</span>
      </div>
      <!-- Индикатор работы -->
      <div class="absolute bottom-0 left-0 h-0.5 bg-white/30 w-full animate-pulse"></div>
    </a>
    <p class="text-[13px] text-white/40 text-center">
      Нажмите и запустите бота.<br />Вход произойдет автоматически.
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
