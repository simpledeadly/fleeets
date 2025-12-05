<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import {
  Monitor,
  Smartphone,
  Maximize,
  X,
  LogOut,
  User,
  ChevronRight,
  ShieldCheck,
} from 'lucide-vue-next'
import { useAuth } from '../../composables/useAuth'

defineProps<{
  appVersion: string
  isComfortMode: boolean
  uiScale: number
}>()

const emit = defineEmits(['update:uiScale', 'toggleLayout', 'close'])
const { logout, user } = useAuth()

// Закрытие по Escape
const handleEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', handleEsc))
onUnmounted(() => window.removeEventListener('keydown', handleEsc))

const onLogout = async () => {
  await logout()
  emit('close')
}

// Данные профиля
const avatarUrl = computed(() => user.value?.user_metadata?.avatar_url)
const displayName = computed(() => {
  const meta = user.value?.user_metadata
  if (!meta) return user.value?.email || 'Пользователь'
  if (meta.username) return `@${meta.username}`
  if (meta.first_name) return meta.first_name
  if (meta.full_name) return meta.full_name
  return user.value?.email?.split('@')[0]
})

const accountType = computed(() => {
  const meta = user.value?.user_metadata
  const appMeta = user.value?.app_metadata
  if (meta?.telegram_id) return 'Telegram'
  if (appMeta?.provider === 'google') return 'Google'
  return 'Email'
})
</script>

<template>
  <div class="fixed inset-0 z-[100] flex justify-end items-end md:items-stretch">
    <!-- BACKDROP (Клик закрывает) -->
    <!-- Анимация fade для фона -->
    <div
      @click="$emit('close')"
      class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ease-out"
    ></div>

    <!-- PANEL -->
    <div
      class="relative w-full md:w-[380px] bg-[#161618]/95 backdrop-blur-2xl border-t md:border-l border-white/10 shadow-2xl flex flex-col h-[85vh] md:h-full rounded-t-[32px] md:rounded-none transform transition-transform duration-300 cubic-bezier(0.2, 0.8, 0.2, 1)"
    >
      <!-- HEADER -->
      <div class="px-6 py-5 flex justify-between items-center border-b border-white/5 shrink-0">
        <h2 class="text-lg font-bold text-white tracking-tight">Настройки</h2>
        <button
          @click="$emit('close')"
          class="w-8 h-8 flex items-center justify-center rounded-full bg-[#2c2c2e] text-gray-400 hover:text-white hover:bg-[#3a3a3c] transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- SCROLLABLE CONTENT -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        <!-- 1. PROFILE CARD -->
        <div
          class="bg-gradient-to-br from-[#1c1c1e] to-[#252527] rounded-3xl p-1 border border-white/5 shadow-lg"
        >
          <div class="flex items-center gap-4 p-4">
            <!-- Avatar -->
            <div class="relative shrink-0">
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                class="w-14 h-14 rounded-full object-cover bg-[#2c2c2e] ring-2 ring-[#000]"
              />
              <div
                v-else
                class="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg"
              >
                <User class="w-7 h-7" />
              </div>
              <div class="absolute -bottom-1 -right-1 bg-[#161618] rounded-full p-1">
                <div class="w-3 h-3 bg-green-500 rounded-full ring-2 ring-[#161618]"></div>
              </div>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <h3 class="text-white font-semibold truncate text-lg leading-tight">
                {{ displayName }}
              </h3>
              <div class="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                <ShieldCheck class="w-3 h-3 text-blue-400" />
                <span>{{ accountType }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. UI SETTINGS GROUP -->
        <div class="space-y-6">
          <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest px-2">Интерфейс</h3>

          <!-- Mode Switcher (Segmented Control Style) -->
          <div class="bg-[#0c0c0e] p-1.5 rounded-2xl border border-white/5 flex relative">
            <!-- Active Background -->
            <div
              class="absolute top-1.5 bottom-1.5 rounded-xl bg-[#2c2c2e] shadow-sm transition-all duration-300 ease-out"
              :class="isComfortMode ? 'left-1.5 w-[calc(50%-6px)]' : 'left-[50%] w-[calc(50%-6px)]'"
            ></div>

            <button
              @click="isComfortMode !== true && $emit('toggleLayout')"
              class="relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors"
              :class="isComfortMode ? 'text-white' : 'text-gray-500 hover:text-gray-300'"
            >
              <Smartphone class="w-4 h-4" />
              <span>Фокус</span>
            </button>

            <button
              @click="isComfortMode !== false && $emit('toggleLayout')"
              class="relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors"
              :class="!isComfortMode ? 'text-white' : 'text-gray-500 hover:text-gray-300'"
            >
              <Maximize class="w-4 h-4" />
              <span>Широкий</span>
            </button>
          </div>

          <!-- Zoom Slider -->
          <div class="space-y-4 px-2">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2 text-gray-300 font-medium">
                <Monitor class="w-4 h-4 text-gray-500" />
                <span>Масштаб</span>
              </div>
              <span class="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded-md"
                >{{ uiScale }}%</span
              >
            </div>

            <input
              type="range"
              min="80"
              max="140"
              step="5"
              :value="uiScale"
              @input="$emit('update:uiScale', Number(($event.target as HTMLInputElement).value))"
              class="w-full h-1.5 bg-[#2c2c2e] rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
            />
            <div class="flex justify-between text-[10px] text-gray-600 font-medium px-1">
              <span>80%</span>
              <span>110%</span>
              <span>140%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="p-6 border-t border-white/5 bg-[#121214]/50">
        <button
          @click="onLogout"
          class="w-full flex items-center justify-between p-4 rounded-2xl bg-[#1c1c1e] text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all group active:scale-[0.98]"
        >
          <div class="flex items-center gap-3">
            <LogOut class="w-5 h-5" />
            <span class="font-medium">Выйти</span>
          </div>
          <ChevronRight class="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
        </button>

        <div class="text-center mt-6 text-xs text-gray-600 font-mono tracking-wide">
          Fleeets v{{ appVersion }} • Early Access
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Стильный скроллбар */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #2c2c2e;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #3a3a3c;
}

/* Плавность слайдера */
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  margin-top: -7px; /* Центрирование thumb относительно трека */
}
input[type='range']::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 999px;
}
</style>
