<script setup lang="ts">
import { Cloud, CloudOff, RefreshCw, Settings } from 'lucide-vue-next'
import { useNotesStore } from '../../stores/notes'

defineProps<{
  isOffline: boolean
  settingsOpen: boolean
}>()

defineEmits(['toggleSettings'])
const notesStore = useNotesStore()
</script>

<template>
  <footer
    class="h-10 border-t border-[#27272a] flex items-center justify-between px-2 text-xs text-[#71717a] select-none shrink-0 z-40 rounded-b-3xl bg-[#0c0c0e]"
  >
    <div class="flex items-center gap-3 ml-2">
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
        <Cloud class="w-4 h-4" /><span class="font-semibold tracking-wide">СИНХРОНИЗИРОВАНО</span>
      </div>
    </div>
    <button
      @click="$emit('toggleSettings')"
      class="flex items-center justify-center w-8 h-8 rounded-full hover:text-white transition-all duration-200 hover:bg-[#27272a] active:scale-90"
      :class="{ 'text-white bg-[#27272a]': settingsOpen }"
    >
      <Settings class="w-4 h-4" />
    </button>
  </footer>
</template>
