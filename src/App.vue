<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
// import { invoke } from '@tauri-apps/api'
// import { ask } from '@tauri-apps/api/dialog'
// import { checkUpdate, installUpdate } from '@tauri-apps/api/updater'
import { Zap, ExternalLink } from 'lucide-vue-next'
import { useAuth } from './composables/useAuth'
import { useAppSettings } from './composables/useAppSettings'
import { useNotesStore } from './stores/notes'

import LoginView from './components/auth/LoginView.vue'
import NoteList from './components/notes/NoteList.vue'
import NoteInput from './components/notes/NoteInput.vue'
import AppFooter from './components/layout/AppFooter.vue'
import SettingsPanel from './components/layout/SettingsPanel.vue'

const notesStore = useNotesStore()
const { user, initSession } = useAuth()
const {
  isTauri,
  appVersion,
  isComfortMode,
  uiScale,
  isOffline,
  toggleLayout,
  initSettings,
  cleanupSettings,
} = useAppSettings()

const isBooting = ref(true)

const showSettings = ref(false)
const listRef = ref<InstanceType<typeof NoteList> | null>(null)

const isTelegramBrowser = computed(() => {
  const ua = navigator.userAgent.toLowerCase()
  // Добавили проверку, чтобы не блокировать PWA и десктоп
  return (ua.includes('telegram') || ua.includes('tg/')) && !isTauri
})

const triggerScroll = async () => {
  await nextTick()
  listRef.value?.scrollToBottom()
}

const onLoginStart = async () => {
  isBooting.value = true

  // Даем пользователю насладиться сплеш-скрином (и прогрузить данные)
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Скроллим список к низу
  await nextTick()
  await triggerScroll()

  // Убираем заставку
  isBooting.value = false
}

const onNoteSubmit = (payload: { content: string; file?: File }) => {
  if (!user.value) return
  notesStore.addNote(payload.content, user.value.id, payload.file)
  triggerScroll()
}

onMounted(async () => {
  // Если это Telegram Webview — не грузимся дальше, ждем открытия в браузере
  if (isTelegramBrowser.value) {
    isBooting.value = false
    return
  }

  try {
    await initSettings()

    const minLoadTime = new Promise((resolve) => setTimeout(resolve, 800))
    const sessionCheck = initSession()

    await Promise.all([minLoadTime, sessionCheck])

    if (user.value) {
      await nextTick()
      await triggerScroll()
    }
  } catch (error) {
    console.error('CRITICAL BOOT ERROR:', error)
  } finally {
    isBooting.value = false
  }

  window.addEventListener('resize', triggerScroll)
})

onUnmounted(() => {
  cleanupSettings()
  window.removeEventListener('resize', triggerScroll)
})
</script>

