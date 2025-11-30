<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Zap } from 'lucide-vue-next'
import NoteItem from '../NoteItem.vue'
import { useNotesStore } from '../../stores/notes'

const props = defineProps<{
  isComfortMode: boolean
}>()

const notesStore = useNotesStore()
const scrollContainer = ref<HTMLDivElement | null>(null)

const scrollToBottom = async () => {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

defineExpose({ scrollToBottom })
</script>

<template>
  <div
    ref="scrollContainer"
    class="flex-1 overflow-y-auto scroll-smooth pt-6"
    :class="props.isComfortMode ? 'px-4 md:px-[15%] lg:px-[25%]' : 'px-0'"
  >
    <div class="flex flex-col justify-end min-h-full pb-0">
      <div
        v-if="notesStore.notes.length === 0"
        class="text-center text-[#52525b] select-none flex flex-col items-center gap-4 opacity-70 py-20 my-auto animate-enter-up"
      >
        <Zap class="w-12 h-12 stroke-[1.2] text-yellow-500" />
        <span class="text-sm font-medium tracking-wide">Добавьте свой первый флит</span>
      </div>

      <NoteItem
        v-for="note in notesStore.notes"
        :key="note.id"
        :note="note"
        :full-width="!props.isComfortMode"
        @update="notesStore.updateNote"
        @delete="(id) => notesStore.deleteNote(id)"
      />
    </div>
  </div>
</template>
