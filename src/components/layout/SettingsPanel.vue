<script setup lang="ts">
import { computed } from 'vue'
import { Monitor, Maximize2, LogOut, X, Smartphone, LayoutTemplate, User } from 'lucide-vue-next'
import { useAuth } from '../../composables/useAuth'

const props = defineProps<{
  appVersion: string
  isComfortMode: boolean
  uiScale: number
}>()

const emit = defineEmits(['update:uiScale', 'toggleLayout', 'close'])
const { logout, user } = useAuth()

const onLogout = async () => {
  await logout()
  emit('close')
}

const setMode = (wantComfort: boolean) => {
  if (props.isComfortMode !== wantComfort) emit('toggleLayout')
}

// 1. АВАТАРКА
// Google сам кладет аватарку в avatar_url, Telegram (наш бот) тоже туда кладет.
const avatarUrl = computed(() => user.value?.user_metadata?.avatar_url)

// 2. ОТОБРАЖАЕМОЕ ИМЯ
const displayName = computed(() => {
  const meta = user.value?.user_metadata
  if (!meta) return user.value?.email || 'Пользователь'

  // Приоритет: Username -> Имя -> Email
  if (meta.username) return `@${meta.username}`
  if (meta.first_name) return meta.first_name
  if (meta.full_name) return meta.full_name
  return user.value?.email?.split('@')[0]
})

// 3. ТИП АККАУНТА (ДИНАМИЧЕСКИЙ)
const accountType = computed(() => {
  const meta = user.value?.user_metadata
  const appMeta = user.value?.app_metadata

  // Если есть telegram_id в метаданных — значит это наш кастомный Telegram вход
  if (meta?.telegram_id) return 'Telegram Account'

  // Если провайдер Google
  if (appMeta?.provider === 'google') return 'Google Account'

  // Иначе это просто почта
  return 'Email Account'
})
</script>

<template>
  <div
    class="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-[#121214] backdrop-blur-0 border-t border-[#333] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:absolute md:bottom-2 md:right-2 md:left-auto md:w-80 md:rounded-2xl md:border md:border-[#333] md:shadow-2xl"
  >
    <!-- Drag Handle (Mobile) -->
    <div class="md:hidden w-full flex justify-center pt-3 pb-1">
      <div class="w-12 h-1 bg-[#3f3f46] rounded-full"></div>
    </div>

    <!-- HEADER -->
    <div class="px-5 py-4 flex justify-between items-center border-b border-white/5">
      <span class="text-sm font-bold tracking-[0.2em] text-[#71717a] uppercase">Настройки</span>
      <button
        @click="$emit('close')"
        class="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-[#a1a1aa] hover:bg-white/10 hover:text-white transition-colors"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <div class="p-5 flex flex-col gap-6">
      <!-- ПРОФИЛЬ -->
      <div class="flex items-center gap-4 pb-4 border-b border-white/5">
        <!-- Аватарка -->
        <div class="relative shrink-0">
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            class="w-12 h-12 rounded-full object-cover bg-white/5 border border-white/10"
          />
          <div
            v-else
            class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-blue-400"
          >
            <User class="w-6 h-6" />
          </div>
          <!-- Индикатор -->
          <div
            class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#121214] rounded-full"
          ></div>
        </div>

        <!-- Инфо -->
        <div class="flex flex-col overflow-hidden">
          <span class="text-white font-medium truncate text-[15px]">{{ displayName }}</span>
          <!-- ВОТ ТУТ ТЕПЕРЬ ДИНАМИКА -->
          <span class="text-xs text-[#52525b]">{{ accountType }}</span>
        </div>
      </div>

      <!-- МАСШТАБ -->
      <div class="flex flex-col gap-3">
        <div class="flex justify-between items-end">
          <span class="flex items-center gap-2 text-sm font-medium text-[#e4e4e7]">
            <Monitor class="w-4 h-4 text-[#a1a1aa]" />
            Масштаб
          </span>
          <span
            class="text-xs font-mono text-[#fbbf24] bg-[#fbbf24]/10 px-1.5 py-0.5 rounded border border-[#fbbf24]/20"
          >
            {{ uiScale }}%
          </span>
        </div>
        <div class="h-6 flex items-center relative group">
          <input
            type="range"
            min="80"
            max="160"
            step="5"
            :value="uiScale"
            @input="$emit('update:uiScale', Number(($event.target as HTMLInputElement).value))"
            class="w-full appearance-none bg-transparent cursor-pointer z-10 [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-[#27272a] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.3)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110"
          />
        </div>
      </div>

      <!-- РЕЖИМ -->
      <div class="flex flex-col gap-3">
        <span class="flex items-center gap-2 text-sm font-medium text-[#e4e4e7]">
          <LayoutTemplate class="w-4 h-4 text-[#a1a1aa]" />
          Вид
        </span>
        <div class="flex p-1 bg-[#0c0c0e] rounded-xl border border-[#27272a]">
          <button
            @click="setMode(true)"
            class="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all duration-250"
            :class="
              isComfortMode
                ? 'bg-[#27272a] text-white shadow-sm'
                : 'text-[#71717a] hover:text-[#a1a1aa]'
            "
          >
            <Smartphone class="w-3.5 h-3.5" />
            <span>Фокус</span>
          </button>
          <button
            @click="setMode(false)"
            class="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all duration-250"
            :class="
              !isComfortMode
                ? 'bg-[#27272a] text-white shadow-sm'
                : 'text-[#71717a] hover:text-[#a1a1aa]'
            "
          >
            <Maximize2 class="w-3.5 h-3.5" />
            <span>На весь экран</span>
          </button>
        </div>
      </div>

      <!-- ФУТЕР -->
      <div class="pt-2 mt-2 border-t border-white/5">
        <button
          @click="onLogout"
          class="w-full group flex items-center justify-between p-3 rounded-xl hover:bg-red-500/10 transition-colors duration-250"
        >
          <div
            class="flex items-center gap-3 text-[#71717a] group-hover:text-red-400 transition-colors"
          >
            <LogOut class="w-4 h-4" />
            <span class="text-xs font-medium">Выйти из аккаунта</span>
          </div>
          <span class="text-[10px] text-[#3f3f46] font-mono">v{{ appVersion }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
