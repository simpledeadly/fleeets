<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { Zap, ExternalLink, LayoutGrid, Inbox, Settings, Cloud, CloudOff } from 'lucide-vue-next'
import { useAuth } from './composables/useAuth'
import { useAppSettings } from './composables/useAppSettings'
import { useNotesStore } from './stores/notes'

import LoginView from './components/auth/LoginView.vue'
import NoteList from './components/notes/NoteList.vue'
import NoteInput from './components/notes/NoteInput.vue'
import SettingsPanel from './components/layout/SettingsPanel.vue'
import InboxPage from './pages/InboxPage.vue'

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
const currentView = ref<'notes' | 'inbox'>('notes')

const isTelegramBrowser = computed(() => {
  const ua = navigator.userAgent.toLowerCase()
  return (ua.includes('telegram') || ua.includes('tg/')) && !isTauri
})

const triggerScroll = async () => {
  await nextTick()
  listRef.value?.scrollToBottom()
}

const onLoginStart = async () => {
  isBooting.value = true
  await new Promise((resolve) => setTimeout(resolve, 800))
  await nextTick()
  await triggerScroll()
  isBooting.value = false
}

const onNoteSubmit = (payload: { content: string; file?: File }) => {
  if (!user.value) return
  notesStore.addNote(payload.content, user.value.id, payload.file)
  triggerScroll()
}

