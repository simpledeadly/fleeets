<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { Loader2, Send } from 'lucide-vue-next'
import { useAuth } from '../composables/useAuth'
import { useAppSettings } from '../composables/useAppSettings'

// Мы просто сообщаем наверх: "Есть данные для входа"
const emit = defineEmits(['login'])
const { startPollingAuth, user } = useAuth()
const { isTauri } = useAppSettings()

const BOT_USERNAME = 'fleeets_app_bot'
const loginUrl = ref('')
const isLoading = ref(true)

let stopPolling: (() => void) | undefined

onMounted(async () => {
  // Запускаем процесс молча
  const { sessionId, stop } = await startPollingAuth()
  stopPolling = stop
  loginUrl.value = `https://t.me/${BOT_USERNAME}?start=${sessionId}`
  isLoading.value = false
})

onUnmounted(() => {
  if (stopPolling) stopPolling()
})

watch(user, (newUser) => {
  if (newUser) emit('login', newUser)
})

const handleLinkClick = async (e: Event) => {
  if (isTauri) {
    e.preventDefault()
    try {
      const { open } = await import('@tauri-apps/api/shell')
      await open(loginUrl.value)
    } catch (err) {
      console.error('Tauri open error:', err)
    }
  }
}
</script>

<template>
  <a
    :href="loginUrl"
    @click="handleLinkClick"
    class="telegram-btn group w-full relative overflow-hidden"
    :class="{ 'pointer-events-none opacity-80': isLoading }"
    target="_blank"
  >
    <!-- Фон с градиентом -->
    <div
      class="absolute inset-0 bg-gradient-to-r from-[#24A1DE] to-[#2095cf] group-hover:scale-105 transition-transform duration-300"
    ></div>

    <!-- Блик -->
    <div
      class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
    ></div>

    <div class="relative flex items-center justify-center gap-3 py-4">
      <div
        v-if="isLoading"
        class="animate-spin"
      >
        <Loader2 class="w-6 h-6 text-white/70" />
      </div>
      <template v-else>
        <Send
          class="w-6 h-6 text-white drop-shadow-sm transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
        <span class="text-lg font-semibold text-white tracking-wide drop-shadow-sm"
          >Войти через Telegram</span
        >
      </template>
    </div>
  </a>
</template>

<style scoped>
.telegram-btn {
  display: block;
  border-radius: 16px; /* Более современное скругление */
  text-decoration: none;
  box-shadow: 0 4px 20px rgba(36, 161, 222, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}
.telegram-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2px 10px rgba(36, 161, 222, 0.05);
}
</style>
