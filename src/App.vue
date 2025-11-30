<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { supabase } from './supabase'
import TelegramLogin from './components/TelegramLogin.vue'
import NoteItem from './components/NoteItem.vue'
import { useNotesStore } from './stores/notes'
import { getVersion } from '@tauri-apps/api/app'
import {
  Paperclip,
  ArrowUp,
  Settings,
  LogOut,
  Maximize2,
  Minimize2,
  Cloud,
  CloudOff,
  RefreshCw,
  Zap,
  Monitor,
  ArrowRight,
  Mail,
} from 'lucide-vue-next'

const isTauri = window.__TAURI__ !== undefined

const user = ref<any>(null)
const appVersion = ref('0.0.0')
const notesStore = useNotesStore()
const newNoteContent = ref('')
const scrollContainer = ref<HTMLDivElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const hasAttachment = ref(false) // Следим за файлом

// Вычисляем, есть ли контент для отправки (для цвета кнопки)
const canSubmit = computed(() => newNoteContent.value.trim().length > 0 || hasAttachment.value)

// --- НАСТРОЙКИ ---
const showSettings = ref(false)
const isComfortMode = ref(true)
const uiScale = ref(100)
const isOffline = ref(!navigator.onLine)

// --- ДИНАМИЧЕСКИЙ ГРАДИЕНТ (DEV FEATURE) ---
const auroraHue = ref(220) // Начальный синий
const auroraSat = ref(80) // Насыщенность

const randomizeAurora = () => {
  auroraHue.value = Math.floor(Math.random() * 360)
  auroraSat.value = 60 + Math.floor(Math.random() * 40) // 60-100%
}
// --------------------------------------------

const applyScale = () => {
  document.documentElement.style.fontSize = `${16 * (uiScale.value / 100)}px`
  localStorage.setItem('fleeets_scale', String(uiScale.value))
}

const toggleLayout = () => {
  isComfortMode.value = !isComfortMode.value
  localStorage.setItem('fleeets_layout', isComfortMode.value ? 'comfort' : 'full')
}

const updateOnlineStatus = () => (isOffline.value = !navigator.onLine)

onMounted(async () => {
  try {
    appVersion.value = await getVersion()
  } catch {
    appVersion.value = 'Web'
  }
  const savedLayout = localStorage.getItem('fleeets_layout')
  if (savedLayout === 'full') isComfortMode.value = false
  const savedScale = localStorage.getItem('fleeets_scale')
  if (savedScale) {
    uiScale.value = Number(savedScale)
    applyScale()
  }

  const { data } = await supabase.auth.getSession()
  if (data.session) {
    user.value = data.session.user
    await notesStore.fetchNotes()
    scrollToBottom()
  }

  window.addEventListener('resize', scrollToBottom)
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})

onUnmounted(() => {
  window.removeEventListener('resize', scrollToBottom)
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})

watch(uiScale, applyScale)

// --- ЛОГИКА ---

const scrollToBottom = async () => {
  await nextTick()
  if (scrollContainer.value) scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
}

const submitNote = () => {
  if (!canSubmit.value) return
  if (!user.value) return

  const file = fileInput.value?.files?.[0]
  notesStore.addNote(newNoteContent.value, user.value.id, file)

  newNoteContent.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
    hasAttachment.value = false
  }
  scrollToBottom()
}

const triggerFileUpload = () => fileInput.value?.click()
const onFileChange = () => {
  hasAttachment.value = !!fileInput.value?.files?.length
}

const handleLogin = async (tgUser: any) => {
  try {
    const { data, error } = await supabase.functions.invoke('telegram-auth', {
      body: { user: tgUser },
    })
    if (error) throw error
    if (data?.session || data?.access_token) {
      const s = data.session || data
      await supabase.auth.setSession({
        access_token: s.access_token,
        refresh_token: s.refresh_token,
      })
      const { data: u } = await supabase.auth.getUser()
      user.value = u.user
      await notesStore.fetchNotes()
    }
  } catch (e: any) {
    alert('Ошибка: ' + e.message)
  }
}

