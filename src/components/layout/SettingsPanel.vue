<script setup lang="ts">
import { Monitor, Maximize2, Minimize2, LogOut, X } from 'lucide-vue-next'
import { useAuth } from '../../composables/useAuth'

defineProps<{
  appVersion: string
  isComfortMode: boolean
  uiScale: number
}>()

const emit = defineEmits(['update:uiScale', 'toggleLayout', 'close'])
const { logout } = useAuth()

const onLogout = async () => {
  await logout()
  emit('close')
}
</script>

<template>
  <!-- 
    Mobile: Fixed at bottom, inset-x-4 (отступы слева/справа), bottom-16 (над футером/клавиатурой)
    Desktop: Absolute, bottom-14, right-6, w-72
  -->
  <div
    class="fixed left-4 right-4 bottom-14 z-50 bg-[#18181b] border border-[#333] rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/5 md:absolute md:left-auto md:right-6 md:bottom-14 md:w-72"
  >
    <div class="px-4 py-3 border-b border-[#333] flex justify-between items-center bg-[#202023]">
      <span class="font-bold text-xs tracking-widest text-[#a1a1aa]">НАСТРОЙКИ</span>

      <!-- Кнопка закрытия (только для удобства на мобилке, можно и скрыть на десктопе) -->
      <div class="flex items-center gap-3">
        <span class="font-mono text-xs text-[#52525b]">v{{ appVersion }}</span>
        <button
          @click="$emit('close')"
          class="md:hidden text-[#71717a] hover:text-white"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="p-4 flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <div class="flex justify-between text-xs">
          <span class="flex items-center gap-2 text-[#d4d4d8]"
            ><Monitor class="w-3.5 h-3.5" />Масштаб интерфейса</span
          >
          <span class="text-white font-mono">{{ uiScale }}%</span>
        </div>
        <!-- Увеличенный тач-таргет для ползунка -->
        <div class="h-6 flex items-center">
          <input
            type="range"
            min="80"
            max="160"
            step="5"
            :value="uiScale"
            @input="$emit('update:uiScale', Number(($event.target as HTMLInputElement).value))"
            class="w-full h-1 bg-[#3f3f46] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg"
          />
        </div>
      </div>

      <button
        @click="$emit('toggleLayout')"
        class="flex items-center justify-between p-3 bg-[#27272a] rounded-xl border border-[#3f3f46] hover:bg-[#3f3f46] transition-all duration-75 group active:scale-[0.98]"
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
        @click="onLogout"
        class="flex items-center justify-center gap-2 w-full p-3 text-red-400 hover:text-white hover:bg-red-600 rounded-xl transition-all duration-100 text-xs font-medium border border-red-900/20 active:scale-[0.98]"
      >
        <LogOut class="w-3.5 h-3.5" />
        Выйти из аккаунта
      </button>
    </div>
  </div>
</template>
