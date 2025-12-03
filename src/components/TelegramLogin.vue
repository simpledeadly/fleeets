<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { RefreshCw, Send } from 'lucide-vue-next'
import { useAuth } from '../composables/useAuth'
import { useAppSettings } from '../composables/useAppSettings'

// Мы просто сообщаем наверх: "Есть данные для входа"
const emit = defineEmits(['login'])
const { startPollingAuth, user } = useAuth()
const { isTauri } = useAppSettings()

const BOT_USERNAME = 'fleeets_app_bot'
const loginUrl = ref('')
const manualCheck = ref<(() => Promise<boolean>) | null>(null)
const isChecking = ref(false)

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

const onManualCheck = async () => {
  if (!manualCheck.value) return
  isChecking.value = true
  await manualCheck.value()
  // Небольшая задержка для визуального эффекта нажатия
  setTimeout(() => {
    isChecking.value = false
  }, 500)
}

const handleLinkClick = async (e: Event) => {
  if (isTauri) {
    e.preventDefault() // Отменяем стандартный переход внутри окна
    try {
      // Динамический импорт, чтобы не ломать веб-версию
      const { open } = await import('@tauri-apps/api/shell')
      await open(loginUrl.value)
    } catch (err) {
      console.error('Tauri open error:', err)
    }
  }
  // Если это веб — сработает стандартный href="..." target="_blank"
}
</script>

<template>
  <div class="flex flex-col items-center gap-4 w-full">
    <!-- Основная кнопка -->
    <a
      :href="loginUrl"
      @click="handleLinkClick"
      class="telegram-btn group w-full max-w-[240px]"
      target="_blank"
    >
      <div class="flex items-center justify-center gap-2">
        <Send
          class="w-5 h-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
        <span>Войти через Telegram</span>
      </div>
    </a>

    <!-- Кнопка ручной проверки (Спасательный круг) -->
    <button
      @click="onManualCheck"
      class="text-[#52525b] hover:text-white text-sm flex items-center gap-2 transition-colors py-2 px-4 rounded-lg hover:bg-white/5"
      :disabled="isChecking"
    >
      <RefreshCw
        class="w-4 h-4"
        :class="{ 'animate-spin': isChecking }"
      />
      <span>Я нажал старт, проверить</span>
    </button>

    <p class="text-[12px] text-white/30 text-center max-w-[220px] leading-snug mt-1">
      Если вход не произошел автоматически, нажмите кнопку проверки.
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
  box-shadow: 0 4px 12px rgba(36, 161, 222, 0.1);
}

.telegram-btn:hover {
  background-color: '#1b8xb9';
  transform: translateY(-1px);
}

.telegram-btn:active {
  transform: scale(0.98);
}
</style>
