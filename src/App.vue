<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Zap } from 'lucide-vue-next'
import { useAuth } from './composables/useAuth'
import { useAppSettings } from './composables/useAppSettings'
import { useNotesStore } from './stores/notes'

import LoginView from './components/auth/LoginView.vue'
import NoteList from './components/notes/NoteList.vue'
import NoteInput from './components/notes/NoteInput.vue'
import AppFooter from './components/layout/AppFooter.vue'
import SettingsPanel from './components/layout/SettingsPanel.vue'

const notesStore = useNotesStore()
const { user, initSession, handleTelegramLogin } = useAuth()
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

const triggerScroll = async () => {
  await nextTick()
  listRef.value?.scrollToBottom()
}

const onLoginStart = async (tgUser: any) => {
  // 1. Мгновенно включаем сплеш-скрин (пользователь видит fade-in логотипа)
  isBooting.value = true

  // 2. Ждем выполнения двух вещей: авторизации И минимальной задержки для красоты
  const minDelay = new Promise((resolve) => setTimeout(resolve, 1000))

  // 3. Выполняем вход (внутри fetchNotes уже вызовется)
  const success = await handleTelegramLogin(tgUser)

  await Promise.all([minDelay, success ? Promise.resolve() : Promise.resolve()])

  // 4. Если успех - скроллим список (пока еще под шторкой)
  if (success) {
    await nextTick()
    await triggerScroll()
  }

  // 5. Плавно убираем шторку. Вуаля! Пользователь уже внутри.
  isBooting.value = false
}

const onNoteSubmit = (payload: { content: string; file?: File }) => {
  if (!user.value) return
  notesStore.addNote(payload.content, user.value.id, payload.file)
  triggerScroll()
}

onMounted(async () => {
  // 1. Сначала применяем настройки (масштаб, тема)
  await initSettings()

  // 2. Параллельно запускаем проверку сессии и минимальный таймер
  // Это гарантирует, что сплеш-скрин повисит хотя бы 800мс (чтобы не было моргания),
  // но если интернет медленный, он будет висеть пока не загрузятся данные.
  const minLoadTime = new Promise((resolve) => setTimeout(resolve, 800))
  const sessionCheck = initSession() // Внутри initSession мы уже ждем fetchNotes()

  await Promise.all([minLoadTime, sessionCheck])

  // 3. Если пользователь есть, скроллим вниз сразу (пока еще под сплеш-скрином)
  if (user.value) {
    await nextTick() // Даем Vue отрендерить список в DOM
    await triggerScroll()
  }

  // 4. Плавно убираем сплеш-скрин
  isBooting.value = false

  window.addEventListener('resize', triggerScroll)
})

onUnmounted(() => {
  cleanupSettings()
  window.removeEventListener('resize', triggerScroll)
})
</script>

<template>
  <!-- 
    FIX 1: h-[100dvh] вместо h-screen исправляет исчезновение футера за адресной строкой на мобилках.
    w-screen и overflow-hidden предотвращают горизонтальный скролл.
  -->
  <div
    class="h-[100dvh] w-screen overflow-hidden font-sans text-base text-[#ffffff] relative flex items-center justify-center bg-[#050505]"
  >
    <!-- ШУМ (Только веб) -->
    <div
      v-if="!isTauri"
      class="absolute inset-0 z-0 opacity-[0.03] pointer-events-none noise-bg"
    ></div>

    <!-- 1. SPLASH SCREEN (Экран загрузки) -->
    <Transition name="fade-slow">
      <div
        v-if="isBooting"
        class="absolute inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center"
      >
        <!-- Пульсирующий логотип -->
        <div class="relative flex items-center justify-center w-20 h-20 mb-4">
          <div
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-500/10 blur-3xl rounded-full pointer-events-none animate-pulse-slow"
          ></div>
          <Zap class="w-10 h-10 text-yellow-400 relative z-10 animate-pulse" />
        </div>
        <!-- Небольшой текст (опционально) -->
        <!-- <span class="text-[#3f3f46] text-xs font-mono animate-pulse">loading...</span> -->
      </div>
    </Transition>

    <!-- КОНТЕЙНЕР ПРИЛОЖЕНИЯ -->
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
        <!-- ЭКРАН ВХОДА -->
        <LoginView
          v-if="!user"
          @login-telegram="onLoginStart"
        />

        <!-- ИНТЕРФЕЙС ПРИЛОЖЕНИЯ -->
        <div
          v-else
          class="flex-1 flex flex-col relative w-full h-full overflow-hidden"
        >
          <!-- Drag Region -->
          <div
            v-if="isTauri"
            data-tauri-drag-region
            class="h-8 w-full shrink-0 bg-transparent z-50 absolute top-0 left-0"
          ></div>

          <!-- СПИСОК (занимает всё свободное место) -->
          <NoteList
            ref="listRef"
            :is-comfort-mode="isComfortMode"
          />

          <!-- ВВОД -->
          <NoteInput
            :is-comfort-mode="isComfortMode"
            :is-tauri="isTauri"
            @submit="onNoteSubmit"
          />

          <!-- ФУТЕР (shrink-0 не дает ему сжиматься) -->
          <AppFooter
            class="shrink-0"
            :is-offline="isOffline"
            :settings-open="showSettings"
            @toggle-settings="showSettings = !showSettings"
          />

          <!-- Settings Modal Overlay -->
          <div
            v-if="showSettings"
            @click="showSettings = false"
            class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:bg-black/50"
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
  transition: all 150ms cubic-bezier(0.2, 0, 0.2, 1);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(15px) scale(0.95);
}
</style>