const logout = async () => {
  await supabase.auth.signOut()
  user.value = null
  showSettings.value = false
}

const email = ref('')
const emailLoading = ref(false)
const handleEmailLogin = async () => {
  emailLoading.value = true
  await supabase.auth.signInWithOtp({
    email: email.value,
    options: { emailRedirectTo: window.location.origin },
  })
  alert(`Ссылка отправлена на ${email.value}`)
  emailLoading.value = false
}
</script>

<template>
  <div
    class="h-screen w-screen overflow-hidden font-sans text-base text-[#ffffff] relative flex items-center justify-center bg-[#050505]"
  >
    <!-- ШУМ (Только веб) -->
    <div
      v-if="!isTauri"
      class="absolute inset-0 z-0 opacity-[0.03] pointer-events-none noise-bg"
    ></div>

    <!-- КОНТЕЙНЕР ПРИЛОЖЕНИЯ -->
    <div
      class="flex flex-col relative overflow-hidden transition-all duration-500 ease-out z-10"
      :class="
        isTauri
          ? 'w-full h-full bg-[#0c0c0e]'
          : 'w-full h-full md:w-[900px] md:h-[85vh] md:rounded-3xl border border-[#333]/60 shadow-2xl bg-[#0c0c0e]'
      "
    >
      <!-- ВХОД -->
      <div
        v-if="!user"
        class="flex-1 flex flex-col items-center justify-center p-6 relative z-10 overflow-hidden"
      >
        <!-- BLUE GLOW CENTRAL -->
        <!-- <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none animate-pulse-slow"
        ></div> -->

        <!-- 
            ДИНАМИЧЕСКАЯ АВРОРА
            Используем inline-style, чтобы реактивно менять цвет (Hue)
         -->
        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] pointer-events-none animate-pulse-slow transition-colors duration-1000"
        >
          <div
            class="absolute inset-0 transition-all duration-1000"
            :style="{
              background: `radial-gradient(circle closest-side, hsla(${auroraHue}, ${auroraSat}%, 60%, 0.25), hsla(${
                auroraHue + 40
              }, ${auroraSat}%, 50%, 0.1), transparent)`,
            }"
          ></div>
        </div>

        <div class="w-full max-w-sm flex flex-col items-center gap-8 relative z-20">
          <div
            class="text-center space-y-4 animate-enter-up"
            style="animation-delay: 0ms"
          >
            <div
              @click="randomizeAurora"
              class="cursor-pointer animate-float inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#18181b] border border-[#333] shadow-2xl mb-2"
            >
              <div
                class="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              ></div>
              <Zap class="w-10 h-10 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.2)]" />
            </div>
            <div>
              <h1 class="text-4xl font-bold tracking-tighter text-white">Fleeets</h1>
              <p class="text-[#888] text-sm mt-2 tracking-wide">Ловите мысли молниеносно.</p>
            </div>
          </div>

          <div
            class="w-full animate-enter-up"
            style="animation-delay: 100ms"
          >
            <div
              class="bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl rounded-2xl p-4 flex justify-center hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 shadow-lg cursor-pointer group"
            >
              <div class="opacity-90 group-hover:opacity-100 transition-opacity">
                <TelegramLogin
                  botName="fleeets_auth_bot"
                  @login="handleLogin"
                />
              </div>
            </div>
          </div>

          <!-- Разделитель -->
          <div
            class="flex items-center gap-4 w-full opacity-40 px-2 animate-enter-up"
            style="animation-delay: 200ms"
          >
            <div
              class="h-px bg-gradient-to-r from-transparent via-[#52525b] to-transparent flex-1"
            ></div>
            <span class="text-[10px] uppercase tracking-widest text-[#a1a1aa] select-none"
              >или</span
            >
            <div
              class="h-px bg-gradient-to-r from-transparent via-[#52525b] to-transparent flex-1"
            ></div>
          </div>

          <div
            class="w-full relative group animate-enter-up"
            style="animation-delay: 300ms"
          >
            <Mail
              class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a1a1aa] transition-colors duration-300 group-focus-within:text-white z-20"
            />

            <input
              v-model="email"
              placeholder="name@example.com"
              @keydown.enter="handleEmailLogin"
              class="w-full bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl py-4 pl-12 pr-14 text-white placeholder-[#52525b] outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all duration-300 shadow-lg"
            />

            <!-- Кнопка -->
            <button
              @click="handleEmailLogin"
              :disabled="emailLoading || !email"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full transition-all duration-300 active:scale-90 z-20"
              :class="
                email
                  ? 'bg-white text-black hover:bg-gray-200 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                  : 'text-[#52525b] bg-white/5 cursor-not-allowed'
              "
            >
              <ArrowRight
                v-if="!emailLoading"
                class="w-4 h-4 stroke-[3]"
              />
              <div
                v-else
                class="w-4 h-4 border-2 border-[#555] border-t-[#888] rounded-full animate-spin"
              ></div>
            </button>
          </div>
        </div>
      </div>

      <!-- ИНТЕРФЕЙС -->
      <div
        v-else
        class="flex-1 flex flex-col relative w-full h-full"
      >
        <!-- Drag Region -->
        <div
          v-if="isTauri"
          data-tauri-drag-region
          class="h-8 w-full shrink-0 bg-transparent z-50 absolute top-0 left-0"
        ></div>

        <!-- СПИСОК -->
        <div
          ref="scrollContainer"
          class="flex-1 overflow-y-auto scroll-smooth pt-6"
          :class="isComfortMode ? 'px-[15%] md:px-[25%]' : 'px-0'"
        >
          <div class="flex flex-col justify-end min-h-full pb-0">
            <div
              v-if="notesStore.notes.length === 0"
              class="text-center text-[#52525b] select-none flex flex-col items-center gap-4 opacity-70 py-20 my-auto animate-enter-up"
            >
              <Zap class="w-12 h-12 stroke-[1.2] text-yellow-500" />
              <span class="text-sm font-medium tracking-wide">Добавьте свой первый флит</span>
            </div>

            <!-- Заметки -->
            <NoteItem
              v-for="note in notesStore.notes"
              :key="note.id"
              :note="note"
              :full-width="!isComfortMode"
              @update="notesStore.updateNote"
              @delete="(id) => notesStore.deleteNote(id)"
            />
          </div>
        </div>

        <!-- ОБЛАСТЬ ВВОДА -->
        <div
          class="shrink-0 z-30 border-t border-[#27272a]"
          :class="[
            isComfortMode ? 'px-[15%] md:px-[25%] py-0' : 'px-2 py-0',
            isTauri ? 'bg-[#0c0c0e]' : 'bg-[#0c0c0e]/90 backdrop-blur-md',
          ]"
        >
          <div class="flex items-center gap-1.5 bg-transparent transition-all duration-100">
            <button
              @click="triggerFileUpload"
              class="p-2 rounded-full transition-all duration-100 flex items-center justify-center hover:scale-105 active:scale-95"
              :class="
                hasAttachment
                  ? 'text-black bg-white'
                  : 'text-[#71717a] hover:text-white hover:bg-[#1c1c1f]'
              "
            >
              <Paperclip
                class="w-4 h-4"
                strokeWidth="1.8"
              />
            </button>
            <input
              ref="fileInput"
              type="file"
              hidden
              @change="onFileChange"
            />
            <textarea
              v-model="newNoteContent"
              @keydown.enter.exact.prevent="submitNote"
              rows="1"
              class="flex-1 bg-transparent resize-none outline-none text-md py-2 max-h-40 placeholder-[#52525b] text-white font-medium"
              placeholder="Введите текст заметки"
            ></textarea>
            <button
              @click="submitNote"
              class="p-2 rounded-full transition-all duration-100 flex items-center justify-center active:scale-90 shadow-sm"
              :class="
                canSubmit
                  ? 'bg-white text-black hover:bg-[#e4e4e7] shadow-[0_0_15px_rgba(255,255,255,0.15)]'
                  : 'bg-[#1c1c1f] text-[#52525b] hover:bg-[#27272a] hover:text-[#a1a1aa]'
              "
              :disabled="!canSubmit"
            >
              <ArrowUp
                class="w-4 h-4"
                strokeWidth="2"
              />
            </button>
          </div>
        </div>

        <!-- ФУТЕР -->
        <footer
          class="h-10 border-t border-[#27272a] flex items-center justify-between px-2 text-xs text-[#71717a] select-none shrink-0 z-40 rounded-b-3xl bg-[#0c0c0e]"
        >
          <div class="flex items-center gap-3">
            <div
              v-if="isOffline"
              class="flex items-center gap-1.5 text-red-400/80"
            >
              <CloudOff class="w-4 h-4" /><span class="font-semibold tracking-wide">ОФЛАЙН</span>
            </div>
            <div
              v-else-if="notesStore.isSyncing"
              class="flex items-center gap-1.5 text-blue-400/80"
            >
              <RefreshCw class="w-4 h-4 animate-spin" /><span class="font-semibold tracking-wide"
                >СИНХРОНИЗАЦИЯ</span
              >
            </div>
            <div
              v-else
              class="flex items-center gap-1.5 text-[#52525b]"
            >
              <Cloud class="w-4 h-4" /><span class="font-semibold tracking-wide"
                >СИНХРОНИЗИРОВАНО</span
              >
            </div>
          </div>
          <button
            @click="showSettings = !showSettings"
            class="flex items-center justify-center w-8 h-8 rounded-full hover:text-white transition-all duration-200 hover:bg-[#27272a] active:scale-90"
            :class="{ 'text-white bg-[#27272a]': showSettings }"
          >
            <Settings class="w-4 h-4" />
          </button>
        </footer>

        <div
          v-if="showSettings"
          @click="showSettings = false"
          class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        ></div>

        <Transition name="fade">
          <div
            v-if="showSettings"
            class="absolute bottom-14 right-6 z-50 w-72 bg-[#18181b] border border-[#333] rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/5"
          >
            <div
              class="px-4 py-3 border-b border-[#333] flex justify-between items-center bg-[#202023]"
            >
              <span class="font-bold text-xs tracking-widest text-[#a1a1aa]">НАСТРОЙКИ</span>
              <span class="font-mono text-xs text-[#52525b]">v{{ appVersion }}</span>
            </div>
            <div class="p-4 flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <div class="flex justify-between text-xs">
                  <span class="flex items-center gap-2 text-[#d4d4d8]"
                    ><Monitor class="w-3.5 h-3.5" />Масштаб интерфейса</span
                  >
                  <span class="text-white font-mono">{{ uiScale }}%</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="160"
                  step="5"
                  v-model.number="uiScale"
                  class="w-full h-1 bg-[#3f3f46] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>
              <button
                @click="toggleLayout"
                class="flex items-center justify-between p-2 bg-[#27272a] rounded-xl border border-[#3f3f46] hover:bg-[#3f3f46] transition-all duration-75 group"
              >
                <div class="flex items-center gap-2 text-[#d4d4d8] group-hover:text-white">
                  <Maximize2
                    v-if="!isComfortMode"
                    class="w-3.5 h-3.5"
                  />
                  <Minimize2
                    v-else
                    class="w-3.5 h-3.5"
                  />
                  <span class="text-xs">Ширина контента</span>
                </div>
                <span class="text-[#71717a] text-xs uppercase font-semibold tracking-wider">{{
                  isComfortMode ? 'Узкая' : 'Полная'
                }}</span>
              </button>
              <button
                @click="logout"
                class="flex items-center justify-center gap-2 w-full p-2 text-red-400 hover:text-white hover:bg-red-600 rounded-xl transition-all duration-100 text-xs font-medium border border-red-900/20"
              >
                <LogOut class="w-3.5 h-3.5" />
                Выйти из аккаунта
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 100ms ease, transform 100ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}

.noise-bg {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 100px;
  opacity: 0.05;
}

/* Анимации */
.animate-enter-up {
  animation: enterUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
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

.animate-fade-in {
  animation: fadeIn 1s ease-out both;
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