<template>
  <div
    class="h-[100dvh] w-screen overflow-hidden font-sans text-base text-[#ffffff] relative flex items-center justify-center bg-[#050505]"
  >
    <!-- 1. ЭКРАН-ПРЕДУПРЕЖДЕНИЕ ДЛЯ TELEGRAM -->
    <div
      v-if="isTelegramBrowser"
      class="absolute inset-0 z-[200] bg-[#050505] flex flex-col items-center justify-center p-8 text-center"
    >
      <div class="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
        <ExternalLink class="w-8 h-8 text-blue-400" />
      </div>
      <h2 class="text-2xl font-bold mb-3">Откройте в браузере</h2>
      <p class="text-gray-400 mb-8 leading-relaxed max-w-xs">
        Чтобы войти в аккаунт и сохранить сессию, нажмите на
        <span class="text-white font-bold">три точки</span> сверху и выберите
        <span class="text-white font-bold">«Открыть в браузере»</span> (Safari или Chrome).
      </p>
      <div class="text-sm text-gray-600">Авторизация внутри Telegram не сохранится.</div>
    </div>

    <!-- 2. СТАНДАРТНЫЙ ИНТЕРФЕЙС (СКРЫВАЕМ ЕСЛИ TG) -->
    <template v-else>
      <div
        v-if="!isTauri"
        class="absolute inset-0 z-0 opacity-[0.03] pointer-events-none noise-bg"
      ></div>

      <!-- SPLASH SCREEN -->
      <Transition name="fade-slow">
        <div
          v-if="isBooting"
          class="absolute inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center"
        >
          <div class="relative flex items-center justify-center w-20 h-20 mb-4">
            <div
              class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-500/10 blur-3xl rounded-full pointer-events-none animate-pulse-slow"
            ></div>
            <Zap class="w-10 h-10 text-yellow-400 relative z-10 animate-pulse" />
          </div>
        </div>
      </Transition>

      <!-- MAIN APP CONTENT -->
      <Transition name="scale-in">
        <div
          v-if="!isBooting"
          class="flex flex-col relative overflow-hidden transition-all duration-500 ease-out z-10"
          :class="
            isTauri
              ? 'w-full h-full bg-[#0c0c0e]'
              : 'w-full h-full border-0 shadow-none bg-[#0c0c0e] md:w-[900px] md:h-[85vh] md:rounded-3xl md:border md:border-[#333]/60 md:shadow-2xl'
          "
        >
          <LoginView
            v-if="!user"
            @login-telegram="onLoginStart"
          />

          <div
            v-else
            class="flex-1 flex flex-col relative w-full h-full overflow-hidden"
          >
            <div
              v-if="isTauri"
              data-tauri-drag-region
              class="h-8 w-full shrink-0 bg-transparent z-50 absolute top-0 left-0"
            ></div>

            <NoteList
              ref="listRef"
              :is-comfort-mode="isComfortMode"
            />
            <NoteInput
              :is-comfort-mode="isComfortMode"
              :is-tauri="isTauri"
              @submit="onNoteSubmit"
            />
            <AppFooter
              class="shrink-0"
              :is-offline="isOffline"
              :settings-open="showSettings"
              @toggle-settings="showSettings = !showSettings"
            />

            <div
              v-if="showSettings"
              @click="showSettings = false"
              class="fixed inset-0 z-40 bg-black/50 md:bg-black/40"
            ></div>
            <Transition name="fade-slide">
              <SettingsPanel
                v-if="showSettings"
                v-model:uiScale="uiScale"
                :app-version="appVersion"
                :is-comfort-mode="isComfortMode"
                @toggle-layout="toggleLayout"
                @close="showSettings = false"
              />
            </Transition>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<style>
.noise-bg {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 100px;
  opacity: 0.05;
}

/* Splash Screen Fade Out - очень плавное исчезновение */
.fade-slow-enter-active,
.fade-slow-leave-active {
  transition: opacity 100ms ease-in-out;
}
.fade-slow-enter-from,
.fade-slow-leave-to {
  opacity: 0;
}

/* App Scale In - приложение чуть "выезжает" при появлении */
.scale-in-enter-active {
  transition: opacity 50ms ease-out, transform 50ms ease-out;
}
.scale-in-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

/* Остальные анимации */
.animate-enter-up {
  animation: enterUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
}
@keyframes enterUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
  will-change: transform;
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.animate-pulse-slow {
  animation: pulseSlow 8s ease-in-out infinite;
  will-change: opacity;
}
@keyframes pulseSlow {
  0%,
  100% {
    opacity: 0.6;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.9;
    transform: translate(-50%, -50%) scale(1.1);
  }
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); /* Apple-like spring */
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.96);
}

/* На мобильных (экраны < 768px) делаем выезд снизу на 100% */
@media (max-width: 768px) {
  .fade-slide-enter-from,
  .fade-slide-leave-to {
    opacity: 1; /* opacity не меняем, чтобы не было просвечивания при выезде */
    transform: translateY(100%);
  }
}
</style>