onMounted(async () => {
  if (isTelegramBrowser.value) {
    isBooting.value = false
    return
  }
  try {
    await initSettings()
    const minLoadTime = new Promise((resolve) => setTimeout(resolve, 500))
    const sessionCheck = initSession()
    await Promise.all([minLoadTime, sessionCheck])
    if (user.value) {
      await nextTick()
      await triggerScroll()
    }
  } catch (error) {
    console.error('BOOT ERROR:', error)
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
    class="h-[100dvh] w-screen overflow-hidden font-sans text-base text-white bg-[#050505] selection:bg-blue-500/30"
  >
    <div
      class="absolute inset-0 z-0 bg-gradient-to-tr from-[#050505] via-[#050505] to-[#1a1a2e]/20 pointer-events-none"
    ></div>
    
    <div
      v-if="isTelegramBrowser"
      class="absolute inset-0 z-[200] bg-[#050505] flex flex-col items-center justify-center p-8 text-center"
    >
      <ExternalLink class="w-12 h-12 text-blue-500 mb-4" />
      <h2 class="text-xl font-bold mb-2">Откройте в браузере</h2>
      <p class="text-gray-400 text-sm">Функции приложения ограничены внутри Telegram.</p>
    </div>

    <template v-else>
      <Transition name="fade-fast">
        <div
          v-if="isBooting"
          class="absolute inset-0 z-[100] bg-[#050505] flex items-center justify-center"
        >
          <Zap class="w-8 h-8 text-yellow-400 opacity-80 animate-pulse stroke-[1.6px]" />
        </div>
      </Transition>

      <Transition name="fade-fast">
        <div
          v-if="!isBooting"
          class="w-full h-full relative flex flex-col"
        >
          <LoginView
            v-if="!user"
            @login-telegram="onLoginStart"
          />

          <div
            v-else
            class="flex-1 relative w-full h-full overflow-hidden"
          >
            <!-- === HEADER === -->
            <header class="absolute top-0 left-0 right-0 z-30 pt-safe-top">
              <!-- Исправленный градиент: в цвет фона (#050505) и короче (h-24) -->
              <div
                class="absolute inset-0 h-24 bg-gradient-to-b from-[#050505]/70 via-[#050505]/30 to-transparent pointer-events-none"
              ></div>

              <div class="relative px-5 py-3 flex items-center justify-between">
                <!-- ИНДИКАТОР СИНХРОНИЗАЦИИ (Слева) -->
                <div class="w-10 flex justify-start">
                  <CloudOff
                    v-if="isOffline"
                    class="w-4 h-4 text-red-500 opacity-80"
                  />
                  <Cloud
                    v-else
                    class="w-4 h-4 text-gray-500/50"
                  />
                </div>

                <!-- НАВИГАЦИЯ -->
                <div
                  class="flex bg-[#1c1c1e]/80 backdrop-blur-md rounded-full p-1 border border-white/5 shadow-lg"
                >
                  <button
                    @click="currentView = 'notes'"
                    class="px-5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-2"
                    :class="
                      currentView === 'notes'
                        ? 'bg-[#3a3a3c] text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    "
                  >
                    <LayoutGrid class="w-3.5 h-3.5" />
                    <span>Заметки</span>
                  </button>
                  <button
                    @click="currentView = 'inbox'"
                    class="px-5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-2"
                    :class="
                      currentView === 'inbox'
                        ? 'bg-[#3a3a3c] text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    "
                  >
                    <Inbox class="w-3.5 h-3.5" />
                    <span>Входящие</span>
                  </button>
                </div>

                <!-- НАСТРОЙКИ (Справа) -->
                <button
                  @click="showSettings = !showSettings"
                  class="w-10 h-10 flex items-center justify-end text-gray-400 hover:text-white transition-colors"
                >
                  <Settings class="w-5 h-5" />
                </button>
              </div>
            </header>

            <!-- === MAIN CONTENT === -->
            <main class="w-full h-full relative">
              <Transition
                name="tab-switch"
                mode="out-in"
              >
                <div
                  v-if="currentView === 'notes'"
                  key="notes"
                  class="h-full w-full relative"
                >
                  <NoteList
                    ref="listRef"
                    class="h-full w-full pt-20 pb-28 px-4"
                    :is-comfort-mode="isComfortMode"
                  />

                  <!-- === INPUT AREA === -->
                  <div class="absolute bottom-0 left-0 right-0 z-30 pb-safe-bottom">
                    <!-- Исправленный градиент снизу -->
                    <div
                      class="absolute inset-0 -top-10 bg-gradient-to-t from-[#050505]/70 via-[#050505]/30 to-transparent pointer-events-none"
                    ></div>

                    <div class="relative px-4 pb-4 pt-2 max-w-3xl mx-auto w-full">
                      <NoteInput
                        :is-comfort-mode="isComfortMode"
                        :is-tauri="isTauri"
                        @submit="onNoteSubmit"
                      />
                    </div>
                  </div>
                </div>

                <div
                  v-else-if="currentView === 'inbox'"
                  key="inbox"
                  class="h-full w-full pt-20 pb-4"
                >
                  <InboxPage />
                </div>
              </Transition>
            </main>

            <!-- SETTINGS OVERLAY -->
            <div
              v-if="showSettings"
              @click="showSettings = false"
              class="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
            ></div>
            <Transition name="settings-slide">
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
/* 1. БЫСТРОЕ ПЕРЕКЛЮЧЕНИЕ ТАБОВ (120ms) */
.tab-switch-enter-active,
.tab-switch-leave-active {
  transition: all 30ms cubic-bezier(0.25, 1, 0.5, 0);
}
.tab-switch-enter-from {
  opacity: 0;
  transform: scale(0.98); /* Едва заметный скейл */
  /* filter: blur(2px); */
}
.tab-switch-leave-to {
  opacity: 0;
  transform: scale(1);
  /* filter: blur(0px); */
}

/* 2. НАСТРОЙКИ: Плавное закрытие (400ms leave vs 300ms enter) */
.settings-slide-enter-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.settings-slide-leave-active {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); /* Чуть медленнее на выход */
}
.settings-slide-enter-from,
.settings-slide-leave-to {
  transform: translateX(100%);
}

.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.15s ease-out;
}
.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}

.pt-safe-top {
  padding-top: env(safe-area-inset-top, 20px);
}
.pb-safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 20px);
}
</style>
