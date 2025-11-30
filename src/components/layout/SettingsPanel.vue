<script setup lang="ts">
import { Monitor, Maximize2, LogOut, X, Smartphone, LayoutTemplate } from 'lucide-vue-next'
import { useAuth } from '../../composables/useAuth'

const props = defineProps<{
  appVersion: string
  isComfortMode: boolean
  uiScale: number
}>()

const emit = defineEmits(['update:uiScale', 'toggleLayout', 'close', 'onLogout'])
const { logout } = useAuth()

const onLogout = async () => {
  await logout()
  emit('close')
}

// Хелпер для сегментированного контрола
const setMode = (wantComfort: boolean) => {
  if (props.isComfortMode !== wantComfort) {
    emit('toggleLayout')
  }
}
</script>

<template>
  <!-- 
    КОНТЕЙНЕР
    Mobile: Фиксирован снизу, на всю ширину, скругление только сверху.
    Desktop: Абсолют справа-снизу, отступ от краев, полное скругление.
  -->
  <div
    class="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-[#121214] backdrop-blur-0 border-t border-[#333] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:absolute md:bottom-2 md:right-2 md:left-auto md:w-80 md:rounded-2xl md:border md:border-[#333] md:shadow-2xl"
  >
    <!-- Drag Handle (Только для мобилок) -->
    <div class="md:hidden w-full flex justify-center pt-3 pb-1">
      <div class="w-12 h-1 bg-[#3f3f46] rounded-full"></div>
    </div>

    <!-- ЗАГОЛОВОК -->
    <div class="px-5 py-4 flex justify-between items-center border-b border-white/5">
      <div class="flex flex-col">
        <span class="text-sm font-bold tracking-[0.2em] text-[#71717a] uppercase">Настройки</span>
        <span class="text-xs text-[#52525b] font-mono mt-0.5">Build v{{ appVersion }}</span>
      </div>

      <button
        @click="$emit('close')"
        class="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-[#a1a1aa] hover:bg-white/10 hover:text-white transition-colors"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <div class="p-5 flex flex-col gap-6">
      <!-- 1. МАСШТАБ (Слайдер) -->
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
          <!-- Кастомный трек слайдера -->
          <input
            type="range"
            min="80"
            max="160"
            step="5"
            :value="uiScale"
            @input="$emit('update:uiScale', Number(($event.target as HTMLInputElement).value))"
            class="w-full appearance-none bg-transparent cursor-pointer z-10 [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-[#27272a] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.3)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110"
          />
          <!-- Прогресс-бар (визуальный трюк, закрашивает левую часть) -->
          <!-- Сложно сделать на чистом CSS для range, поэтому оставляем минималистичный серый трек, это выглядит строго -->
        </div>
      </div>

      <!-- 2. РЕЖИМ ОТОБРАЖЕНИЯ (Segmented Control) -->
      <div class="flex flex-col gap-3">
        <span class="flex items-center gap-2 text-sm font-medium text-[#e4e4e7]">
          <LayoutTemplate class="w-4 h-4 text-[#a1a1aa]" />
          Вид
        </span>

        <div class="flex p-1 bg-[#0c0c0e] rounded-xl border border-[#27272a]">
          <!-- Кнопка 1: Узкая -->
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

          <!-- Кнопка 2: Полная -->
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

      <!-- 3. ВЫХОД -->
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
        </button>
      </div>
    </div>
  </div>
</template>
